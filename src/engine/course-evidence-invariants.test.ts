import { describe, expect, it } from "vitest";
import { concepts, lessons, modules } from "@/content/course";
import {
  courseEvidencePolicy,
  courseDelayedReviewEligibility,
  courseGateRecovery,
  courseModuleGate,
  courseNextGateTask,
  evidenceForLessonStep,
} from "@/content/learning-context";
import type {
  EvidenceEvent,
  ModuleGateTaskRef,
  UserState,
} from "@/domain/types";
import {
  createInitialState,
  exportState,
  importState,
} from "@/persistence/state";
import { DAY, deriveConceptMastery, recordEvidence } from "./learning";

function authored(ref: ModuleGateTaskRef) {
  const lesson = lessons.find((entry) => entry.id === ref.lessonId)!;
  return {
    lesson,
    step: lesson.steps.find((entry) => entry.id === ref.stepId)!,
  };
}

function success(ref: ModuleGateTaskRef, at = 200): EvidenceEvent {
  const { lesson, step } = authored(ref);
  return {
    id: `pass:${ref.lessonId}:${ref.stepId}:${at}`,
    ...ref,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evaluator?.kind === "rubric" ? "self-rating" : step.evidenceKind,
    evaluator: step.evaluator?.kind,
    gate: step.evidenceGate === true,
    passed: true,
    hints: 0,
    revealed: false,
    at,
  };
}

function restored(events: EvidenceEvent[]): UserState {
  return importState(exportState({ ...createInitialState(), events }));
}

const criteria = modules.flatMap((module) =>
  (module.gateCriteria ?? []).map((criterion) => ({
    module,
    criterion,
    scoped: lessons.filter((lesson) => lesson.moduleId === module.id),
  })),
);

describe("whole-course imported evidence boundaries", () => {
  for (const { module, criterion, scoped } of criteria) {
    it(`${module.id}/${criterion.id}: current, assisted, stale and chronological primary evidence`, () => {
      const primaries = criterion.taskRefs.map((ref) => success(ref));
      const supplements = (criterion.supplementaryStepRefs ?? []).map((ref) =>
        success(ref),
      );
      function check(events: EvidenceEvent[], expected: boolean) {
        const state = restored([...events, ...supplements]);
        const before = structuredClone(state);
        const gate = courseModuleGate(state, scoped, {
          ...module,
          gateCriteria: [criterion],
        });
        expect(gate.passed).toBe(expected);
        expect(
          courseGateRecovery(state, criterion, scoped).status === "complete",
        ).toBe(expected);
        if (expected)
          expect(courseNextGateTask(state, criterion, scoped)).toBeUndefined();
        expect(state).toEqual(before);
      }
      check(primaries, true);
      check([], false);
      check(
        primaries.map((event) => ({ ...event, hints: 1 })),
        false,
      );
      check(
        primaries.map((event) => ({ ...event, revealed: true })),
        false,
      );
      check(
        primaries.map((event) => ({ ...event, passed: false })),
        false,
      );
      check(
        primaries.map((event) => ({ ...event, kind: "exposure" })),
        false,
      );
      check(
        primaries.map((event) => ({ ...event, evaluator: "rubric" })),
        false,
      );
      const help = primaries.map((event) => ({
        ...event,
        id: `help:${event.id}`,
        kind: "exposure" as const,
        evaluator: undefined,
        hints: 1,
        at: 100,
      }));
      check([...primaries, ...help], false);
      check([...help, ...primaries], false);
      check(
        [...primaries, ...help.map((event) => ({ ...event, at: 200 }))],
        true,
      );
      check(
        [...help.map((event) => ({ ...event, at: 200 })), ...primaries],
        false,
      );
      check(
        [...primaries, ...help.map((event) => ({ ...event, at: 300 }))],
        true,
      );
      const attributed = primaries.every(
        (event) => authored(event).step.evidence,
      );
      if (attributed) {
        check(
          primaries.map((event) => ({ ...event, evidenceVersion: 999 })),
          false,
        );
        check(
          primaries.map((event) => ({ ...event, conceptIds: [] })),
          false,
        );
        check(
          primaries.map((event) => ({
            ...event,
            conceptIds: [...event.conceptIds, "surplus-concept"],
          })),
          false,
        );
      }
    });
  }
});

