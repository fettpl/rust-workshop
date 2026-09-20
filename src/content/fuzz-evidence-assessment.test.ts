import { expect, it } from "vitest";
import {
  chooseWitness,
  classifyReport,
  compareOutputs,
  decodeCase,
  fuzzEvidenceAssessmentFixtures,
} from "./fuzz-evidence-assessment-fixtures";

it("keeps raw body bytes and rejects short framing", () => {
  const parsed = decodeCase(new Uint8Array([0, 0, 1, 120, 0xff]));
  expect(parsed?.query).toBe("x");
  expect([...((parsed?.body ?? new Uint8Array()))]).toEqual([0xff]);
  expect(decodeCase(new Uint8Array())).toBeUndefined();
  expect(decodeCase(new Uint8Array([0, 0]))).toBeUndefined();
});

it("compares complete ordered output and retains duplicate rows", () => {
  const output = [
    { lineNumber: 1, text: "ax", matched: true },
    { lineNumber: 2, text: "ax", matched: true },
  ];
  expect(compareOutputs(output, output)).toBe(true);
  expect(compareOutputs(output, [...output].reverse())).toBe(false);
  expect(compareOutputs(output, output.slice(0, 1))).toBe(false);
});

it("chooses only a strict witness with the named failure class", () => {
  const original = new Uint8Array([1, 2, 3, 4]);
  const candidate = new Uint8Array([1, 2, 3]);
  expect(chooseWitness(original, [candidate], [{ bytes: candidate, failure: "SelectionMismatch" }])).toEqual(candidate);
  expect(chooseWitness(original, [candidate], [{ bytes: candidate, failure: "Timeout" }])).toEqual(original);
});

it("classifies campaign, replay-only and missing instrumentation distinctly", () => {
  expect(classifyReport({ schemaVersion: 1, runId: "r", archiveSha256: "a", manifestSha256: "m", instrumentation: true, normalCompletion: true, observedRuns: 1000, status: "passed", phase: "campaign" })).toBe("passed");
  expect(classifyReport({ schemaVersion: 1, runId: "r", archiveSha256: "a", manifestSha256: "m", instrumentation: true, normalCompletion: true, observedRuns: 1000, status: "passed", phase: "replay", replayOnly: true })).toBe("failed");
  expect(classifyReport({ schemaVersion: 1, runId: "r", archiveSha256: "a", manifestSha256: "m", instrumentation: false, normalCompletion: true, observedRuns: 1000, status: "passed", phase: "campaign" })).toBe("infrastructure");
});

it("publishes semantic mistakes in each independent fixture", () => {
  expect(Object.keys(fuzzEvidenceAssessmentFixtures)).toHaveLength(4);
  expect(fuzzEvidenceAssessmentFixtures["fuzz-input-domain-gate"].mistakes).toEqual(expect.arrayContaining(["unwrap()"]));
  expect(fuzzEvidenceAssessmentFixtures["fuzz-oracle-sensitivity-gate"].mistakes).toEqual(expect.arrayContaining(["actual.len() == expected.len()"]));
  expect(fuzzEvidenceAssessmentFixtures["fuzz-counterexample-regression-gate"].mistakes).toEqual(expect.arrayContaining(["Timeout"]));
  expect(fuzzEvidenceAssessmentFixtures["fuzz-campaign-evidence-gate"].mistakes).toEqual(expect.arrayContaining(["replay_only"]));
});
