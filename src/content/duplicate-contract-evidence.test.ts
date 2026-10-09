import { describe, expect, it } from "vitest";
import type { EvidenceEvent, Lesson, LessonStep } from "@/domain/types";
import { concepts, lessons, modules, reviewExercises } from "./course";
import {
  assistanceForLessonStep,
  courseEvidencePolicy,
  courseEvidenceSummary,
  courseMastery,
  evidenceForLessonStep,
  evidenceForReview,
  recordCourseEvidence,
} from "./learning-context";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "@/persistence/state";
import {
  gateRecovery,
  independentCodingTaskIds,
  moduleGate,
} from "@/engine/learning";

const primaryPairs = [
  [
    "async-lending-borrowed-readiness",
    "async-lending-receiver",
    "async-lending-receiver-gate",
    "async-lending-receiver-blank",
    "async-lending/receiver-lease-v1",
  ],
  [
    "async-lending-callback-borrow",
    "async-lending-callbacks",
    "async-lending-callbacks-gate",
    "async-lending-callbacks-blank",
    "async-lending/sequential-callback-v1",
  ],
  [
    "async-lending-cancel-commit",
    "async-lending-cancel-commit",
    "async-lending-cancel-commit-gate",
    "async-lending-cancel-commit-blank",
    "async-lending/cancel-commit-v1",
  ],
  [
    "async-lending-send-boundary",
    "async-lending-send-boundary",
    "async-lending-send-boundary-gate",
    "async-lending-send-boundary-blank",
    "async-lending/send-boundary-v1",
  ],
  [
    "async-lending-dyn-adapter",
    "async-lending-dyn-adapter",
    "async-lending-dyn-adapter-gate",
    "async-lending-dyn-adapter-blank",
    "async-lending/dyn-adapter-v1",
  ],
  [
    "unsafe-miri-byte-view-contract",
    "unsafe-miri-byte-view",
    "byte-view-gate",
    "byte-view-blank",
    "unsafe-miri/byte-view-v1",
  ],
  [
    "unsafe-miri-disjoint-regions-contract",
    "unsafe-miri-disjoint-regions",
    "disjoint-regions-gate",
    "disjoint-regions-blank",
    "unsafe-miri/disjoint-regions-v1",
  ],
  [
    "unsafe-miri-slot-state-contract",
    "unsafe-miri-slot-state",
    "slot-state-gate",
    "slot-state-blank",
    "unsafe-miri/slot-state-v1",
  ],
  [
    "unsafe-miri-mut-slot-variance-contract",
    "unsafe-miri-mut-slot",
    "mut-slot-gate",
    "mut-slot-blank",
    "unsafe-miri/mut-slot-v1",
  ],
] as const;

function lessonStep(lessonId: string, stepId: string) {
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  const step = lesson?.steps.find((candidate) => candidate.id === stepId);
  if (!lesson || !step) throw new Error(`Missing ${lessonId}/${stepId}`);
  return { lesson, step };
}

