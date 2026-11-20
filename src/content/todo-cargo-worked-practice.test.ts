import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { lessons } from "./course";

const cases = [
  ["todo-command-parser", "parser-run", "parser-add-gate"],
  ["todo-state-invariants", "state-run", "state-list-gate"],
  ["todo-session-project", "session-run", "session-blank"],
  ["module-visibility", "visibility-run", "visibility-modify"],
  ["imports-and-reexports", "imports-run", "imports-modify"],
  ["cargo-package-integration", "cargo-run", "cargo-modify"],
];

it.each(cases)(
  "%s distinguishes the worked example from independent practice",
  (lessonId, exampleId, taskId) => {
    const lesson = lessons.find((entry) => entry.id === lessonId)!;
    const example = lesson.steps.find((step) => step.id === exampleId)!;
    const task = lesson.steps.find((step) => step.id === taskId)!;
    if (!example.code || !task.solution || task.evaluator?.kind !== "tests")
      throw new Error("Expected authored Rust example and executable transfer");
    const tests = task.evaluator.tests;
    const dir = mkdtempSync(join(tmpdir(), "worked-practice-"));
    try {
      function passes(source: string) {
        const path = join(dir, "practice.rs");
        const bin = join(dir, "practice");
        writeFileSync(path, appendHiddenTests(source, tests));
        const compile = spawnSync(
          "rustc",
          ["--edition=2024", "--test", path, "-o", bin],
          { encoding: "utf8", timeout: 60_000 },
        );
        expect(compile.error).toBeUndefined();
        if (compile.status !== 0) {
          // A worked example in another domain does not provide the required API.
          expect(compile.stderr).toMatch(/error\[E(?:0425|043[23])\]/);
          return false;
        }
        const run = spawnSync(bin, [], { encoding: "utf8", timeout: 10_000 });
        expect(run.error).toBeUndefined();
        expect([0, 101]).toContain(run.status);
        return run.status === 0;
      }
      expect(passes(task.solution)).toBe(true);
      expect(passes(example.code)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
  60_000,
);
