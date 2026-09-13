import { expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { miniGrepPackage } from "./projects/mini-grep";
import { projectFiles } from "../domain/project-package";
import { verifyMiniGrepMutants } from "../../scripts/mini-grep-mutants";

it("rejects each fixed Mini grep mutant and restores the authored reference", () => {
  const root = mkdtempSync(join(tmpdir(), "mini-grep-mutants-"));
  try {
    for (const [path, contents] of Object.entries(
      projectFiles(miniGrepPackage, "solution"),
    )) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    const originals = Object.fromEntries(
      ["search.rs", "input.rs", "paths.rs", "main.rs"].map((file) => [
        file,
        readFileSync(join(root, "src", file), "utf8"),
      ]),
    );

    expect(() => verifyMiniGrepMutants(root)).not.toThrow();
    for (const [file, original] of Object.entries(originals))
      expect(readFileSync(join(root, "src", file), "utf8")).toBe(original);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
