import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyMonacoDistribution,
  upstreamNoticeFiles,
} from "./setup-assets-lib.mjs";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Monaco distribution assets", () => {
  it("copies the upstream license and third-party notice files with the runtime", async () => {
    const root = await mkdtemp(join(tmpdir(), "rust-workshop-monaco-assets-"));
    roots.push(root);
    const sourceRoot = join(root, "source");
    const destinationRoot = join(root, "public", "monaco");
    await mkdir(join(sourceRoot, "min", "vs"), { recursive: true });
    await cp(
      "node_modules/monaco-editor/package.json",
      join(sourceRoot, "package.json"),
    );
    await cp(
      "node_modules/monaco-editor/min/vs/editor-BdtEMBbM.js",
      join(sourceRoot, "min/vs/editor-BdtEMBbM.js"),
    );
    await writeFile(join(sourceRoot, "min", "vs", "loader.js"), "loader\n");
    for (const file of upstreamNoticeFiles)
      await writeFile(join(sourceRoot, file), `${file}\n`);

    await copyMonacoDistribution({ sourceRoot, destinationRoot });
    for (const file of upstreamNoticeFiles) {
      expect(await readFile(join(destinationRoot, file), "utf8")).toBe(
        await readFile(join(sourceRoot, file), "utf8"),
      );
    }
    expect(
      await readFile(join(destinationRoot, "vs", "loader.js"), "utf8"),
    ).toBe(await readFile(join(sourceRoot, "min", "vs", "loader.js"), "utf8"));
  });

  it("fails when an upstream notice source is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "rust-workshop-monaco-assets-"));
    roots.push(root);
    const sourceRoot = join(root, "source");
    const destinationRoot = join(root, "public", "monaco");
    await mkdir(join(sourceRoot, "min", "vs"), { recursive: true });
    await cp(
      "node_modules/monaco-editor/package.json",
      join(sourceRoot, "package.json"),
    );
    await cp(
      "node_modules/monaco-editor/min/vs/editor-BdtEMBbM.js",
      join(sourceRoot, "min/vs/editor-BdtEMBbM.js"),
    );
    await writeFile(join(sourceRoot, "min", "vs", "loader.js"), "loader\n");
    await writeFile(join(sourceRoot, "LICENSE"), "LICENSE\n");
    await mkdir(join(destinationRoot, "vs"), { recursive: true });
    await writeFile(join(destinationRoot, "vs", "old.js"), "old\n");

    await expect(
      copyMonacoDistribution({ sourceRoot, destinationRoot }),
    ).rejects.toThrow(/ThirdPartyNotices\.txt/);
    expect(await readFile(join(destinationRoot, "vs", "old.js"), "utf8")).toBe(
      "old\n",
    );
  });

  it("removes destination-only runtime files during a successful replacement", async () => {
    const root = await mkdtemp(join(tmpdir(), "rust-workshop-monaco-assets-"));
    roots.push(root);
    const sourceRoot = join(root, "source");
    const destinationRoot = join(root, "public", "monaco");
    await mkdir(join(sourceRoot, "min", "vs"), { recursive: true });
    await cp(
      "node_modules/monaco-editor/package.json",
      join(sourceRoot, "package.json"),
    );
    await cp(
      "node_modules/monaco-editor/min/vs/editor-BdtEMBbM.js",
      join(sourceRoot, "min/vs/editor-BdtEMBbM.js"),
    );
    await writeFile(join(sourceRoot, "min", "vs", "new.js"), "new\n");
    for (const file of upstreamNoticeFiles)
      await writeFile(join(sourceRoot, file), `${file}\n`);
    await mkdir(join(destinationRoot, "vs"), { recursive: true });
    await writeFile(join(destinationRoot, "vs", "old.js"), "old\n");

    await copyMonacoDistribution({ sourceRoot, destinationRoot });
    expect(await readFile(join(destinationRoot, "vs", "new.js"), "utf8")).toBe(
      "new\n",
    );
    await expect(
      readFile(join(destinationRoot, "vs", "old.js")),
    ).rejects.toThrow(/ENOENT/);
  });
});

describe("served sanitizer security boundary", () => {
  it("replaces the real embedded factory before serving Monaco", async () => {
    const root = await mkdtemp(join(tmpdir(), "rust-workshop-real-monaco-"));
    roots.push(root);
    await copyMonacoDistribution({
      sourceRoot: join(process.cwd(), "node_modules/monaco-editor"),
      destinationRoot: join(root, "monaco"),
    });
    const chunk = await readFile(
      join(root, "monaco/vs/editor-BdtEMBbM.js"),
      "utf8",
    );
    expect(chunk).not.toContain("function GR(");
    expect(
      await readFile(join(root, "monaco/vs/dompurify-fixed.js"), "utf8"),
    ).toContain("DOMPurify 3.4.17");
  });
});

