import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { describe, expect, it } from "vitest";
import * as currentCourse from "./course";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import { historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair } from "./service-authorization-compatibility-fixture";
const course = historicalBeforeDocumentationRepair(
  historicalBeforeSendHandoff(
    historicalBeforeCancellationTransfer(
      historicalBeforeInitializedPrefix(
        historicalBeforeExistingContractRepair(currentCourse),
      ),
    ),
  ),
);
import { createInitialState } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";
import { evidenceForLessonStep } from "./learning-context";

for (const [moduleId, prerequisite] of [
  ["loops-control", "rust-foundations"],
  ["generics", "todo-io"],
  ["traits", "generics"],
  ["lifetimes", "traits"],
  ["closures", "lifetimes"],
  ["iterators", "closures"],
  ["testing-quality", "iterators"],
  ["log-analyzer", "testing-quality"],
  ["boxed-values", "log-analyzer"],
  ["shared-ownership", "boxed-values"],
  ["threads", "shared-ownership"],
  ["channels", "threads"],
  ["synchronized-state", "channels"],
  ["atomic-state", "synchronized-state"],
  ["memory-ordering", "atomic-state"],
  ["async-foundations", ["shared-ownership", "closures"]],
  ["tokio-runtime-tasks", "async-foundations"],
  ["tokio-flow-control", "tokio-runtime-tasks"],
  ["tokio-io-streams", "tokio-flow-control"],
  ["tokio-blocking-work", "tokio-io-streams"],
  ["tokio-network-service", "tokio-blocking-work"],
  ["public-api-workspaces", ["testing-quality", "traits", "modules-cargo"]],
] as const) {
  describe(`${moduleId}: independent evidence`, () => {
    it("offers fresh coding tasks after a reference is exposed and preserves independent alternatives", () => {
      const stage = course.modules.find((item) => item.id === moduleId);
      expect(stage).toBeDefined();
      expect(stage!.prerequisites).toEqual(
        Array.isArray(prerequisite) ? prerequisite : [prerequisite],
      );
      let state = createInitialState();
      expect(moduleGate(state, course.lessons, stage!).passed).toBe(false);
      const submit = (lessonId: string, stepId: string, revealed: boolean) => {
        const lesson = course.lessons.find((item) => item.id === lessonId)!;
        const step = lesson.steps.find((item) => item.id === stepId)!;
        expect(step.evaluator?.kind).toBe("tests");
        state = recordEvidence(state, {
          id: `${lessonId}/${stepId}/${revealed}`,
          lessonId,
          stepId,
          ...evidenceForLessonStep(lesson, step),
          kind: step.evidenceKind,
          evaluator: "tests",
          gate: true,
          passed: true,
          hints: 0,
          revealed,
          at: state.updatedAt + 1,
        });
        if (!step.evidence) {
          expect(state.events.at(-1)!.conceptIds).toEqual(lesson.conceptIds);
          expect(state.events.at(-1)).not.toHaveProperty("evidenceVersion");
        }
      };
      for (const gate of stage!.gateCriteria!) {
        expect(gate.taskRefs.length).toBeGreaterThanOrEqual(2);
        submit(gate.taskRefs[0].lessonId, gate.taskRefs[0].stepId, true);
      }
      expect(moduleGate(state, course.lessons, stage!).passed).toBe(false);
      for (const gate of stage!.gateCriteria!)
        submit(gate.taskRefs[1].lessonId, gate.taskRefs[1].stepId, false);
      expect(moduleGate(state, course.lessons, stage!).passed).toBe(true);
    });
  });
}

// New submission metadata must never restamp saved historical-shaped success.
it("leaves untagged conversion history uncredited while a distinct current submission qualifies", () => {
  const traits = course.modules.find((item) => item.id === "traits")!;
  const criterion = traits.gateCriteria!.find(
    (item) => item.id === "traits-conversion-views-gate",
  )!;
  const stage = { ...traits, gateCriteria: [criterion] };
  const lesson = course.lessons.find(
    (item) => item.id === "conversion-ownership-views",
  )!;
  const step = lesson.steps.find(
    (item) => item.id === "conversions-samples-transfer",
  )!;
  let state = createInitialState();
  state = recordEvidence(state, {
    id: "preserved-untagged-conversion",
    lessonId: lesson.id,
    stepId: step.id,
    conceptIds: [...lesson.conceptIds],
    kind: step.evidenceKind,
    evaluator: "tests",
    gate: true,
    passed: true,
    hints: 0,
    revealed: false,
    at: 100,
  });
  const original = structuredClone(state.events[0]);
  expect(moduleGate(state, course.lessons, stage).passed).toBe(false);
  state = recordEvidence(state, {
    id: "distinct-current-conversion",
    lessonId: lesson.id,
    stepId: step.id,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: "tests",
    gate: true,
    passed: true,
    hints: 0,
    revealed: false,
    at: 101,
  });
  expect(moduleGate(state, course.lessons, stage).passed).toBe(true);
  expect(state.events[0]).toEqual(original);
  expect(state.events[0]).not.toHaveProperty("evidenceVersion");
  expect(state.events[1]).toMatchObject({
    id: "distinct-current-conversion",
    evidenceVersion: 2,
  });
});
