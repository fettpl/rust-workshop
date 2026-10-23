import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
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
