import { expect, it } from "vitest";
import { lessons } from "./course";
import {
  cancelTransferMutants,
  cancelTransferStep,
  cancelTransferModelStep,
} from "./async-lending-cancel-transfer";

it("appends model exposure and one transfer family after the five cancellation steps", () => {
  const lesson = lessons.find((item) => item.id === "async-lending-cancel-commit")!;
  expect(lesson.steps.map((step) => step.id)).toEqual([
    "async-lending-cancel-commit-predict",
    "async-lending-cancel-commit-explain",
    "async-lending-cancel-commit-gate",
    "async-lending-cancel-commit-blank",
    "async-lending-cancel-commit-recall",
    cancelTransferModelStep.id,
    cancelTransferStep.id,
  ]);
  expect(cancelTransferModelStep.evidence).toEqual({ version: 2, conceptIds: ["async-lending-cancel-commit"] });
  expect(cancelTransferStep.evidence).toEqual({ version: 2, conceptIds: ["async-lending-cancel-commit"], codingTaskId: "async-lending/cancel-lost-reply-v1" });
});

it("keeps the eight semantic mutant IDs and full qualified assertion targets stable", () => {
  expect(cancelTransferMutants.map((mutant) => mutant.id)).toEqual([
    "early-commit", "late-commit", "bypass-reply", "replay-new-receipt",
    "overwrite-conflict", "normalize-key", "one-based-receipt", "wait-on-replay",
  ]);
  expect(cancelTransferMutants.every((mutant) => mutant.testName.startsWith("__rust_workshop_hidden_tests::"))).toBe(true);
});