describe("supplementary evidence attribution", () => {
  for (const { module, criterion, scoped } of criteria.filter(
    ({ criterion }) => criterion.supplementaryStepRefs?.length,
  )) {
    it(`${module.id}/${criterion.id}: stale or wrong attribution cannot supply the rubric supplement`, () => {
      const primary = criterion.taskRefs.map((ref) => success(ref));
      const supplementary = criterion.supplementaryStepRefs!.map((ref) =>
        success(ref),
      );
      for (const change of [
        { evidenceVersion: 999 },
        { conceptIds: [] },
        { conceptIds: ["unrelated-concept"] },
      ]) {
        const state = restored([
          ...primary,
          ...supplementary.map((event) => ({ ...event, ...change })),
        ]);
        expect(
          courseModuleGate(state, scoped, {
            ...module,
            gateCriteria: [criterion],
          }).passed,
        ).toBe(false);
        expect(courseGateRecovery(state, criterion, scoped)).toEqual({
          status: "available",
          task: criterion.supplementaryStepRefs![0],
        });
      }
    });
  }
});

it("a source-only imported solution reveal cannot grant counted component credit", () => {
  const stage = modules.find((entry) => entry.id === "unsafe-miri-contracts")!;
  const criterion = stage.gateCriteria!.find(
    (entry) => entry.id === "unsafe-miri-mut-slot-gate",
  )!;
  const scoped = lessons.filter((lesson) => lesson.moduleId === stage.id);
  const ref = { lessonId: "unsafe-miri-mut-slot", stepId: "mut-slot-gate" };
  const source = success({ ...ref, stepId: "mut-slot-with-mut-transfer" }, 100);
  const reveal: EvidenceEvent = {
    ...source,
    id: "supplied-solution:imported-source-only",
    kind: "exposure",
    evaluator: undefined,
    revealed: true,
  };
  const target = success(ref);
  const state = restored([reveal, target]);
  expect(
    deriveConceptMastery(state, target.conceptIds[0], courseEvidencePolicy)
      .level,
  ).not.toBe("understood");
  expect(
    courseModuleGate(state, scoped, { ...stage, gateCriteria: [criterion] })
      .passed,
  ).toBe(false);
  const earlier = restored([target, { ...reveal, at: 300 }]);
  expect(
    courseModuleGate(earlier, scoped, { ...stage, gateCriteria: [criterion] })
      .passed,
  ).toBe(true);
});

it.each(["rubric", "expected-error"] as const)(
  "ordinary delayed %s observation cannot establish retention",
  (evaluator) => {
    const event = (stepId: string, at: number): EvidenceEvent => ({
      id: stepId,
      lessonId: "ordinary",
      stepId,
      at,
      conceptIds: ["ordinary"],
      kind: "transfer",
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed: false,
    });
    const state = restored([
      event("a", 100),
      event("b", 200),
      {
        ...event("recall", 200 + DAY + 1),
        kind: "recall",
        delayed: true,
        evaluator,
      },
    ]);
    expect(deriveConceptMastery(state, "ordinary").level).toBe("understood");
  },
);

it("an immediate ordinary recall with a delayed flag cannot double the review interval", () => {
  const state = createInitialState();
  state.review = [
    {
      conceptId: "ordinary",
      dueAt: 100,
      intervalDays: 4,
      attempts: 0,
      reason: "old",
    },
  ];
  const event: EvidenceEvent = {
    id: "primary",
    lessonId: "ordinary",
    stepId: "a",
    at: 100,
    conceptIds: ["ordinary"],
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
  };
  state.events = [event, { ...event, id: "b", stepId: "b", at: 200 }];
  const next = recordEvidence(state, {
    ...event,
    id: "immediate",
    stepId: "recall",
    kind: "recall",
    delayed: true,
    at: 300,
  });
  expect(next.review[0].intervalDays).toBe(4);
});

it("covers the complete authored catalog rather than a selected module subset", () => {
  expect(criteria.length).toBeGreaterThan(200);
  expect(new Set(criteria.map(({ module }) => module.id)).size).toBe(
    modules.length,
  );
  expect(
    concepts.filter((concept) => concept.evidenceCalibration).length,
  ).toBeGreaterThan(20);
});

it("same-millisecond review rating prevents ordinary delayed retention", () => {
  const event = (stepId: string, at: number): EvidenceEvent => ({
    id: stepId,
    lessonId: "ordinary",
    stepId,
    at,
    conceptIds: ["ordinary"],
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
  });
  const at = 200 + DAY + 1;
  const state = restored([
    event("a", 100),
    event("b", 200),
    {
      ...event("recall", at),
      kind: "recall",
      delayed: true,
    },
  ]);
  state.ratings = [{ conceptId: "ordinary", rating: "good", at }];
  expect(deriveConceptMastery(state, "ordinary").level).toBe("understood");
});