describe("Monaco asset cleanup failures", () => {
  async function failureScenario({
    validationFailure = false,
    promotionFailure = false,
    restoreFailure = false,
    stagingCleanupFailure = true,
    backupCleanupFailure = false,
  } = {}) {
    const errors = Object.fromEntries(
      [
        "validation",
        "promotion",
        "restore",
        "stagingCleanup",
        "backupCleanup",
      ].map((name) => [name, new Error(`${name} failed`)]),
    );
    const locations = new Map<string, string>([
      ["/owned/monaco", "complete previous output"],
    ]);
    const removed: { path: string; force: boolean }[] = [];
    const rename = async (from: string, to: string) => {
      if (from.includes("-backup-") && restoreFailure) throw errors.restore;
      locations.set(to, locations.get(from)!);
      locations.delete(from);
    };
    vi.resetModules();
    vi.doMock("node:fs/promises", () => ({
      cp: async () => {},
      mkdir: async () => {},
      stat: async () => ({}),
      mkdtemp: async (prefix: string) => {
        const path = `${prefix}test`;
        locations.set(path, "prepared staging");
        return path;
      },
      rename,
      rm: async (path: string, options: { force?: boolean }) => {
        removed.push({ path, force: !!options.force });
        if (
          options.force &&
          path.includes("-staging-") &&
          stagingCleanupFailure
        )
          throw errors.stagingCleanup;
        if (options.force && path.includes("-backup-") && backupCleanupFailure)
          throw errors.backupCleanup;
        locations.delete(path);
      },
    }));
    vi.doMock("./monaco-sanitizer.mjs", () => ({
      guardAppImports: async () => {},
      adaptMonaco: async () => {
        if (validationFailure) throw errors.validation;
      },
    }));
    let caught: unknown;
    try {
      const isolated = await import("./setup-assets-lib.mjs");
      await isolated.copyMonacoDistribution({
        sourceRoot: "source",
        destinationRoot: "/owned/monaco",
        promote: async (from, to) => {
          if (promotionFailure) throw errors.promotion;
          await rename(from, to);
        },
      });
    } catch (error) {
      caught = error;
    } finally {
      vi.doUnmock("node:fs/promises");
      vi.doUnmock("./monaco-sanitizer.mjs");
      vi.resetModules();
    }
    return { caught, errors, locations, removed };
  }

  it("preserves promotion and restore causes and reports the retained backup when cleanup fails", async () => {
    const { caught, errors, locations, removed } = await failureScenario({
      promotionFailure: true,
      restoreFailure: true,
    });
    expect(caught).toBeInstanceOf(AggregateError);
    const aggregate = caught as AggregateError;
    expect(aggregate.message).toContain("/owned/.monaco-backup-test");
    expect(aggregate.errors[0]).toBeInstanceOf(AggregateError);
    expect(aggregate.errors[0].errors).toEqual([
      errors.promotion,
      errors.restore,
    ]);
    expect(aggregate.errors[1]).toBe(errors.stagingCleanup);
    expect(aggregate.cause).toBe(aggregate.errors[0]);
    expect(locations.get("/owned/.monaco-backup-test")).toBe(
      "complete previous output",
    );
    expect(
      removed.some(({ path, force }) => force && path.includes("-backup-")),
    ).toBe(false);
  });

  it("preserves a validation failure when staging cleanup also fails", async () => {
    const { caught, errors, locations } = await failureScenario({
      validationFailure: true,
    });
    expect(caught).toBeInstanceOf(AggregateError);
    const aggregate = caught as AggregateError;
    expect(aggregate.errors).toEqual([
      errors.validation,
      errors.stagingCleanup,
    ]);
    expect(aggregate.cause).toBe(errors.validation);
    expect(aggregate.message).toContain("validation failed");
    expect(locations.get("/owned/monaco")).toBe("complete previous output");
  });

  it("attempts independent backup cleanup after staging cleanup fails", async () => {
    const { caught, errors, removed } = await failureScenario({
      backupCleanupFailure: true,
    });
    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual([
      errors.stagingCleanup,
      errors.backupCleanup,
    ]);
    expect(
      removed.filter(({ force }) => force).map(({ path }) => path),
    ).toEqual(["/owned/.monaco-staging-test", "/owned/.monaco-backup-test"]);
  });

  it("preserves the original operation error object when cleanup succeeds", async () => {
    const { caught, errors } = await failureScenario({
      validationFailure: true,
      stagingCleanupFailure: false,
    });
    expect(caught).toBe(errors.validation);
  });
});
