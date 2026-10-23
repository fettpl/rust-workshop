import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
    await writeFile(join(sourceRoot, "min", "vs", "new.js"), "new\n");
    for (const file of upstreamNoticeFiles)
      await writeFile(join(sourceRoot, file), `${file}\n`);
    await mkdir(join(destinationRoot, "vs"), { recursive: true });
    await writeFile(join(destinationRoot, "vs", "old.js"), "old\n");

    await copyMonacoDistribution({ sourceRoot, destinationRoot });
    expect(await readFile(join(destinationRoot, "vs", "new.js"), "utf8")).toBe(
      "new\n",
    );
    await expect(readFile(join(destinationRoot, "vs", "old.js"))).rejects.toThrow(
      /ENOENT/,
    );
  });
});