describe("historical supplementary completion", () => {
  for (const { module, criterion, scoped } of criteria.filter(
    ({ criterion }) => criterion.supplementaryStepRefs?.length,
  )) {
    it(`${module.id}/${criterion.id}: preserves unversioned historical reflections as completion only`, () => {
      const primary = criterion.taskRefs.map((ref) => success(ref));
      const supplementary = criterion.supplementaryStepRefs!.map((ref) => ({
        ...success(ref),
        evidenceVersion: undefined,
        hints: 2,
        revealed: true,
      }));
      const state = restored([...primary, ...supplementary]);
      const before = structuredClone(state);
      expect(
        courseModuleGate(state, scoped, {
          ...module,
          gateCriteria: [criterion],
        }).passed,
      ).toBe(true);
      expect(courseGateRecovery(state, criterion, scoped)).toEqual({
        status: "complete",
      });
      expect(state).toEqual(before);
    });
  }
});

const suppliedGateTargets = criteria.flatMap(({ module, criterion, scoped }) =>
  criterion.taskRefs.flatMap((ref) =>
    lessons.flatMap((lesson) =>
      lesson.steps
        .filter((step) =>
          step.suppliedSolutions?.solution?.some(
            (target) =>
              target.lessonId === ref.lessonId && target.stepId === ref.stepId,
          ),
        )
        .map((step) => ({
          module,
          criterion,
          scoped,
          ref,
          source: { lessonId: lesson.id, stepId: step.id },
        })),
    ),
  ),
);

describe("all authored solution-to-gate disclosures", () => {
  for (const {
    module,
    criterion,
    scoped,
    ref,
    source,
  } of suppliedGateTargets) {
    it(`${source.lessonId}/${source.stepId} -> ${criterion.id}/${ref.stepId}: source-only imports preserve disclosure chronology`, () => {
      // Isolate this authored primary so another eligible family cannot mask its qualification.
      const single = {
        ...criterion,
        taskRefs: [ref],
        supplementaryStepRefs: [],
        ...(criterion.requiredIndependentCodingTasks === undefined
          ? {}
          : { requiredIndependentCodingTasks: 1 }),
      };
      const reveal: EvidenceEvent = {
        ...success(source, 100),
        id: "supplied-solution:source-only",
        kind: "exposure",
        evaluator: undefined,
        revealed: true,
      };
      const target = success(ref);
      for (const events of [
        [reveal, target],
        [target, reveal],
      ]) {
        const state = restored(events);
        const before = structuredClone(state);
        expect(
          courseModuleGate(state, scoped, { ...module, gateCriteria: [single] })
            .passed,
        ).toBe(false);
        expect(courseGateRecovery(state, single, scoped).status).not.toBe(
          "complete",
        );
        expect(state).toEqual(before);
      }
      const earlier = restored([target, { ...reveal, at: 300 }]);
      expect(
        courseModuleGate(earlier, scoped, { ...module, gateCriteria: [single] })
          .passed,
      ).toBe(true);
    });
  }
});

it("future imported coding tasks cannot establish delayed-review eligibility now", () => {
  const concept = concepts.find(
    (concept) => concept.id === "function-ownership",
  )!;
  const seen = new Set<string>();
  const tasks = lessons
    .flatMap((lesson) =>
      lesson.steps.flatMap((step) => {
        const family = step.evidence?.codingTaskId;
        if (
          !family ||
          seen.has(family) ||
          !step.evidence?.conceptIds.includes(concept.id) ||
          step.evaluator?.kind !== "tests" ||
          !["fix", "transfer", "project", "assessment"].includes(
            step.evidenceKind,
          )
        )
          return [];
        seen.add(family);
        return [success({ lessonId: lesson.id, stepId: step.id }, 100)];
      }),
    )
    .slice(0, concept.evidenceCalibration!.minimumCodingTasks);
  const now = 100 + DAY + 1;
  tasks[tasks.length - 1] = { ...tasks[tasks.length - 1], at: now + 100 };
  const state = restored(tasks);
  state.review = [
    {
      conceptId: concept.id,
      dueAt: 50,
      intervalDays: 1,
      attempts: 0,
      reason: "imported",
    },
  ];
  expect(courseDelayedReviewEligibility(state, concept.id, now)).toBe(false);
  expect(
    courseDelayedReviewEligibility(state, concept.id, now + 100 + DAY + 1),
  ).toBe(true);
});

it("an imported exposure cannot become a second strong task through a gate flag", () => {
  const primary: EvidenceEvent = {
    id: "ordinary-primary",
    lessonId: "ordinary",
    stepId: "primary",
    at: 100,
    conceptIds: ["ordinary"],
    kind: "transfer",
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
  };
  const state = restored([
    primary,
    {
      ...primary,
      id: "ordinary-contact",
      stepId: "contact",
      at: 200,
      kind: "exposure",
      evaluator: undefined,
      gate: true,
    },
  ]);
  expect(deriveConceptMastery(state, "ordinary").level).toBe("practiced");
});
