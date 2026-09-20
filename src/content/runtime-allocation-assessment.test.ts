import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { runtimeAllocationEvidenceLessons, runtimeAllocationEvidenceReviewExercises } from "./runtime-allocation-evidence";
import { runtimeAllocationAssessmentFixtures } from "./runtime-allocation-assessment-fixtures";

const assessments = [
  ...runtimeAllocationEvidenceLessons.flatMap((lesson) => lesson.steps.filter((step) => step.evaluator?.kind === "tests")),
  ...Object.values(runtimeAllocationEvidenceReviewExercises),
];

const normalizeRust = (source: string) => source.replace(/\s+/g, "");

it("covers every allocation coding task with distinct passing equivalent and rejecting mutant", () => {
  expect(assessments).toHaveLength(8);
  expect(runtimeAllocationAssessmentFixtures.map((fixture) => fixture.id).sort()).toEqual(assessments.map((step) => step.id).sort());
  for (const fixture of runtimeAllocationAssessmentFixtures) {
    const step = assessments.find((candidate) => candidate.id === fixture.id)!;
    expect(step.solution).toBeTruthy();
    expect(normalizeRust(fixture.equivalent)).not.toBe(normalizeRust(step.solution!));
    expect(normalizeRust(fixture.mutant)).not.toBe(normalizeRust(fixture.equivalent));
    const directory = mkdtempSync(join(tmpdir(), "allocation-evidence-"));
    try {
      for (const [name, source, shouldPass] of [["equivalent", fixture.equivalent, true], ["mutant", fixture.mutant, false]] as const) {
        const file = join(directory, `${name}.rs`);
        const binary = join(directory, name);
        writeFileSync(file, appendHiddenTests(source, (step.evaluator as { kind: "tests"; tests: string }).tests));
        const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], { cwd: directory, encoding: "utf8", timeout: 60_000 });
        expect(compiled.status, `${fixture.id}/${name} compile: ${compiled.stderr}`).toBe(0);
        const executed = spawnSync(binary, ["--test-threads=1"], { cwd: directory, encoding: "utf8", timeout: 8_000 });
        const output = executed.stdout + executed.stderr;
        expect(executed.status, `${fixture.id}/${name}: ${output}`).toBe(shouldPass ? 0 : 101);
        const counts = output.match(/test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/);
        expect(counts).not.toBeNull();
        const result = evaluate(step.evaluator!, { code: source, result: { status: executed.status === 0 ? "success" : "test-failure", stdout: executed.stdout, stderr: executed.stderr, diagnostics: [], durationMs: 0, tests: { passed: Number(counts![1]), failed: Number(counts![2]) } } });
        expect(result.passed, `${fixture.id}/${name}`).toBe(shouldPass);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
}, 240_000);

it("experimentally rejects each comparison review contract mutant", () => {
  const step = runtimeAllocationEvidenceReviewExercises["runtime-allocation-comparison"];
  const mutations = [
    ["input", "if baseline.input != candidate.input", "if baseline.input == candidate.input"],
    ["summary", "if baseline.summary != candidate.summary", "if baseline.summary == candidate.summary"],
    ["candidate-completeness", "if !baseline.complete || !candidate.complete", "if !baseline.complete"],
  ] as const;
  const directory = mkdtempSync(join(tmpdir(), "allocation-comparison-mutants-"));
  try {
    for (const [label, from, to] of mutations) {
      const source = step.solution!.replace(from, to);
      const file = join(directory, `${label}.rs`);
      const binary = join(directory, label);
      writeFileSync(file, appendHiddenTests(source, (step.evaluator as { kind: "tests"; tests: string }).tests));
      const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], { cwd: directory, encoding: "utf8", timeout: 60_000 });
      expect(compiled.status, `${label} compile: ${compiled.stderr}`).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], { cwd: directory, encoding: "utf8", timeout: 30_000 });
      expect(executed.error, `${label} runner`).toBeUndefined();
      expect(executed.status, `${label}: ${executed.stdout}${executed.stderr}`).toBe(101);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
}, 120_000);

it("experimentally rejects blank window guard mutants", () => {
  const step = runtimeAllocationEvidenceLessons
    .find((lesson) => lesson.id === "runtime-allocation-scope")!
    .steps.find((candidate) => candidate.id === "allocation-scope-blank")!;
  const mutations = [
    ["result-mismatch", "if *measured == value", "if true"],
    [
      "missing-teardown",
      'if !self.events.iter().any(|event| matches!(event, Event::Closed | Event::ErrorClosed)) { return Err("teardown-before-close"); }',
      'if false { return Err("teardown-before-close"); }',
    ],
  ] as const;
  const directory = mkdtempSync(join(tmpdir(), "allocation-window-mutants-"));
  try {
    for (const [label, from, to] of mutations) {
      const source = step.solution!.replace(from, to);
      const file = join(directory, `${label}.rs`);
      const binary = join(directory, label);
      writeFileSync(file, appendHiddenTests(source, (step.evaluator as { kind: "tests"; tests: string }).tests));
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", file, "-o", binary],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.status, `${label} compile: ${compiled.stderr}`).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(executed.error, `${label} runner`).toBeUndefined();
      expect(executed.status, `${label}: ${executed.stdout}${executed.stderr}`).toBe(101);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 120_000);