function eventFor(
  lesson: Lesson,
  step: LessonStep,
  id: string,
  at: number,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent {
  const evidence = evidenceForLessonStep(lesson, step);
  return {
    id,
    ...evidence,
    lessonId: lesson.id,
    stepId: step.id,
    kind: step.evidenceKind,
    passed: true,
    hints: 0,
    revealed: false,
    at,
    ...(step.evidenceGate ? { gate: true } : {}),
    ...(step.evaluator ? { evaluator: step.evaluator.kind } : {}),
    ...overrides,
  };
}

function primaryCriterion(lessonId: string) {
  const moduleId = lessons.find((lesson) => lesson.id === lessonId)!.moduleId;
  const courseModule = modules.find((candidate) => candidate.id === moduleId)!;
  return courseModule.gateCriteria!.find((criterion) =>
    criterion.taskRefs.some((ref) => ref.lessonId === lessonId),
  )!;
}

describe("duplicate contract evidence families", () => {
  it.each(primaryPairs)(
    "declares one version-2 family for %s gate and blank",
    (conceptId, lessonId, gateId, blankId, family) => {
      const gate = lessonStep(lessonId, gateId).step;
      const blank = lessonStep(lessonId, blankId).step;
      expect(
        concepts.find((concept) => concept.id === conceptId)
          ?.evidenceCalibration,
      ).toEqual({
        version: 2,
        minimumCodingTasks: 2,
      });
      expect(gate.evidence).toEqual({
        version: 2,
        conceptIds: [conceptId],
        codingTaskId: family,
      });
      expect(blank.evidence).toEqual(gate.evidence);
    },
  );

  it("aliases unsafe equivalent contract gates without merging retrieval criteria", () => {
    for (const [
      conceptId,
      lessonId,
      gateId,
      blankId,
      family,
    ] of primaryPairs.slice(5)) {
      const lesson = lessons.find((candidate) => candidate.id === lessonId)!;
      const gate = lesson.steps.find((step) => step.id === gateId)!;
      const equivalent = lesson.steps.find((step) =>
        step.id.endsWith("-contract-gate"),
      )!;
      const blank = lesson.steps.find((step) => step.id === blankId)!;
      const recall = lesson.steps.find((step) => step.kind === "recall")!;
      expect(equivalent.kind).toBe("apply");
      expect(equivalent.evidenceKind).toBe("transfer");
      expect(equivalent.evidence).toEqual(gate.evidence);
      expect(equivalent.evidence).toEqual({
        version: 2,
        conceptIds: [conceptId],
        codingTaskId: family,
      });
      expect(blank.evidence).toEqual(equivalent.evidence);
      expect(recall.evidence).toEqual({ version: 2, conceptIds: [conceptId] });
      const retrieval = modules
        .find((module) => module.id === lesson.moduleId)!
        .gateCriteria!.find((criterion) =>
          criterion.taskRefs.some(
            (ref) => ref.lessonId === lessonId && ref.stepId === recall.id,
          ),
        )!;
      expect(retrieval.requiredIndependentCodingTasks).toBeUndefined();
      expect(retrieval.taskRefs).toContainEqual({
        lessonId,
        stepId: equivalent.id,
      });
    }
  });

  it("keeps ordinary reviews as recall families outside primary credit", () => {
    for (const [conceptId, , , , family] of primaryPairs) {
      const review = reviewExercises[conceptId];
      expect(review.evidenceKind).toBe("recall");
      expect(review.evidence).toEqual({
        version: 2,
        conceptIds: [conceptId],
        codingTaskId: `review/${review.id}-v1`,
      });
      expect(review.evidence?.codingTaskId).not.toBe(family);
      expect(evidenceForReview(conceptId, review)).toEqual({
        conceptIds: [conceptId],
        evidenceVersion: 2,
      });
    }
  });

  it("counts gate and blank as one family while the primary criterion passes once", () => {
    const { lesson, step: gate } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-gate",
    );
    const { step: blank } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-blank",
    );
    let state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, gate, "receiver-gate", 1_000),
    );
    state = recordCourseEvidence(
      state,
      eventFor(lesson, blank, "receiver-blank", 2_000),
    );
    expect(
      independentCodingTaskIds(
        state,
        "async-lending-borrowed-readiness",
        courseEvidencePolicy,
      ),
    ).toEqual(["async-lending/receiver-lease-v1"]);
    expect(
      courseEvidenceSummary(state, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(1);
    expect(courseMastery(state, "async-lending-borrowed-readiness").level).toBe(
      "practiced",
    );
    const criterion = primaryCriterion(lesson.id);
    expect(
      moduleGate(
        state,
        lessons,
        modules.find((module) => module.id === lesson.moduleId),
      ).criteria.find((item) => item.label === criterion.label)?.passed,
    ).toBe(true);
  });

  it("attributes clean receiver batch evidence to its distinct second family", () => {
    const { lesson, step: gate } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-gate",
    );
    const { step: batch } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-bounded-batch",
    );
    expect(batch.evidence).toEqual({
      version: 2,
      conceptIds: ["async-lending-borrowed-readiness"],
      codingTaskId: "async-lending/receiver-bounded-batch-v1",
    });
    let state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, gate, "receiver-original", 1_000),
    );
    state = recordCourseEvidence(
      state,
      eventFor(lesson, batch, "receiver-batch", 2_000),
    );
    expect(
      independentCodingTaskIds(
        state,
        "async-lending-borrowed-readiness",
        courseEvidencePolicy,
      ),
    ).toEqual([
      "async-lending/receiver-lease-v1",
      "async-lending/receiver-bounded-batch-v1",
    ]);
    expect(
      courseEvidenceSummary(state, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(2);
    expect(courseMastery(state, "async-lending-borrowed-readiness").level).toBe(
      "understood",
    );
    expect(
      moduleGate(
        state,
        lessons,
        modules.find((module) => module.id === lesson.moduleId),
      ).criteria.find(
        (item) => item.label === primaryCriterion(lesson.id).label,
      )?.passed,
    ).toBe(true);
  });

  it("keeps a clean batch family after original help while preserving the old family boundary", () => {
    const { lesson, step: gate } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-gate",
    );
    const { step: batch } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-bounded-batch",
    );
    const state = createInitialState();
    state.steps[stepKey(lesson.id, gate.id)] = {
      ...createStepProgress(),
      revealed: true,
    };
    const helpedOriginal = recordCourseEvidence(state, {
      ...eventFor(lesson, gate, "helped-original", 1_000),
      ...assistanceForLessonStep(state, lesson, gate),
    });
    const cleanBatch = recordCourseEvidence(
      helpedOriginal,
      eventFor(lesson, batch, "clean-batch", 2_000),
    );
    expect(
      independentCodingTaskIds(
        cleanBatch,
        "async-lending-borrowed-readiness",
        courseEvidencePolicy,
      ),
    ).toEqual(["async-lending/receiver-bounded-batch-v1"]);
    expect(
      courseEvidenceSummary(cleanBatch, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(1);
    expect(
      gateRecovery(cleanBatch, primaryCriterion(lesson.id), lessons),
    ).toEqual({ status: "complete" });
  });

  it("credits a clean batch as one current family without an original event", () => {
    const { lesson, step: batch } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-bounded-batch",
    );
    const state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, batch, "batch-only-clean", 1_000),
    );
    expect(
      independentCodingTaskIds(
        state,
        "async-lending-borrowed-readiness",
        courseEvidencePolicy,
      ),
    ).toEqual(["async-lending/receiver-bounded-batch-v1"]);
    expect(
      courseEvidenceSummary(state, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(1);
    expect(
      moduleGate(
        state,
        lessons,
        modules.find((module) => module.id === lesson.moduleId),
      ).criteria.find(
        (item) => item.label === primaryCriterion(lesson.id).label,
      )?.passed,
    ).toBe(true);
  });

  it("keeps old unversioned history while clean batch supplies current family", () => {
    const { lesson, step: gate } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-gate",
    );
    const { step: batch } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-bounded-batch",
    );
    const legacy = eventFor(lesson, gate, "old-unversioned-receiver", 1_000);
    delete legacy.evidenceVersion;
    const imported = importState(
      exportState(recordCourseEvidence(createInitialState(), legacy)),
    );
    const state = recordCourseEvidence(
      imported,
      eventFor(lesson, batch, "clean-batch-after-old-history", 2_000),
    );
    expect(state.events[0]).toEqual(legacy);
    expect(
      independentCodingTaskIds(
        state,
        "async-lending-borrowed-readiness",
        courseEvidencePolicy,
      ),
    ).toEqual(["async-lending/receiver-bounded-batch-v1"]);
    expect(
      courseEvidenceSummary(state, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(1);
  });

  it("retains one clean batch family after later batch assistance", () => {
    const { lesson, step: batch } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-bounded-batch",
    );
    let state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, batch, "clean-batch-before-help", 1_000),
    );
    state.steps[stepKey(lesson.id, batch.id)] = {
      ...createStepProgress(),
      hints: 1,
    };
    state = recordCourseEvidence(state, {
      ...eventFor(lesson, batch, "helped-batch-later", 2_000),
      ...assistanceForLessonStep(state, lesson, batch),
    });
    expect(state.events[0]).toEqual(
      eventFor(lesson, batch, "clean-batch-before-help", 1_000),
    );
    expect(
      independentCodingTaskIds(
        state,
        "async-lending-borrowed-readiness",
        courseEvidencePolicy,
      ),
    ).toEqual(["async-lending/receiver-bounded-batch-v1"]);
    expect(
      courseEvidenceSummary(state, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(1);
    expect(gateRecovery(state, primaryCriterion(lesson.id), lessons)).toEqual({
      status: "complete",
    });
  });

  it("exhausts receiver recovery only after both primary families are helped", () => {
    const { lesson, step: gate } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-gate",
    );
    const { step: blank } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-blank",
    );
    const { step: batch } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-bounded-batch",
    );
    const state = createInitialState();
    state.steps[stepKey(lesson.id, gate.id)] = {
      ...createStepProgress(),
      revealed: true,
    };
    state.steps[stepKey(lesson.id, batch.id)] = {
      ...createStepProgress(),
      hints: 1,
    };
    let helped = recordCourseEvidence(state, {
      ...eventFor(lesson, gate, "helped-gate", 1_000),
      ...assistanceForLessonStep(state, lesson, gate),
    });
    helped = recordCourseEvidence(helped, {
      ...eventFor(lesson, blank, "helped-blank", 2_000),
      ...assistanceForLessonStep(helped, lesson, blank),
    });
    helped = recordCourseEvidence(helped, {
      ...eventFor(lesson, batch, "helped-batch", 3_000),
      ...assistanceForLessonStep(helped, lesson, batch),
    });
    expect(
      courseEvidenceSummary(helped, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(0);
    expect(gateRecovery(helped, primaryCriterion(lesson.id), lessons)).toEqual({
      status: "exhausted",
    });
  });

  it("keeps receiver review recall outside both primary families", () => {
    const review = reviewExercises["async-lending-borrowed-readiness"];
    const state = recordCourseEvidence(createInitialState(), {
      id: "receiver-review-recall",
      conceptIds: ["async-lending-borrowed-readiness"],
      lessonId: "review",
      stepId: review.id + ":session",
      kind: "recall",
      evidenceVersion: 2,
      passed: true,
      hints: 0,
      revealed: false,
      evaluator: "tests",
      at: 1_000,
    });
    expect(
      courseEvidenceSummary(state, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(0);
  });

  it.each(primaryPairs)(
    "counts each authored gate and blank pair as one current family: %s",
    (conceptId, lessonId, gateId, blankId, family) => {
      const { lesson, step: gate } = lessonStep(lessonId, gateId);
      const { step: blank } = lessonStep(lessonId, blankId);
      let state = recordCourseEvidence(
        createInitialState(),
        eventFor(lesson, gate, "all-gate-" + lessonId, 1_000),
      );
      state = recordCourseEvidence(
        state,
        eventFor(lesson, blank, "all-blank-" + lessonId, 2_000),
      );
      expect(
        independentCodingTaskIds(state, conceptId, courseEvidencePolicy),
      ).toEqual([family]);
      const criterion = primaryCriterion(lessonId);
      expect(
        moduleGate(
          state,
          lessons,
          modules.find((module) => module.id === lesson.moduleId),
        ).criteria.find((item) => item.label === criterion.label)?.passed,
      ).toBe(true);
    },
  );

  it.each(primaryPairs.slice(5))(
    "keeps every unsafe supplementary triple in one family and separate retrieval credit: %s",
    (conceptId, lessonId, gateId, blankId, family) => {
      const { lesson, step: gate } = lessonStep(lessonId, gateId);
      const equivalent = lesson.steps.find((step) =>
        step.id.endsWith("-contract-gate"),
      )!;
      const { step: blank } = lessonStep(lessonId, blankId);
      let state = recordCourseEvidence(
        createInitialState(),
        eventFor(lesson, gate, "triple-gate-" + lessonId, 1_000),
      );
      state = recordCourseEvidence(
        state,
        eventFor(lesson, equivalent, "triple-equivalent-" + lessonId, 2_000),
      );
      state = recordCourseEvidence(
        state,
        eventFor(lesson, blank, "triple-blank-" + lessonId, 3_000),
      );
      expect(
        independentCodingTaskIds(state, conceptId, courseEvidencePolicy),
      ).toEqual([family]);
      const courseModule = modules.find(
        (module) => module.id === lesson.moduleId,
      )!;
      const primary = courseModule.gateCriteria!.find((criterion) =>
        criterion.taskRefs.some((ref) => ref.stepId === gateId),
      )!;
      const retrieval = courseModule.gateCriteria!.find((criterion) =>
        criterion.taskRefs.some((ref) => ref.stepId === equivalent.id),
      )!;
      const result = moduleGate(state, lessons, courseModule);
      expect(
        result.criteria.find((item) => item.label === primary.label)?.passed,
      ).toBe(true);
      expect(
        result.criteria.find((item) => item.label === retrieval.label)?.passed,
      ).toBe(true);
    },
  );

  it.each([
    { hints: 1, revealed: false },
    { hints: 0, revealed: true },
  ])("inherits saved sibling %j assistance for every pair", (flags) => {
    for (const [, lessonId, gateId, blankId] of primaryPairs) {
      const { lesson, step: gate } = lessonStep(lessonId, gateId);
      const { step: blank } = lessonStep(lessonId, blankId);
      const state = createInitialState();
      state.steps[stepKey(lesson.id, blank.id)] = {
        ...createStepProgress(),
        ...flags,
      };
      expect(assistanceForLessonStep(state, lesson, gate)).toEqual(flags);
      state.steps[stepKey(lesson.id, gate.id)] = {
        ...createStepProgress(),
        ...flags,
      };
      expect(assistanceForLessonStep(state, lesson, blank)).toEqual(flags);
      const criterion = primaryCriterion(lesson.id);
      if (lessonId === "async-lending-receiver") {
        expect(gateRecovery(state, criterion, lessons)).toEqual({
          status: "available",
          task: {
            lessonId,
            stepId: "async-lending-receiver-bounded-batch",
          },
        });
      } else if (
        lessonId === "async-lending-callbacks" ||
        lessonId === "async-lending-dyn-adapter"
      ) {
        expect(gateRecovery(state, criterion, lessons)).toEqual({
          status: "available",
          task: {
            lessonId,
            stepId:
              lessonId === "async-lending-callbacks"
                ? "async-lending-callbacks-bounded-transform"
                : "async-lending-dyn-adapter-borrowed-sources",
          },
        });
      } else {
        expect(gateRecovery(state, criterion, lessons)).toEqual({
          status: "exhausted",
        });
      }
    }
  });

  it.each(primaryPairs)(
    "keeps a clean primary event and one family after later sibling help: %s",
    (conceptId, lessonId, gateId, blankId) => {
      const { lesson, step: gate } = lessonStep(lessonId, gateId);
      const { step: blank } = lessonStep(lessonId, blankId);
      const state = recordCourseEvidence(
        createInitialState(),
        eventFor(lesson, gate, "clean-gate-" + lessonId, 1_000),
      );
      state.steps[stepKey(lesson.id, blank.id)] = {
        ...createStepProgress(),
        hints: 1,
      };
      const assistedBlank = recordCourseEvidence(state, {
        ...eventFor(lesson, blank, "helped-blank-" + lessonId, 2_000),
        ...assistanceForLessonStep(state, lesson, blank),
      });
      expect(assistedBlank.events[0]).toEqual(
        eventFor(lesson, gate, "clean-gate-" + lessonId, 1_000),
      );
      expect(
        courseEvidenceSummary(assistedBlank, conceptId).qualifyingCodingTasks,
      ).toBe(1);
      const gateResult = moduleGate(
        assistedBlank,
        lessons,
        modules.find((module) => module.id === lesson.moduleId),
      );
      expect(
        gateResult.criteria.find(
          (item) => item.label === primaryCriterion(lesson.id).label,
        )?.passed,
      ).toBe(true);
    },
  );

  it("keeps supplementary-only evidence out of the primary criterion", () => {
    const { lesson, step: equivalent } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-contract-gate",
    );
    const state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, equivalent, "supplementary-only", 1_000),
    );
    expect(
      courseEvidenceSummary(state, "unsafe-miri-byte-view-contract")
        .qualifyingCodingTasks,
    ).toBe(1);
    expect(
      moduleGate(
        state,
        lessons,
        modules.find((module) => module.id === lesson.moduleId),
      ).criteria.find(
        (criterion) => criterion.label === primaryCriterion(lesson.id).label,
      )?.passed,
    ).toBe(false);
    const retrieval = modules
      .find((module) => module.id === lesson.moduleId)!
      .gateCriteria!.find((criterion) =>
        criterion.taskRefs.some((ref) => ref.stepId === equivalent.id),
      )!;
    expect(
      moduleGate(
        state,
        lessons,
        modules.find((module) => module.id === lesson.moduleId),
      ).criteria.find((criterion) => criterion.label === retrieval.label)
        ?.passed,
    ).toBe(true);
  });

  it("inherits supplementary saved assistance into the primary siblings", () => {
    const { lesson, step: equivalent } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-contract-gate",
    );
    const { step: gate } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-gate",
    );
    const state = createInitialState();
    state.steps[stepKey(lesson.id, equivalent.id)] = {
      ...createStepProgress(),
      revealed: true,
    };
    expect(assistanceForLessonStep(state, lesson, gate)).toEqual({
      hints: 0,
      revealed: true,
    });
    const helpedGate = recordCourseEvidence(state, {
      ...eventFor(lesson, gate, "inherited-help", 2_000),
      ...assistanceForLessonStep(state, lesson, gate),
    });
    expect(helpedGate.events[0].revealed).toBe(true);
    expect(
      courseEvidenceSummary(helpedGate, "unsafe-miri-byte-view-contract")
        .qualifyingCodingTasks,
    ).toBe(0);
  });

  it.each([
    { hints: 1, revealed: false },
    { hints: 0, revealed: true },
  ])(
    "imports saved unsafe supplementary help with no event in both directions: %j",
    (flags) => {
      for (const [, lessonId, gateId, blankId] of primaryPairs.slice(5)) {
        const { lesson, step: gate } = lessonStep(lessonId, gateId);
        const { step: blank } = lessonStep(lessonId, blankId);
        const equivalent = lesson.steps.find((step) =>
          step.id.endsWith("-contract-gate"),
        )!;
        const primarySaved = createInitialState();
        primarySaved.steps[stepKey(lesson.id, equivalent.id)] = {
          ...createStepProgress(),
          ...flags,
        };
        const importedSupplementaryHelp = importState(
          exportState(primarySaved),
        );
        let state = recordCourseEvidence(importedSupplementaryHelp, {
          ...eventFor(
            lesson,
            gate,
            "imported-supplementary-gate-" + lesson.id,
            1_000,
          ),
          ...assistanceForLessonStep(importedSupplementaryHelp, lesson, gate),
        });
        state = recordCourseEvidence(state, {
          ...eventFor(
            lesson,
            blank,
            "imported-supplementary-blank-" + lesson.id,
            2_000,
          ),
          ...assistanceForLessonStep(state, lesson, blank),
        });
        expect(
          state.events.every(
            (event) =>
              event.hints === flags.hints && event.revealed === flags.revealed,
          ),
        ).toBe(true);
        expect(
          courseEvidenceSummary(state, lesson.conceptIds[0])
            .qualifyingCodingTasks,
        ).toBe(0);
        expect(
          gateRecovery(state, primaryCriterion(lesson.id), lessons),
        ).toEqual({
          status: "exhausted",
        });

        const primarySavedFirst = createInitialState();
        primarySavedFirst.steps[stepKey(lesson.id, gate.id)] = {
          ...createStepProgress(),
          ...flags,
        };
        const importedPrimaryHelp = importState(exportState(primarySavedFirst));
        const helpedSupplementary = recordCourseEvidence(importedPrimaryHelp, {
          ...eventFor(
            lesson,
            equivalent,
            "imported-primary-equivalent-" + lesson.id,
            3_000,
          ),
          ...assistanceForLessonStep(importedPrimaryHelp, lesson, equivalent),
        });
        expect(helpedSupplementary.events[0].hints).toBe(flags.hints);
        expect(helpedSupplementary.events[0].revealed).toBe(flags.revealed);
        expect(
          courseEvidenceSummary(helpedSupplementary, lesson.conceptIds[0])
            .qualifyingCodingTasks,
        ).toBe(0);
      }
    },
  );

  it("keeps a clean supplementary family but exhausts the primary criterion after later help", () => {
    for (const [, lessonId, gateId] of primaryPairs.slice(5)) {
      const { lesson, step: gate } = lessonStep(lessonId, gateId);
      const equivalent = lesson.steps.find((step) =>
        step.id.endsWith("-contract-gate"),
      )!;
      let state = recordCourseEvidence(
        createInitialState(),
        eventFor(lesson, equivalent, "clean-supplementary-" + lesson.id, 1_000),
      );
      state.steps[stepKey(lesson.id, gate.id)] = {
        ...createStepProgress(),
        hints: 1,
      };
      state = recordCourseEvidence(state, {
        ...eventFor(lesson, gate, "helped-primary-" + lesson.id, 2_000),
        ...assistanceForLessonStep(state, lesson, gate),
      });
      expect(
        courseEvidenceSummary(state, lesson.conceptIds[0])
          .qualifyingCodingTasks,
      ).toBe(1);
      expect(
        moduleGate(
          state,
          lessons,
          modules.find((module) => module.id === lesson.moduleId),
        ).criteria.find(
          (criterion) => criterion.label === primaryCriterion(lesson.id).label,
        )?.passed,
      ).toBe(false);
      expect(gateRecovery(state, primaryCriterion(lesson.id), lessons)).toEqual(
        {
          status: "exhausted",
        },
      );
    }
  });

  it("blocks a later clean sibling after an unversioned assisted event", () => {
    const { lesson, step: equivalent } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-contract-gate",
    );
    const { step: gate } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-gate",
    );
    const legacyAssisted = eventFor(lesson, equivalent, "legacy-help", 1_000, {
      evidenceVersion: undefined,
      hints: 1,
    });
    const state = recordCourseEvidence(createInitialState(), legacyAssisted);
    const clean = recordCourseEvidence(
      state,
      eventFor(lesson, gate, "later-clean", 2_000),
    );
    expect(
      courseEvidenceSummary(clean, "unsafe-miri-byte-view-contract")
        .qualifyingCodingTasks,
    ).toBe(0);
  });

  it.each(primaryPairs.slice(5))(
    "keeps every unsafe unversioned assisted event historical and blocking: %s",
    (conceptId, lessonId, gateId) => {
      const { lesson, step: equivalent } = lessonStep(
        lessonId,
        lessonId.replace("unsafe-miri-", "").replace("contract", "") +
          "-contract-gate",
      );
      const { step: gate } = lessonStep(lessonId, gateId);
      const legacy = eventFor(lesson, equivalent, "legacy-" + lessonId, 1_000, {
        evidenceVersion: undefined,
        hints: 1,
      });
      const state = recordCourseEvidence(createInitialState(), legacy);
      const later = recordCourseEvidence(
        state,
        eventFor(lesson, gate, "later-clean-" + lessonId, 2_000),
      );
      expect(later.events).toEqual([legacy, expect.anything()]);
      expect(
        courseEvidenceSummary(later, conceptId).qualifyingCodingTasks,
      ).toBe(0);
    },
  );

  it("keeps recall outside primary families", () => {
    const { lesson, step: recall } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-recall",
    );
    const state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, recall, "lesson-recall", 1_000),
    );
    expect(
      courseEvidenceSummary(state, "unsafe-miri-byte-view-contract")
        .qualifyingCodingTasks,
    ).toBe(0);
    const review = reviewExercises["unsafe-miri-byte-view-contract"];
    expect(
      courseEvidenceSummary(
        recordCourseEvidence(createInitialState(), {
          id: "review-recall",
          conceptIds: ["unsafe-miri-byte-view-contract"],
          lessonId: "review",
          stepId: review.id + ":session",
          kind: "recall",
          evidenceVersion: 2,
          passed: true,
          hints: 0,
          revealed: false,
          evaluator: "tests",
          at: 1_000,
        }),
        "unsafe-miri-byte-view-contract",
      ).qualifyingCodingTasks,
    ).toBe(0);
  });

  it.each(primaryPairs.slice(5))(
    "keeps each genuine lesson recall in its uncounted retrieval boundary: %s",
    (conceptId, lessonId) => {
      const { lesson, step: recall } = lessonStep(
        lessonId,
        lessonId.replace("unsafe-miri-", "").replace("contract", "") +
          "-recall",
      );
      const state = recordCourseEvidence(
        createInitialState(),
        eventFor(lesson, recall, "recall-" + lessonId, 1_000),
      );
      const courseModule = modules.find(
        (module) => module.id === lesson.moduleId,
      )!;
      const retrieval = courseModule.gateCriteria!.find((criterion) =>
        criterion.taskRefs.some((ref) => ref.stepId === recall.id),
      )!;
      const result = moduleGate(state, lessons, courseModule);
      expect(
        result.criteria.find((item) => item.label === retrieval.label)?.passed,
      ).toBe(true);
      expect(
        courseEvidenceSummary(state, conceptId).qualifyingCodingTasks,
      ).toBe(0);
    },
  );

  it.each(primaryPairs)(
    "keeps ordinary review recall outside every primary family: %s",
    (conceptId) => {
      const review = reviewExercises[conceptId];
      const state = recordCourseEvidence(createInitialState(), {
        id: "ordinary-review-" + conceptId,
        conceptIds: [conceptId],
        lessonId: "review",
        stepId: review.id + ":session",
        kind: "recall",
        evidenceVersion: 2,
        passed: true,
        hints: 0,
        revealed: false,
        evaluator: "tests",
        at: 1_000,
      });
      expect(
        courseEvidenceSummary(state, conceptId).qualifyingCodingTasks,
      ).toBe(0);
    },
  );

  it.each([
    { evidenceVersion: 1, kind: "transfer" as const, conceptIds: ["wrong"] },
    {
      evidenceVersion: 2,
      kind: "fix" as const,
      conceptIds: ["unsafe-miri-byte-view-contract"],
    },
    { evidenceVersion: 2, kind: "transfer" as const, conceptIds: ["wrong"] },
  ])("rejects current evidence with mismatched metadata %j", (metadata) => {
    const { lesson, step: gate } = lessonStep(
      "unsafe-miri-byte-view",
      "byte-view-gate",
    );
    const state = recordCourseEvidence(
      createInitialState(),
      eventFor(lesson, gate, "mismatched", 1_000, metadata),
    );
    expect(
      courseEvidenceSummary(state, "unsafe-miri-byte-view-contract")
        .qualifyingCodingTasks,
    ).toBe(0);
  });

  it.each(primaryPairs)(
    "rejects mismatched version, concept, and evidence kind for every family: %s",
    (conceptId, lessonId, gateId) => {
      const { lesson, step: gate } = lessonStep(lessonId, gateId);
      const mismatches: Array<[string, Partial<EvidenceEvent>]> = [
        ["version", { evidenceVersion: 1 }],
        ["concept", { conceptIds: ["wrong-concept"] }],
        ["kind", { kind: "recall" as const }],
      ];
      for (const [suffix, overrides] of mismatches) {
        const state = recordCourseEvidence(
          createInitialState(),
          eventFor(
            lesson,
            gate,
            "mismatch-" + suffix + "-" + lessonId,
            1_000,
            overrides,
          ),
        );
        expect(
          courseEvidenceSummary(state, conceptId).qualifyingCodingTasks,
        ).toBe(0);
      }
    },
  );

  it("preserves unversioned raw history and resumed state without current credit", () => {
    const { lesson, step } = lessonStep(
      "async-lending-receiver",
      "async-lending-receiver-gate",
    );
    const legacy = eventFor(lesson, step, "legacy-gate", 1_000);
    delete legacy.evidenceVersion;
    const state = recordCourseEvidence(createInitialState(), legacy);
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId: lesson.id,
      stepIndex: 3,
    };
    const imported = importState(exportState(state));
    expect(imported.events).toEqual([legacy]);
    expect(imported.resume).toEqual(state.resume);
    expect(
      courseEvidenceSummary(imported, "async-lending-borrowed-readiness")
        .qualifyingCodingTasks,
    ).toBe(0);
    expect(evidenceForLessonStep(lesson, step)).toEqual({
      conceptIds: ["async-lending-borrowed-readiness"],
      evidenceVersion: 2,
    });
  });
});

