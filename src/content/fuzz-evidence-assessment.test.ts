import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { lessons, reviewExercises } from "./course";
import { fuzzEvidenceAssessmentFixtures, fuzzEvidenceRetrievalFixtures, decodeCase, compareOutputs, chooseWitness, classifyReport } from "./fuzz-evidence-assessment-fixtures";
import { fuzzEvidenceLessons } from "./fuzz-evidence";

const compileAndRun = (id: string, source: string, tests: string, expected: boolean) => {
  const directory = mkdtempSync(join(tmpdir(), "fuzz-evidence-assessment-"));
  try {
    const file = join(directory, `${id}.rs`);
    const binary = join(directory, id);
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], { cwd: directory, encoding: "utf8", timeout: 60_000 });
    expect(compiled.error, `${id}: compiler`).toBeUndefined();
    expect(compiled.status, `${id}: ${compiled.stderr}`).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], { cwd: directory, encoding: "utf8", timeout: 8_000 });
    expect(executed.error, `${id}: runner`).toBeUndefined();
    expect(executed.status === 0, `${id}: ${executed.stdout}${executed.stderr}`).toBe(expected);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const codeOf = (reference: string) => reference.slice(0, reference.indexOf("\n#[test]"));

it("publishes the learner-facing Rust signatures without hiding the contract", () => {
  const gates = fuzzEvidenceLessons.flatMap((lesson) => lesson.steps.filter((step) => step.evidenceGate));
  const input = gates.find((step) => step.id === "fuzz-input-domain-gate");
  const oracle = gates.find((step) => step.id === "fuzz-oracle-sensitivity-gate");
  const oracleBlank = gates.find((step) => step.id === "fuzz-oracle-sensitivity-blank");
  const reducer = gates.find((step) => step.id === "fuzz-counterexample-regression-gate");
  const campaign = gates.find((step) => step.id === "fuzz-campaign-evidence-gate");
  expect(input?.code).toContain("struct Case<'a>");
  expect(input?.code).toContain("fn decode_case(bytes: &[u8]) -> Option<Case<'_>>");
  expect(oracle?.code).toContain("fn same_result(");
  expect(oracleBlank?.solution).toContain("fn decode_frame(bytes: &[u8]) -> Option<Frame<'_>>");
  expect(oracleBlank?.solution).toContain("bytes.len() > 64");
  expect(reducer?.code).toContain("struct Observation");
  expect(reducer?.code).toContain("fn executable_regression(bytes: &[u8]) -> bool");
  expect(reducer?.code).toContain("fn choose_witness(original: &[u8], candidates: &[Observation])");
  expect(campaign?.code).toContain("struct Dossier");
  expect(campaign?.code).toContain("fn classify_report(dossier: &Dossier, _: &str, _: &str, _: &str)");
  expect(oracleBlank?.evaluator?.kind).toBe("tests");
  expect(oracleBlank?.evaluator?.kind === "tests" ? oracleBlank.evaluator.tests : "").toContain("decode_frame");
});

it("keeps the raw-byte decoder boundary and lossy-query semantics", () => {
  const parsed = decodeCase(new Uint8Array([0, 0, 1, 120, 0xff]));
  expect(parsed?.query).toBe("x");
  expect([...((parsed?.body ?? new Uint8Array()))]).toEqual([0xff]);
  expect(decodeCase(new Uint8Array([0, 0]))).toBeUndefined();
  expect(decodeCase(new Uint8Array(4097))).toBeUndefined();
});

it("compiles and runs every correct gate, blank and retrieval reference, then rejects its semantic mutant", () => {
  const steps = fuzzEvidenceLessons.flatMap((lesson) => lesson.steps.filter((step) => step.evidenceGate));
  const retrievals = fuzzEvidenceLessons.map((lesson) => reviewExercises[lesson.conceptIds[0]]);
  expect(steps).toHaveLength(8);
  expect(retrievals).toHaveLength(4);
  for (const step of [...steps, ...retrievals]) {
    expect(step.evaluator?.kind, step.id).toBe("tests");
    if (step.evaluator?.kind !== "tests" || !step.solution) continue;
    compileAndRun(step.id, step.solution, step.evaluator.tests, true);
  }
  for (const [id, fixture] of Object.entries(fuzzEvidenceAssessmentFixtures)) {
    const lessonStep = [...lessons.flatMap((lesson) => lesson.steps), ...retrievals].find((step) => step.id === id);
    expect(lessonStep?.evaluator?.kind, id).toBe("tests");
    if (!lessonStep || lessonStep.evaluator?.kind !== "tests") continue;
    compileAndRun(`${id}-mutant`, codeOf(fixture.mutant), lessonStep.evaluator.tests, false);
    for (const [index, mutant] of ("mutants" in fixture ? fixture.mutants : []).entries())
      compileAndRun(`${id}-mutant-${index}`, codeOf(mutant), lessonStep.evaluator.tests, false);
  }
  for (const [id, fixture] of Object.entries(fuzzEvidenceRetrievalFixtures)) {
    const retrieval = retrievals.find((step) => step.id === `${id}-review`);
    expect(retrieval?.evaluator?.kind, `${id}-retrieval`).toBe("tests");
    if (!retrieval || retrieval.evaluator?.kind !== "tests") continue;
    for (const [index, mutant] of fixture.mutants.entries())
      compileAndRun(`${id}-retrieval-mutant-${index}`, codeOf(mutant), retrieval.evaluator.tests, false);
  }
}, 45_000);

it("compares complete output, retains typed findings and classifies dossiers", () => {
  const rows = [{ lineNumber: 1, text: "ax", matched: true }, { lineNumber: 1, text: "ax", matched: true }];
  expect(compareOutputs(rows, rows)).toBe(true);
  expect(compareOutputs(rows, rows.slice(0, 1))).toBe(false);
  const original = new Uint8Array([1, 2, 3, 4]);
  const candidate = new Uint8Array([1, 2, 3]);
  expect(chooseWitness(original, [candidate], [{ bytes: candidate, failure: "SelectionMismatch" }])).toEqual(candidate);
  expect(chooseWitness(original, [candidate], [{ bytes: candidate, failure: "Timeout" }])).toEqual(original);
  expect(classifyReport({ schemaVersion: 1, runId: "r", archiveSha256: "a", manifestSha256: "m", instrumentation: true, normalCompletion: true, observedRuns: 1000, status: "passed", phase: "campaign" })).toBe("passed");
  expect(classifyReport({ schemaVersion: 1, runId: "r", archiveSha256: "a", manifestSha256: "m", instrumentation: true, normalCompletion: true, observedRuns: 1000, status: "passed", phase: "replay", replayOnly: true })).toBe("failed");
  expect(classifyReport({ schemaVersion: 1, runId: "r", archiveSha256: "a", manifestSha256: "m", instrumentation: false, normalCompletion: true, observedRuns: 1000, status: "passed", phase: "campaign" })).toBe("infrastructure");
});
