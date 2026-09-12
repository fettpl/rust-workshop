import { describe, expect, it } from "vitest";
import * as course from "./course";
import { createInitialState } from "../persistence/state";
import { moduleGate, recordEvidence } from "../engine/learning";

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
  ["async-foundations", "memory-ordering"],
  ["tokio-runtime-tasks", "async-foundations"],
  ["tokio-flow-control", "tokio-runtime-tasks"],
  ["tokio-io-streams", "tokio-flow-control"],
  ["tokio-blocking-work", "tokio-io-streams"],
] as const) {
  describe(`${moduleId}: independent evidence`, () => {
    it("offers fresh coding tasks after a reference is exposed and preserves independent alternatives", () => {
      const stage = course.modules.find((item) => item.id === moduleId);
      expect(stage).toBeDefined();
      expect(stage!.prerequisites).toEqual([prerequisite]);
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
          conceptIds: lesson.conceptIds,
          kind: step.evidenceKind,
          evaluator: "tests",
          gate: true,
          passed: true,
          hints: 0,
          revealed,
          at: state.updatedAt + 1,
        });
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