const transferFamilies = [
  {
    conceptId: "async-lending-callback-borrow",
    lessonId: "async-lending-callbacks",
    stepId: "async-lending-callbacks-bounded-transform",
    oldFamily: "async-lending/sequential-callback-v1",
    newFamily: "async-lending/callback-bounded-transform-v1",
  },
  {
    conceptId: "async-lending-dyn-adapter",
    lessonId: "async-lending-dyn-adapter",
    stepId: "async-lending-dyn-adapter-borrowed-sources",
    oldFamily: "async-lending/dyn-adapter-v1",
    newFamily: "async-lending/dyn-borrowed-sources-v1",
  },
];

describe.each(transferFamilies)(
  "appended transfer evidence: $conceptId",
  ({ conceptId, lessonId, stepId, oldFamily, newFamily }) => {
    const { lesson, step: fresh } = lessonStep(lessonId, stepId);
    const gate = lessonStep(lessonId, `${lessonId}-gate`).step;
    const blank = lessonStep(lessonId, `${lessonId}-blank`).step;
    const familyIds = (state: ReturnType<typeof createInitialState>) =>
      independentCodingTaskIds(state, conceptId, courseEvidencePolicy);
    const record = (
      state: ReturnType<typeof createInitialState>,
      step: LessonStep,
      id: string,
      at: number,
    ) =>
      recordCourseEvidence(state, {
        ...eventFor(lesson, step, id, at),
        ...assistanceForLessonStep(state, lesson, step),
      });

    it("resolves exact singleton registered metadata and preserves the minimum-two concept policy", () => {
      expect(fresh).toMatchObject({
        evidenceKind: "transfer",
        evidenceGate: true,
        evaluator: { kind: "tests" },
        evidence: {
          version: 2,
          conceptIds: [conceptId],
          codingTaskId: newFamily,
        },
      });
      expect(
        courseEvidencePolicy.definitionForEvent(
          eventFor(lesson, fresh, "definition", 1000),
        ),
      ).toEqual(fresh.evidence);
      expect(
        concepts.find((item) => item.id === conceptId)?.evidenceCalibration,
      ).toEqual({ version: 2, minimumCodingTasks: 2 });
      expect(primaryCriterion(lessonId).taskRefs).toEqual([
        { lessonId, stepId: gate.id },
        { lessonId, stepId: blank.id },
        { lessonId, stepId: fresh.id },
      ]);
      expect(primaryCriterion(lessonId).requiredIndependentCodingTasks).toBe(1);
    });

    it("counts old aliases once, new alone once, and clean old plus new twice", () => {
      const old = record(
        record(createInitialState(), gate, "old-gate", 1000),
        blank,
        "old-blank",
        2000,
      );
      expect(familyIds(old)).toEqual([oldFamily]);
      expect(
        familyIds(record(createInitialState(), fresh, "new-only", 1000)),
      ).toEqual([newFamily]);
      const both = record(old, fresh, "new-clean", 3000);
      expect(familyIds(both)).toEqual([oldFamily, newFamily]);
      expect(courseEvidenceSummary(both, conceptId).qualifyingCodingTasks).toBe(
        2,
      );
      expect(courseMastery(both, conceptId).level).toBe("understood");
      expect(courseMastery(old, conceptId).level).toBe("practiced");
      expect(
        moduleGate(
          both,
          lessons,
          modules.find((item) => item.id === lesson.moduleId),
        ).criteria.find(
          (item) => item.label === primaryCriterion(lessonId).label,
        )?.passed,
      ).toBe(true);
    });

    it.each([
      { hints: 1, revealed: false },
      { hints: 0, revealed: true },
    ])(
      "keeps saved old help %j inside its family and offers the new family",
      (flags) => {
        const saved = createInitialState();
        saved.steps[stepKey(lessonId, gate.id)] = {
          ...createStepProgress(),
          ...flags,
        };
        const imported = importState(exportState(saved));
        expect(assistanceForLessonStep(imported, lesson, blank)).toEqual(flags);
        expect(assistanceForLessonStep(imported, lesson, fresh)).toEqual({
          hints: 0,
          revealed: false,
        });
        expect(
          gateRecovery(imported, primaryCriterion(lessonId), lessons),
        ).toEqual({ status: "available", task: { lessonId, stepId } });
        const helped = record(imported, gate, "helped-old", 1000);
        const cleanNew = record(helped, fresh, "clean-new", 2000);
        expect(familyIds(cleanNew)).toEqual([newFamily]);
        expect(
          courseEvidenceSummary(cleanNew, conceptId).qualifyingCodingTasks,
        ).toBe(1);
        expect(courseMastery(cleanNew, conceptId).level).not.toBe("understood");
        expect(cleanNew.events[0]).toEqual({
          ...eventFor(lesson, gate, "helped-old", 1000),
          ...flags,
        });
      },
    );

    it("keeps new help contained, retains prior raw clean credit, and exhausts only when both families are helped without clean credit", () => {
      const cleanOldEvent = eventFor(
        lesson,
        gate,
        "old-clean-before-help",
        1000,
      );
      let cleanOld = recordCourseEvidence(createInitialState(), cleanOldEvent);
      cleanOld.steps[stepKey(lessonId, fresh.id)] = {
        ...createStepProgress(),
        revealed: true,
      };
      expect(assistanceForLessonStep(cleanOld, lesson, gate)).toEqual({
        hints: 0,
        revealed: false,
      });
      expect(assistanceForLessonStep(cleanOld, lesson, blank)).toEqual({
        hints: 0,
        revealed: false,
      });
      cleanOld = record(cleanOld, fresh, "new-helped", 2000);
      expect(cleanOld.events[0]).toEqual(cleanOldEvent);
      expect(familyIds(cleanOld)).toEqual([oldFamily]);
      const unrelated = lessonStep(
        "async-lending-receiver",
        "async-lending-receiver-bounded-batch",
      );
      expect(
        assistanceForLessonStep(cleanOld, unrelated.lesson, unrelated.step),
      ).toEqual({ hints: 0, revealed: false });
      const bothHelped = createInitialState();
      bothHelped.steps[stepKey(lessonId, gate.id)] = {
        ...createStepProgress(),
        hints: 1,
      };
      bothHelped.steps[stepKey(lessonId, fresh.id)] = {
        ...createStepProgress(),
        revealed: true,
      };
      const final = record(
        record(
          record(bothHelped, gate, "both-old", 1000),
          blank,
          "both-blank",
          2000,
        ),
        fresh,
        "both-new",
        3000,
      );
      expect(familyIds(final)).toEqual([]);
      expect(gateRecovery(final, primaryCriterion(lessonId), lessons)).toEqual({
        status: "exhausted",
      });
    });

    it("rejects current attribution mismatches and unsupported imported family fields, while optional gate never overrides source authority", () => {
      const legal = eventFor(lesson, fresh, "legal", 1000);
      for (const overrides of [
        { evidenceVersion: undefined },
        { evidenceVersion: 1 },
        { conceptIds: ["wrong"] },
        { conceptIds: [conceptId, conceptId] },
        { conceptIds: [conceptId, "extra"] },
        { evaluator: "compilation" as const },
        { kind: "recall" as const },
        { lessonId: "unknown" },
        { stepId: "unknown" },
        { kind: "exposure" as const, gate: true },
        { kind: "prediction" as const, gate: true },
        { evaluator: "answer" as const, gate: true },
      ])
        expect(
          familyIds(
            recordCourseEvidence(createInitialState(), {
              ...legal,
              ...overrides,
            }),
          ),
        ).toEqual([]);
      for (const gateFlag of [false, undefined]) {
        const preserved = recordCourseEvidence(createInitialState(), {
          ...legal,
          gate: gateFlag,
        });
        expect(familyIds(preserved)).toEqual([newFamily]);
      }
      const envelope = JSON.parse(
        exportState(recordCourseEvidence(createInitialState(), legal)),
      );
      envelope.state.events[0].codingTaskId = oldFamily;
      expect(() => importState(JSON.stringify(envelope))).toThrow();
      const recall = lesson.steps.find((item) => item.kind === "recall")!;
      expect(
        familyIds(
          recordCourseEvidence(
            createInitialState(),
            eventFor(lesson, recall, "gated-recall", 1000, { gate: true }),
          ),
        ),
      ).toEqual([]);
      const review = reviewExercises[conceptId];
      expect(
        familyIds(
          recordCourseEvidence(createInitialState(), {
            id: "ordinary-review",
            conceptIds: [conceptId],
            lessonId: "review",
            stepId: review.id + ":session",
            kind: "recall",
            evidenceVersion: 2,
            passed: true,
            hints: 0,
            revealed: false,
            evaluator: "tests",
            gate: true,
            at: 1000,
          }),
        ),
      ).toEqual([]);
    });

    it("round-trips exact schema3 raw events, assistance, attempts, drafts and old resume/review identity", () => {
      const raw = eventFor(lesson, gate, "old-raw-assisted", 1700000000000, {
        hints: 1,
      });
      const original = recordCourseEvidence(createInitialState(), raw);
      original.updatedAt = 1700000000001;
      original.resume = {
        ...original.resume,
        view: "lesson",
        lessonId,
        stepIndex: lesson.steps.indexOf(gate),
      };
      original.steps[stepKey(lessonId, gate.id)] = {
        ...createStepProgress(),
        code: "// stary szkic\n",
        hints: 1,
        attempts: [
          {
            at: 1700000000000,
            code: "// próba",
            passed: false,
            feedback: "zachowane",
            result: {
              status: "test-failure",
              stdout: "original output",
              stderr: "",
              diagnostics: [],
              durationMs: 3,
            },
          },
        ],
      };
      original.notes[lessonId] = "Zachowana notatka";
      original.bookmarks = [lessonId];
      original.review = [
        {
          conceptId,
          dueAt: 1700000000010,
          intervalDays: 1,
          attempts: 1,
          reason: "old review",
        },
      ];
      original.reviewSession = {
        conceptId,
        mode: "challenge",
        sessionId: "old-session-identity",
        startedAt: 1700000000000,
        wasDue: true,
        exerciseId: reviewExercises[conceptId].id,
      };
      const imported = importState(exportState(original));
      expect(imported).toEqual(original);
      const next = record(imported, fresh, "new-after-import", 1700000000020);
      expect(next.events[0]).toEqual(raw);
      expect(next.steps).toEqual(original.steps);
      expect(next.resume).toEqual(original.resume);
      expect(next.notes).toEqual(original.notes);
      expect(next.bookmarks).toEqual(original.bookmarks);
      expect(next.reviewSession).toEqual(original.reviewSession);
      expect(familyIds(next)).toEqual([newFamily]);
      expect(importState(exportState(next))).toEqual(next);
    });
  },
);
