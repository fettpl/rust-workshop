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
      expect(gateRecovery(state, criterion, lessons)).toEqual({
        status: "exhausted",
      });
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
