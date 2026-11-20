import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { lessons } from "./course";
import { appendHiddenTests } from "../runner";
import { checkManifestContract } from "../engine/manifest-contract";

// Fixed authored examples only; no learner or imported source reaches rustc.
const pairs = [
  ["foundations-assessment", "assessment-tests", "assessment-blank"],
  ["foundations-assessment", "assessment-tests", "assessment-adversarial"],
  ["functions-expressions", "function-run", "function-error"],
  ["methods-and-state", "method-run", "method-gate"],
  ["nested-patterns-and-destructuring", "nested-run", "nested-repair"],
  ["macros-exactly-once", "macros-exactly-once-run", "macros-exactly-once-gate"],
  ["macros-exactly-once", "macros-exactly-once-run", "macros-exactly-once-blank"],
  ["macros-repetition-grammar", "macros-repetition-grammar-run", "macros-repetition-grammar-gate"],
  ["macros-exported-paths-2024", "macros-exported-paths-2024-run", "macros-exported-paths-2024-gate"],
  ["iterator-contracts", "contracts-run", "contracts-blank"],
  ["gat-receiver-borrows", "receiver-run", "gat-receiver-borrows-gate"],
  ["gat-overlapping-mutable-windows", "windows-run", "gat-overlapping-mutable-windows-gate"],
  ["unsafe-ffi-checked-view", "checked-view-run", "checked-view-gate"],
  ["unsafe-ffi-checked-view", "checked-view-run", "checked-view-blank"],
] as const;

it.each(pairs)("%s: observing %s cannot solve %s by copying", (lessonId, exampleId, taskId) => {
  const lesson = lessons.find((candidate) => candidate.id === lessonId)!;
  const example = lesson.steps.find((candidate) => candidate.id === exampleId)!;
  const task = lesson.steps.find((candidate) => candidate.id === taskId)!;
  expect(task.evaluator?.kind).toBe("tests");
  if (task.evaluator?.kind !== "tests") throw new Error("Missing authored contract");
  const directory = mkdtempSync(join(tmpdir(), "worked-example-transfer-"));
  try {
    for (const [name, source] of [["canonical", task.solution!], ["observation-copy", example.code!]] as const) {
      const file = join(directory, `${name}.rs`);
      const binary = join(directory, name);
      writeFileSync(file, appendHiddenTests(source, task.evaluator.tests));
      const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], {
        cwd: directory, encoding: "utf8", timeout: 30_000,
      });
      expect(compiled.error).toBeUndefined();
      expect(compiled.signal).toBeNull();
      if (name === "canonical") expect(compiled.status, compiled.stderr).toBe(0);
      if (compiled.status !== 0) continue;
      const executed = spawnSync(binary, [], { cwd: directory, encoding: "utf8", timeout: 10_000 });
      expect(executed.error).toBeUndefined();
      expect(executed.signal).toBeNull();
      if (name === "canonical") expect(executed.status, executed.stdout + executed.stderr).toBe(0);
      else expect(executed.status, "Visible worked example still passes the independent task").not.toBe(0);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 60_000);


it("package include policy cannot be copied from the exclusion worked example", () => {
  const lesson = lessons.find((candidate) => candidate.id === "cargo-package-rehearsal")!;
  const example = lesson.steps.find((candidate) => candidate.id === "cargo-package-rehearsal-observe")!;
  const task = lesson.steps.find((candidate) => candidate.id === "cargo-package-rehearsal-blank")!;
  if (task.evaluator?.kind !== "manifest-contract") throw new Error("Missing authored manifest contract");
  expect(checkManifestContract(task.solution!, task.evaluator.contract).passed).toBe(true);
  expect(checkManifestContract(example.code!, task.evaluator.contract).passed).toBe(false);
});

it("two concrete spawned tasks do not supply the assessed generic spawn_pair", () => {
  const lesson = lessons.find((candidate) => candidate.id === "tokio-spawn-join")!;
  const example = lesson.steps.find((candidate) => candidate.id === "tokio-spawn-join-run")!;
  const task = lesson.steps.find((candidate) => candidate.id === "tokio-spawn-join-pair-gate")!;
  if (task.evaluator?.kind !== "tests") throw new Error("Missing authored Tokio contract");
  const directory = mkdtempSync(join(tmpdir(), "worked-tokio-transfer-"));
  try {
    mkdirSync(join(directory, "src"));
    // Fixed repository-owned manifest/lockfile, using the ordinary offline cache.
    for (const name of ["Cargo.toml", "Cargo.lock"]) {
      copyFileSync(join(process.cwd(), "scripts/fixtures/tokio-runtime-1.54.1", name), join(directory, name));
    }
    for (const [name, code] of [["canonical", task.solution!], ["observation-copy", example.code!]] as const) {
      writeFileSync(join(directory, "src/lib.rs"), appendHiddenTests(code, task.evaluator.tests));
      const result = spawnSync("cargo", ["test", "--offline", "--locked", "--lib"], {
        cwd: directory, encoding: "utf8", timeout: 60_000,
      });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      if (name === "canonical") expect(result.status, result.stdout + result.stderr).toBe(0);
      else {
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain("spawn_pair");
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 120_000);
