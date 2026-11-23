import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkMonacoImports,
  inspectOriginal,
  transformMonaco,
  verifyGenerated,
} from "./monaco-sanitizer.mjs";
import { copyMonacoDistribution } from "./setup-assets-lib.mjs";
const source = await readFile(
  "node_modules/monaco-editor/min/vs/editor-BdtEMBbM.js",
  "utf8",
);
const fixed = await readFile("node_modules/dompurify/dist/purify.min.js");

describe("closed Monaco adaptation", () => {
  it("rejects upstream and official artifact byte drift", () => {
    expect(() => transformMonaco(source + " ", fixed)).toThrow(
      /chunk hash drift/,
    );
    expect(() =>
      transformMonaco(source, Buffer.concat([fixed, Buffer.from(" ")])),
    ).toThrow(/artifact hash drift/);
  });
  it.each([
    ["dependency", (s: string) => s.replace('"exports"', '"other"')],
    [
      "parameters",
      (s: string) =>
        s.replace("function(require, C,l)", "function(require, C,extra,l)"),
    ],
    ["factory alias", (s: string) => s.replace("Ku=GR()", "Ku=GR(),alias=GR")],
    [
      "singleton alias",
      (s: string) => s.replace("Ku=GR()", "Ku=GR(),alias=Ku"),
    ],
    [
      "extra initializer",
      (s: string) => s.replace("Ku=GR()", "Ku=GR(),extra=GR()"),
    ],
    ["argument", (s: string) => s.replace("Ku=GR()", "Ku=GR(1)")],
    [
      "collision",
      (s: string) => s.replace("Ku=GR()", "Ku=GR(),__workshopFixedDOMPurify=1"),
    ],
    ["ambiguous factory", (s: string) => s + ";function GR(){}"],
  ])(
    "rejects structural %s drift independently of the full hash",
    (_name, mutate) => {
      const changed = mutate(source);
      expect(changed).not.toBe(source);
      expect(() => inspectOriginal(changed)).toThrow(/contract/);
    },
  );
  it("removes the old factory and deterministically wires one imported singleton", () => {
    const output = transformMonaco(source, fixed);
    expect(transformMonaco(source, fixed)).toBe(output);
    expect(() => verifyGenerated(output)).not.toThrow();
    expect(() => verifyGenerated(output + ";function GR(){} ")).toThrow(
      /old factory/,
    );
  }, 30_000);
  it("restores the previous complete destination when promotion fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "monaco-rollback-"));
    try {
      const destinationRoot = join(root, "monaco");
      await mkdir(destinationRoot);
      await writeFile(
        join(destinationRoot, "old-runtime"),
        "complete old output",
      );
      await expect(
        copyMonacoDistribution({
          sourceRoot: "node_modules/monaco-editor",
          destinationRoot,
          promote: async () => {
            throw new Error("injected promotion failure");
          },
        }),
      ).rejects.toThrow(/injected promotion/);
      expect(await readFile(join(destinationRoot, "old-runtime"), "utf8")).toBe(
        "complete old output",
      );
      expect(await readdir(root)).toEqual(["monaco"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 30_000);
});

describe("AMD-only app import policy", () => {
  it.each([
    'import Monaco from "monaco-editor";',
    'import "monaco-editor/esm/vs/editor/editor.api";',
    'import { type editor, languages } from "monaco-editor";',
    'export * from "monaco-editor";',
    'export { type editor, languages } from "monaco-editor";',
    'const x = import("monaco-editor/esm/vs/editor/editor.api");',
    "const x = require(`monaco-editor`);",
    'import m = require("monaco-editor");',
    '(require)("monaco-editor");',
    'import(("monaco-editor"));',
  ])("rejects value consumption: %s", (text) =>
    expect(() => checkMonacoImports(text)).toThrow(/runtime Monaco/),
  );
  it.each([
    'import type * as Monaco from "monaco-editor";',
    'import { type editor } from "monaco-editor";',
    'export { type editor } from "monaco-editor";',
    'export type * from "monaco-editor";',
    'type M = import("monaco-editor").editor;',
    'import type m = require("monaco-editor");',
  ])("allows genuine type use: %s", (text) =>
    expect(() => checkMonacoImports(text)).not.toThrow(),
  );
});

it.each(["chunk", "version", "artifact", "missing-notice"])(
  "retains complete previous output for staging %s failure",
  async (mode) => {
    const { cp } = await import("node:fs/promises");
    const root = await mkdtemp(join(tmpdir(), "monaco-staging-failure-"));
    try {
      const sourceRoot = join(root, "source");
      const sanitizerRoot = join(root, "sanitizer");
      const destinationRoot = join(root, "monaco");
      await mkdir(join(sourceRoot, "min/vs"), { recursive: true });
      await cp(
        "node_modules/monaco-editor/package.json",
        join(sourceRoot, "package.json"),
      );
      await cp(
        "node_modules/monaco-editor/LICENSE",
        join(sourceRoot, "LICENSE"),
      );
      if (mode !== "missing-notice")
        await cp(
          "node_modules/monaco-editor/ThirdPartyNotices.txt",
          join(sourceRoot, "ThirdPartyNotices.txt"),
        );
      await writeFile(
        join(sourceRoot, "min/vs/editor-BdtEMBbM.js"),
        mode === "chunk" ? source + " " : source,
      );
      await mkdir(join(sanitizerRoot, "dist"), { recursive: true });
      await writeFile(
        join(sanitizerRoot, "package.json"),
        JSON.stringify({ version: mode === "version" ? "3.4.15" : "3.4.18" }),
      );
      await writeFile(
        join(sanitizerRoot, "dist/purify.min.js"),
        mode === "artifact" ? Buffer.concat([fixed, Buffer.from(" ")]) : fixed,
      );
      await mkdir(destinationRoot);
      await writeFile(
        join(destinationRoot, "old-runtime"),
        "complete previous output",
      );
      await expect(
        copyMonacoDistribution({ sourceRoot, destinationRoot, sanitizerRoot }),
      ).rejects.toThrow(
        mode === "missing-notice" ? /ThirdPartyNotices/ : /contract/,
      );
      expect(await readFile(join(destinationRoot, "old-runtime"), "utf8")).toBe(
        "complete previous output",
      );
      expect(await readdir(destinationRoot)).toEqual(["old-runtime"]);
      expect(
        (await readdir(root)).filter((name) => name.startsWith(".")),
      ).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
