import { describe, expect, it } from "vitest";
import { lessons as curriculum, ownershipModule } from "@/content/course";
import {
  fuzzEvidenceConcepts,
  fuzzEvidenceLessons,
} from "@/content/fuzz-evidence";
import type {
  CourseModule,
  EvidenceEvent,
  Lesson,
  UserState,
} from "@/domain/types";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "@/persistence/state";
import {
  DAY,
  delayedReviewEligibility,
  deriveConceptMastery,
  hasQuietInterval,
  independentCodingTaskIds,
  type EvidencePolicy,
  dueReviews,
  evidencePolicyForConcepts,
  isIndependentSuccess,
  moduleGate,
  rateReview,
  recordEvidence,
  recordLessonExposure,
} from "./learning";

const event = (overrides: Partial<EvidenceEvent> = {}): EvidenceEvent => ({
  id: "e1",
  conceptIds: ["ownership"],
  lessonId: "memory",
  stepId: "gate",
  kind: "transfer",
  passed: true,
  hints: 0,
  revealed: false,
  at: 1_000,
  gate: true,
  ...overrides,
});
const base = (): UserState => createInitialState();
const functionOwnershipPolicy: EvidencePolicy = {
  artifactForConcept: () => "rust-code",
  calibrationForConcept: (conceptId) =>
    conceptId === "function-ownership"
      ? { version: 2, minimumCodingTasks: 2 }
      : undefined,
  definitionForEvent: (candidate) =>
    candidate.conceptIds.includes("function-ownership") &&
    candidate.evidenceVersion === 2
      ? {
          version: 2,
          conceptIds: ["function-ownership"],
          codingTaskId: candidate.stepId,
        }
      : undefined,
};
const functionEvent = (
  id: string,
  stepId: string,
  at: number,
): EvidenceEvent => ({
  id,
  conceptIds: ["function-ownership"],
  lessonId: "function-ownership-calibration",
  stepId,
  kind: "fix",
  passed: true,
  hints: 0,
  revealed: false,
  at,
  evidenceVersion: 2,
  evaluator: "tests",
  gate: false,
});
const functionOwnershipState = (
  contactAt: number,
  dueAt: number,
): UserState => ({
  ...createInitialState(),
  events: [
    functionEvent("family-a", "ownership/read-length", 100),
    functionEvent("family-b", "ownership/function-predicate-v1", 200),
    {
      id: "contact",
      conceptIds: ["function-ownership"],
      lessonId: "review",
      stepId: "function-ownership:old-session",
      kind: "exposure",
      passed: false,
      hints: 0,
      revealed: false,
      at: contactAt,
      evidenceVersion: 2,
      evaluator: "answer",
      gate: false,
    },
  ],
  review: [
    {
      conceptId: "function-ownership",
      dueAt,
      intervalDays: 1,
      attempts: 1,
      reason: "test",
    },
  ],
});
const manifestPolicy = evidencePolicyForConcepts([
  {
    id: "manifest-concept",
    title: "Manifest",
    prerequisites: [],
    competencyIds: [],
    reviewPrompt: "",
    reviewAnswer: "",
    distinguish: "",
    evidenceArtifact: "manifest",
  },
]);

describe("learning engine", () => {
  it("keeps DAY ordinary and DAY+1 delayed", () => {
    const contactAt = 10_000;
    const state = functionOwnershipState(contactAt, contactAt);
    expect(hasQuietInterval(state, "function-ownership", contactAt + DAY)).toBe(
      false,
    );
    expect(
      delayedReviewEligibility(
        state,
        "function-ownership",
        contactAt + DAY,
        functionOwnershipPolicy,
      ),
    ).toBe(false);
    expect(
      delayedReviewEligibility(
        state,
        "function-ownership",
        contactAt + DAY + 1,
        functionOwnershipPolicy,
      ),
    ).toBe(true);
  });

  it("uses the latest event or rating as the quiet contact", () => {
    const contactAt = 10_000;
    const state = {
      ...functionOwnershipState(contactAt, contactAt),
      ratings: [
        {
          conceptId: "function-ownership",
          rating: "good" as const,
          at: 50_000,
        },
      ],
    };
    expect(hasQuietInterval(state, "function-ownership", 50_000 + DAY)).toBe(
      false,
    );
    expect(
      hasQuietInterval(state, "function-ownership", 50_000 + DAY + 1),
    ).toBe(true);
  });

  it("does not count review events as a family", () => {
    const state = functionOwnershipState(10_000, 10_000);
    const before = independentCodingTaskIds(
      state,
      "function-ownership",
      functionOwnershipPolicy,
    );
    const afterReview = {
      ...state,
      events: [
        ...state.events,
        {
          ...state.events[2],
          id: "review-success",
          kind: "recall" as const,
          passed: true,
          delayed: true,
          at: 20_000,
          stepId: "review-function-ownership-delayed-v1:new-session",
        },
      ],
    };
    expect(
      independentCodingTaskIds(
        afterReview,
        "function-ownership",
        functionOwnershipPolicy,
      ),
    ).toEqual(before);
  });

  it("excludes revealed or hinted coding attempts from independent families", () => {
    const baseState = functionOwnershipState(10_000, 10_000);
    const assisted = {
      ...baseState,
      events: [
        baseState.events[2],
        {
          ...functionEvent("assisted", "ownership/function-predicate-v1", 300),
          hints: 1,
        },
      ],
    };
    const revealed = {
      ...baseState,
      events: [
        baseState.events[2],
        {
          ...functionEvent("revealed", "ownership/function-predicate-v1", 300),
          revealed: true,
        },
      ],
    };
    expect(
      independentCodingTaskIds(
        assisted,
        "function-ownership",
        functionOwnershipPolicy,
      ),
    ).toEqual([]);
    expect(
      independentCodingTaskIds(
        revealed,
        "function-ownership",
        functionOwnershipPolicy,
      ),
    ).toEqual([]);
  });

  it("does not count a failed attempt as an independent family", () => {
    const state = functionOwnershipState(10_000, 10_000);
    const failed = {
      ...state,
      events: [
        ...state.events,
        { ...functionEvent("failed", "ownership/new", 300), passed: false },
      ],
    };
    expect(
      independentCodingTaskIds(
        failed,
        "function-ownership",
        functionOwnershipPolicy,
      ),
    ).toEqual(
      independentCodingTaskIds(
        state,
        "function-ownership",
        functionOwnershipPolicy,
      ),
    );
  });

  it("preserves authored event order while deduplicating family IDs", () => {
    const state = functionOwnershipState(10_000, 10_000);
    const duplicate = {
      ...state,
      events: [
        ...state.events,
        functionEvent("family-a-again", "ownership/read-length", 400),
      ],
    };
    expect(duplicate.events.map((candidate) => candidate.id)).toEqual([
      "family-a",
      "family-b",
      "contact",
      "family-a-again",
    ]);
    expect(
      independentCodingTaskIds(
        duplicate,
        "function-ownership",
        functionOwnershipPolicy,
      ),
    ).toEqual(["ownership/read-length", "ownership/function-predicate-v1"]);
  });

  it("does not make self-rating or a revealed answer strong evidence", () => {
    let state = recordEvidence(
      base(),
      event({ kind: "self-rating", id: "self" }),
    );
    state = recordEvidence(
      state,
      event({ id: "revealed", revealed: true, stepId: "revealed" }),
    );
    expect(state.mastery.ownership?.level ?? "new").not.toBe("understood");
  });

  it("does not award mastery from a passed rubric event", () => {
    const state = recordEvidence(
      base(),
      event({
        id: "rubric",
        kind: "assessment",
        evaluator: "rubric",
        gate: true,
      }),
    );
    expect(state.mastery.ownership?.level ?? "new").toBe("new");
    expect(state.review).toEqual([]);
  });

  it("does not queue a review from a failed rubric self-check", () => {
    const state = recordEvidence(
      base(),
      event({
        id: "rubric-failed",
        kind: "self-rating",
        evaluator: "rubric",
        passed: false,
      }),
    );
    expect(state.review).toEqual([]);
  });

  it("does not award mastery for an expected-error observation", () => {
    const observed = event({
      id: "e0515",
      kind: "assessment",
      evaluator: "expected-error",
      passed: true,
    });
    const state = recordEvidence(base(), observed);
    expect(state.mastery.ownership?.level).toBe("new");
    expect(isIndependentSuccess(observed)).toBe(false);
    expect(state.review).toEqual([]);
  });

  it("requires distinct unaided gate and transfer tasks for understood mastery", () => {
    let state = recordEvidence(
      base(),
      event({ id: "a", stepId: "gate", kind: "fix" }),
    );
    state = recordEvidence(
      state,
      event({ id: "replay", stepId: "gate", kind: "fix", at: 2_000 }),
    );
    expect(state.mastery.ownership?.level).not.toBe("understood");
    state = recordEvidence(
      state,
      event({
        id: "b",
        stepId: "transfer",
        kind: "transfer",
        at: 3_000,
        evaluator: "exact-output",
      }),
    );
    expect(state.mastery.ownership?.level).toBe("understood");
  });

  it("requires two independent manifest tasks for manifest understanding", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "manifest-a",
        conceptIds: ["manifest-concept"],
        evaluator: "manifest-contract",
        stepId: "manifest-a",
      }),
      manifestPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "manifest-b",
        conceptIds: ["manifest-concept"],
        evaluator: "manifest-contract",
        stepId: "manifest-b",
        kind: "assessment",
        at: 2_000,
      }),
      manifestPolicy,
    );
    expect(state.mastery["manifest-concept"]?.level).toBe("understood");
  });

  it("counts independent Rust campaign gate and transfer evidence for mastery", () => {
    const campaignConcept = fuzzEvidenceConcepts.find(
      (concept) => concept.id === "fuzz-campaign-evidence",
    )!;
    const campaignLesson = fuzzEvidenceLessons.find(
      (lesson) => lesson.id === "fuzz-campaign-evidence",
    )!;
    const gate = campaignLesson.steps.find(
      (step) => step.id === "fuzz-campaign-evidence-gate",
    )!;
    const blank = campaignLesson.steps.find(
      (step) => step.id === "fuzz-campaign-evidence-blank",
    )!;
    const campaignPolicy = evidencePolicyForConcepts([campaignConcept]);
    let state = recordEvidence(
      base(),
      event({
        id: "campaign-gate",
        conceptIds: campaignLesson.conceptIds,
        lessonId: campaignLesson.id,
        stepId: gate.id,
        kind: "assessment",
        evaluator: gate.evaluator?.kind,
      }),
      campaignPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "campaign-blank",
        conceptIds: campaignLesson.conceptIds,
        lessonId: campaignLesson.id,
        stepId: blank.id,
        kind: "assessment",
        evaluator: blank.evaluator?.kind,
        at: 2_000,
      }),
      campaignPolicy,
    );
    expect(state.mastery[campaignConcept.id]?.level).toBe("understood");
    expect(state.review).toEqual([
      expect.objectContaining({
        conceptId: campaignConcept.id,
        intervalDays: 1,
      }),
    ]);
  });

  it("filters Rust and manifest evidence in both directions", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "manifest-rust-a",
        conceptIds: ["manifest-concept"],
        stepId: "manifest-rust-a",
        evaluator: "tests",
      }),
      manifestPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "manifest-rust-b",
        conceptIds: ["manifest-concept"],
        stepId: "manifest-rust-b",
        evaluator: "exact-output",
      }),
      manifestPolicy,
    );
    expect(state.mastery["manifest-concept"]?.level ?? "new").toBe("new");

    const rustPolicy = evidencePolicyForConcepts([
      {
        id: "rust-concept",
        title: "Rust",
        prerequisites: [],
        competencyIds: [],
        reviewPrompt: "",
        reviewAnswer: "",
        distinguish: "",
      },
    ]);
    state = recordEvidence(
      state,
      event({
        id: "rust-manifest-a",
        conceptIds: ["rust-concept"],
        stepId: "rust-manifest-a",
        evaluator: "manifest-contract",
      }),
      rustPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "rust-manifest-b",
        conceptIds: ["rust-concept"],
        stepId: "rust-manifest-b",
        evaluator: "manifest-contract",
        kind: "assessment",
      }),
      rustPolicy,
    );
    expect(state.mastery["rust-concept"]?.level ?? "new").toBe("new");
  });

  it("keeps neutral answer and choice evidence independent of artifact", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "manifest-choice",
        conceptIds: ["manifest-concept"],
        stepId: "manifest-choice",
        evaluator: "choice",
      }),
      manifestPolicy,
    );
    expect(state.mastery["manifest-concept"]?.level).toBe("practiced");
    state = recordEvidence(
      state,
      event({
        id: "manifest-answer",
        conceptIds: ["manifest-concept"],
        stepId: "manifest-answer",
        evaluator: "manifest-contract",
        kind: "assessment",
      }),
      manifestPolicy,
    );
    expect(state.mastery["manifest-concept"]?.level).toBe("understood");
  });

  it("requires delayed manifest recall after two manifest tasks for retention", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "manifest-retention-a",
        conceptIds: ["manifest-concept"],
        evaluator: "manifest-contract",
        stepId: "manifest-retention-a",
        at: 1_000,
      }),
      manifestPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "manifest-retention-b",
        conceptIds: ["manifest-concept"],
        evaluator: "manifest-contract",
        stepId: "manifest-retention-b",
        kind: "assessment",
        at: 2_000,
      }),
      manifestPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "manifest-retention-recall",
        conceptIds: ["manifest-concept"],
        evaluator: "manifest-contract",
        kind: "recall",
        stepId: "manifest-retention-recall",
        delayed: true,
        at: 2_000 + DAY + 1,
      }),
      manifestPolicy,
    );
    expect(state.mastery["manifest-concept"]?.level).toBe("retained");
  });

  it("requires a verified delayed event more than a day after prior evidence for retention", () => {
    let state = recordEvidence(
      base(),
      event({ id: "a", at: 1_000, stepId: "gate" }),
    );
    state = recordEvidence(
      state,
      event({
        id: "b",
        at: 2_000,
        stepId: "transfer",
        evaluator: "exact-output",
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "c",
        kind: "recall",
        at: 2_000 + DAY + 1,
        stepId: "delayed",
        delayed: true,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("retained");
    let unverified = recordEvidence(
      base(),
      event({ id: "a", at: 1_000, stepId: "gate" }),
    );
    unverified = recordEvidence(
      unverified,
      event({
        id: "b",
        at: 2_000,
        stepId: "transfer",
        evaluator: "exact-output",
      }),
    );
    unverified = recordEvidence(
      unverified,
      event({
        id: "c",
        kind: "recall",
        at: 2_000 + DAY + 1,
        stepId: "delayed",
        delayed: true,
        revealed: true,
      }),
    );
    expect(unverified.mastery.ownership?.level).toBe("understood");
  });

  it("allows delayed verified recall to establish retention without trusting the flag alone", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "prior",
        kind: "transfer",
        stepId: "transfer",
        at: 1_000,
        evaluator: "exact-output",
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "prior-2",
        kind: "transfer",
        stepId: "transfer-2",
        at: 2_000,
        evaluator: "choice",
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "recall",
        kind: "recall",
        stepId: "recall",
        at: 2_000 + DAY + 1,
        delayed: true,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("retained");
  });

  it("deduplicates event ids and task keys, and queues failures without reducing mastery", () => {
    let state = recordEvidence(base(), event({ id: "a", stepId: "gate" }));
    state = recordEvidence(
      state,
      event({ id: "duplicate", stepId: "gate", at: 2_000 }),
    );
    expect(state.events).toHaveLength(2);
    const practiced = state.mastery.ownership?.level;
    state = recordEvidence(
      state,
      event({
        id: "failed",
        stepId: "failed",
        passed: false,
        kind: "fix",
        at: 3_000,
      }),
    );
    expect(state.mastery.ownership?.level).toBe(practiced);
    expect(
      state.review.find((item) => item.conceptId === "ownership"),
    ).toMatchObject({ dueAt: 3_000 });
  });

  it("preserves a failed attempt and lets a later success on the same task count once", () => {
    let state = recordEvidence(
      base(),
      event({ id: "failed", stepId: "gate", passed: false }),
    );
    state = recordEvidence(
      state,
      event({
        id: "fixed",
        stepId: "gate",
        kind: "fix",
        at: 2_000,
        passed: true,
      }),
    );
    expect(state.events).toHaveLength(2);
    expect(state.mastery.ownership?.level).toBe("practiced");
  });

  it("queues a future review after successful evidence and reschedules delayed recall", () => {
    let state = recordEvidence(
      base(),
      event({ id: "success", stepId: "gate", kind: "fix", at: 1_000 }),
    );
    expect(
      state.review.find((item) => item.conceptId === "ownership")?.dueAt,
    ).toBe(1_000 + DAY);
    state = recordEvidence(
      state,
      event({
        id: "failed-review",
        stepId: "review-failure",
        passed: false,
        at: 2_000,
      }),
    );
    expect(
      state.review.find((item) => item.conceptId === "ownership")?.dueAt,
    ).toBe(2_000);
    state = recordEvidence(
      state,
      event({
        id: "recall",
        kind: "recall",
        stepId: "recall",
        delayed: true,
        at: 3_000,
        passed: true,
      }),
    );
    expect(
      state.review.find((item) => item.conceptId === "ownership")?.dueAt,
    ).toBeGreaterThan(3_000);
  });

  it("cannot retain from one exposure plus delayed recall", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "exposure",
        kind: "exposure",
        stepId: "exposure",
        at: 1_000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "recall",
        kind: "recall",
        stepId: "recall",
        delayed: true,
        at: 1_000 + DAY + 1,
      }),
    );
    expect(state.mastery.ownership?.level).not.toBe("retained");
  });

  it("does not reach understood from two multiple-choice transfers alone", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "choice-1",
        kind: "transfer",
        stepId: "choice-1",
        evaluator: "choice",
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "choice-2",
        kind: "assessment",
        stepId: "choice-2",
        evaluator: "choice",
        at: 2_000,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("practiced");
  });

  it("allows independently verified code plus a prediction gate to reach understood", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "code",
        kind: "fix",
        stepId: "code",
        evaluator: "tests",
        gate: false,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "prediction",
        kind: "prediction",
        stepId: "prediction",
        evaluator: "choice",
        gate: true,
        at: 2_000,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("understood");
  });

  it("does not count a repeated code task as a second strong task", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "code-1",
        kind: "fix",
        stepId: "code",
        evaluator: "exact-output",
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "code-2",
        kind: "fix",
        stepId: "code",
        evaluator: "exact-output",
        at: 2_000,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("practiced");
  });

  it("blocks delayed retention after recent duplicate lesson evidence", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "code",
        kind: "fix",
        stepId: "code",
        evaluator: "tests",
        at: 1_000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "prediction",
        kind: "prediction",
        stepId: "prediction",
        gate: true,
        at: 2_000,
      }),
    );
    const recallAt = 2_000 + DAY + 1;
    state = recordEvidence(
      state,
      event({
        id: "recent-duplicate",
        kind: "fix",
        stepId: "code",
        evaluator: "tests",
        at: recallAt - 60 * 60 * 1000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "delayed",
        kind: "recall",
        stepId: "delayed",
        delayed: true,
        at: recallAt,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("understood");
  });

  it("blocks delayed retention after a recent reveal or self-rating", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "code",
        kind: "fix",
        stepId: "code",
        evaluator: "tests",
        at: 1_000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "prediction",
        kind: "prediction",
        stepId: "prediction",
        gate: true,
        at: 2_000,
      }),
    );
    const recallAt = 2_000 + DAY + 1;
    state = recordEvidence(
      state,
      event({
        id: "self-rating",
        kind: "self-rating",
        stepId: "rating",
        at: recallAt - 60 * 60 * 1000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "reveal",
        kind: "recall",
        stepId: "reveal",
        revealed: true,
        passed: false,
        at: recallAt - 30 * 60 * 1000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "delayed",
        kind: "recall",
        stepId: "delayed",
        delayed: true,
        at: recallAt,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("understood");
  });

  it("treats a freshly revealed lesson solution as a retention boundary", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "code",
        kind: "fix",
        stepId: "code",
        evaluator: "tests",
        at: 1_000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "prediction",
        kind: "prediction",
        stepId: "prediction",
        gate: true,
        at: 2_000,
      }),
    );
    const recallAt = 2_000 + DAY + 1;
    state = recordLessonExposure(state, {
      lessonId: "memory",
      stepId: "solution",
      conceptIds: ["ownership"],
      at: recallAt - 60 * 60 * 1000,
      revealed: true,
    });
    state = recordEvidence(
      state,
      event({
        id: "delayed",
        kind: "recall",
        stepId: "delayed",
        delayed: true,
        at: recallAt,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("understood");
  });

  it("records lesson exposure without treating it as successful practice", () => {
    const state = recordLessonExposure(base(), {
      lessonId: "memory",
      stepId: "step",
      conceptIds: ["ownership"],
      at: 1_000,
    });
    expect(state.events.at(-1)).toMatchObject({
      kind: "exposure",
      passed: true,
    });
    expect(state.review).toEqual([]);
    expect(state.mastery.ownership?.reason).toContain("Kontakt z przykładem");
  });

  it("treats an immediate review rating as a retention boundary", () => {
    let state = recordEvidence(
      base(),
      event({
        id: "code",
        kind: "fix",
        stepId: "code",
        evaluator: "tests",
        at: 1_000,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "prediction",
        kind: "prediction",
        stepId: "prediction",
        gate: true,
        at: 2_000,
      }),
    );
    const recallAt = 2_000 + DAY + 1;
    state = rateReview(state, "ownership", "good", recallAt - 60 * 60 * 1000);
    state = recordEvidence(
      state,
      event({
        id: "delayed",
        kind: "recall",
        stepId: "delayed",
        delayed: true,
        at: recallAt,
      }),
    );
    expect(state.mastery.ownership?.level).toBe("understood");
  });

  it("schedules ratings and separates due reviews from upcoming reviews", () => {
    let state = recordEvidence(
      base(),
      event({ id: "failed", passed: false, at: 1_000 }),
    );
    state = rateReview(state, "ownership", "good", 2_000);
    expect(dueReviews(state, 2_000)).toHaveLength(0);
    expect(dueReviews(state, 2_000 + DAY)).toHaveLength(1);
    state = rateReview(state, "ownership", "again", 2_000 + DAY);
    expect(dueReviews(state, 2_000 + DAY)).toHaveLength(1);
    expect(state.ratings.at(-1)?.rating).toBe("again");
  });

  it("builds one module criterion per unaided gate step and excludes rubric self-checks", () => {
    const lessons: Lesson[] = [
      {
        id: "memory",
        moduleId: "ownership",
        conceptIds: ["ownership"],
        competencyIds: [],
        prerequisites: [],
        title: "Memory",
        subtitle: "",
        minutes: 5,
        outcomes: [],
        misconceptions: [],
        transferTask: "",
        evidenceGate: "",
        sourceIds: [],
        steps: [
          {
            id: "gate",
            kind: "apply",
            title: "Gate",
            prompt: "",
            evidenceKind: "transfer",
            evidenceGate: true,
          },
          {
            id: "rubric",
            kind: "explain",
            title: "Explain",
            prompt: "",
            evidenceKind: "assessment",
            evidenceGate: true,
            evaluator: { kind: "rubric", criteria: ["ownership"] },
          },
        ],
      },
    ];
    const state = recordEvidence(
      base(),
      event({ id: "gate-event", stepId: "gate" }),
    );
    const result = moduleGate(state, lessons);
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0].passed).toBe(true);
    expect(result.passed).toBe(true);
  });

  it("does not let a Rust result satisfy a manifest module gate", () => {
    const lesson: Lesson = {
      id: "manifest-lesson",
      moduleId: "manifest-module",
      conceptIds: ["manifest-concept"],
      competencyIds: [],
      prerequisites: [],
      title: "Manifest",
      subtitle: "",
      minutes: 5,
      outcomes: [],
      misconceptions: [],
      transferTask: "",
      evidenceGate: "gate",
      sourceIds: [],
      steps: [
        {
          id: "gate",
          kind: "assessment",
          title: "Gate",
          prompt: "",
          evidenceKind: "assessment",
          evidenceGate: true,
          evaluator: {
            kind: "manifest-contract",
            contract: {
              document: "package",
              assertions: [{ kind: "path-present", path: ["package"] }],
            },
          },
        },
      ],
    };
    const courseModule: CourseModule = {
      id: "manifest-module",
      title: "",
      whyItMatters: "",
      capabilities: [],
      prerequisites: [],
      lessonIds: [lesson.id],
      exitGate: [],
      projectConnection: "",
      assessmentId: "manifest-lesson/gate",
      gateCriteria: [
        {
          id: "manifest",
          label: "Manifest",
          taskRefs: [{ lessonId: lesson.id, stepId: "gate" }],
        },
      ],
    };
    let state = recordEvidence(
      base(),
      event({
        id: "rust-result",
        lessonId: lesson.id,
        stepId: "gate",
        evaluator: "compilation",
      }),
      manifestPolicy,
    );
    expect(moduleGate(state, [lesson], courseModule).passed).toBe(false);
    state = recordEvidence(
      state,
      event({
        id: "manifest-result",
        lessonId: lesson.id,
        stepId: "gate",
        conceptIds: ["manifest-concept"],
        evaluator: "manifest-contract",
      }),
      manifestPolicy,
    );
    expect(moduleGate(state, [lesson], courseModule).passed).toBe(true);
  });

  it("passes a capability when a clean equivalent task succeeds after the primary was revealed", () => {
    const lessons: Lesson[] = [
      {
        id: "memory",
        moduleId: "ownership",
        conceptIds: ["ownership"],
        competencyIds: [],
        prerequisites: [],
        title: "Memory",
        subtitle: "",
        minutes: 5,
        outcomes: [],
        misconceptions: [],
        transferTask: "transfer",
        evidenceGate: "gate",
        sourceIds: [],
        steps: [
          {
            id: "gate",
            kind: "apply",
            title: "Gate",
            prompt: "",
            evidenceKind: "transfer",
            evidenceGate: true,
            evaluator: {
              kind: "choice",
              correct: "yes",
              explanations: { yes: "ok" },
            },
          },
        ],
      },
      {
        id: "assessment",
        moduleId: "ownership",
        conceptIds: ["ownership"],
        competencyIds: [],
        prerequisites: [],
        title: "Assessment",
        subtitle: "",
        minutes: 5,
        outcomes: [],
        misconceptions: [],
        transferTask: "transfer",
        evidenceGate: "gate",
        sourceIds: [],
        steps: [
          {
            id: "equivalent",
            kind: "assessment",
            title: "Equivalent",
            prompt: "",
            evidenceKind: "assessment",
            evaluator: {
              kind: "choice",
              correct: "yes",
              explanations: { yes: "ok" },
            },
          },
        ],
      },
    ];
    const courseModule: CourseModule = {
      id: "ownership",
      title: "",
      whyItMatters: "",
      capabilities: [],
      prerequisites: [],
      lessonIds: ["memory", "assessment"],
      exitGate: [],
      projectConnection: "",
      assessmentId: "assessment/equivalent",
      gateCriteria: [
        {
          id: "move-copy",
          label: "Move/Copy",
          taskRefs: [
            { lessonId: "memory", stepId: "gate" },
            { lessonId: "assessment", stepId: "equivalent" },
          ],
        },
      ],
    };
    let state = recordEvidence(
      base(),
      event({
        id: "revealed-primary",
        lessonId: "memory",
        stepId: "gate",
        hints: 2,
        revealed: true,
      }),
    );
    state = recordEvidence(
      state,
      event({
        id: "clean-equivalent",
        lessonId: "assessment",
        stepId: "equivalent",
        kind: "assessment",
        gate: false,
        at: 2_000,
      }),
    );
    const result = moduleGate(state, lessons, courseModule);
    expect(result.criteria).toEqual([{ label: "Move/Copy", passed: true }]);
    expect(result.passed).toBe(true);
    expect(
      moduleGate(state, lessons, courseModule, () => {
        throw new Error(
          "Uncounted criteria must not consult the assistance resolver",
        );
      }),
    ).toEqual(result);
    expect(
      state.events.find((candidate) => candidate.id === "revealed-primary"),
    ).toMatchObject({ hints: 2, revealed: true });
  });

  it("does not pass a module criterion from a rubric supplementary ref", () => {
    const lessons: Lesson[] = [
      {
        id: "memory",
        moduleId: "ownership",
        conceptIds: ["ownership"],
        competencyIds: [],
        prerequisites: [],
        title: "Memory",
        subtitle: "",
        minutes: 5,
        outcomes: [],
        misconceptions: [],
        transferTask: "transfer",
        evidenceGate: "gate",
        sourceIds: [],
        steps: [
          {
            id: "rubric",
            kind: "explain",
            title: "Rubric",
            prompt: "",
            evidenceKind: "recall",
            evaluator: { kind: "rubric", criteria: ["explain"] },
          },
        ],
      },
    ];
    const courseModule: CourseModule = {
      id: "ownership",
      title: "",
      whyItMatters: "",
      capabilities: [],
      prerequisites: [],
      lessonIds: ["memory"],
      exitGate: [],
      projectConnection: "",
      assessmentId: "memory/rubric",
      gateCriteria: [
        {
          id: "explanation",
          label: "Explanation",
          taskRefs: [],
          supplementaryStepRefs: [{ lessonId: "memory", stepId: "rubric" }],
        },
      ],
    };
    const state = recordEvidence(
      base(),
      event({
        id: "rubric-event",
        lessonId: "memory",
        stepId: "rubric",
        kind: "self-rating",
        evaluator: "rubric",
      }),
    );
    const result = moduleGate(state, lessons, courseModule);
    expect(result.criteria).toEqual([{ label: "Explanation", passed: false }]);
    expect(result.passed).toBe(false);
  });

  it("requires a completed rubric supplement alongside an independent gate task", () => {
    const lessons: Lesson[] = [
      {
        id: "memory",
        moduleId: "ownership",
        conceptIds: ["ownership"],
        competencyIds: [],
        prerequisites: [],
        title: "Memory",
        subtitle: "",
        minutes: 5,
        outcomes: [],
        misconceptions: [],
        transferTask: "transfer",
        evidenceGate: "gate",
        sourceIds: [],
        steps: [
          {
            id: "task",
            kind: "assessment",
            title: "Task",
            prompt: "",
            evidenceKind: "assessment",
            evaluator: {
              kind: "choice",
              correct: "yes",
              explanations: { yes: "ok" },
            },
          },
          {
            id: "rubric",
            kind: "explain",
            title: "Rubric",
            prompt: "",
            evidenceKind: "recall",
            evaluator: { kind: "rubric", criteria: ["explain"] },
          },
        ],
      },
    ];
    const courseModule: CourseModule = {
      id: "ownership",
      title: "",
      whyItMatters: "",
      capabilities: [],
      prerequisites: [],
      lessonIds: ["memory"],
      exitGate: [],
      projectConnection: "",
      assessmentId: "memory/task",
      gateCriteria: [
        {
          id: "explanation",
          label: "Explanation",
          taskRefs: [{ lessonId: "memory", stepId: "task" }],
          supplementaryStepRefs: [{ lessonId: "memory", stepId: "rubric" }],
        },
      ],
    };
    let state = recordEvidence(
      base(),
      event({
        id: "task",
        lessonId: "memory",
        stepId: "task",
        kind: "assessment",
      }),
    );
    expect(moduleGate(state, lessons, courseModule).passed).toBe(false);
    state = recordEvidence(
      state,
      event({
        id: "rubric",
        lessonId: "memory",
        stepId: "rubric",
        kind: "self-rating",
        evaluator: "rubric",
        at: 2_000,
      }),
    );
    expect(moduleGate(state, lessons, courseModule).passed).toBe(true);
  });
});

it("opening every gate task does not satisfy any module capability", () => {
  let state = createInitialState();
  for (const lesson of curriculum)
    for (const step of lesson.steps) {
      state = recordLessonExposure(state, {
        lessonId: lesson.id,
        stepId: step.id,
        conceptIds: lesson.conceptIds,
        at: 1000,
      });
    }
  const result = moduleGate(state, curriculum, ownershipModule);
  expect(result.criteria.some((criterion) => criterion.passed)).toBe(false);
  expect(result.passed).toBe(false);
});

// Synthetic authored definitions resolve exact source, evaluator and kind;
// qualification/scoring remains entirely in the production engine.
const currentDefinitions = {
  append: {
    version: 2,
    conceptIds: ["mutable-borrow"],
    codingTaskId: "append",
  },
  appendCopy: {
    version: 2,
    conceptIds: ["mutable-borrow", "shared-borrow"],
    codingTaskId: "append",
  },
  replace: {
    version: 2,
    conceptIds: ["mutable-borrow"],
    codingTaskId: "replace",
  },
  surround: {
    version: 2,
    conceptIds: ["mutable-borrow"],
    codingTaskId: "surround",
  },
  choice: { version: 2, conceptIds: ["mutable-borrow"] },
  recallAgain: {
    version: 2,
    conceptIds: ["mutable-borrow"],
    codingTaskId: "recall-only",
  },
  recall: {
    version: 2,
    conceptIds: ["mutable-borrow"],
    codingTaskId: "recall-only",
  },
};
const calibratedPolicy: EvidencePolicy = {
  definitionForTask: (lessonId, stepId) =>
    lessonId === "authored"
      ? currentDefinitions[stepId as keyof typeof currentDefinitions]
      : undefined,
  artifactForConcept: () => "rust-code",
  calibrationForConcept: (id) =>
    ["mutable-borrow", "shared-borrow", "copy-semantics"].includes(id)
      ? { version: 2, minimumCodingTasks: 2 }
      : undefined,
  definitionForEvent: (candidate) => {
    const definition =
      currentDefinitions[candidate.stepId as keyof typeof currentDefinitions];
    if (!definition || candidate.lessonId !== "authored") return undefined;
    const evaluator = candidate.stepId === "choice" ? "choice" : "tests";
    const kind = candidate.stepId.startsWith("recall")
      ? "recall"
      : "assessment";
    if (candidate.evaluator !== evaluator || candidate.kind !== kind)
      return undefined;
    return definition;
  },
};
const currentEvent = (
  stepId: keyof typeof currentDefinitions,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent =>
  event({
    id: stepId,
    lessonId: "authored",
    stepId,
    conceptIds: [...currentDefinitions[stepId].conceptIds],
    evidenceVersion: 2,
    kind: stepId.startsWith("recall") ? "recall" : "assessment",
    evaluator: stepId === "choice" ? "choice" : "tests",
    ...overrides,
  });
const recordCurrent = (state: UserState, candidate: EvidenceEvent) =>
  recordEvidence(state, candidate, calibratedPolicy);
const twoTasks = () =>
  recordCurrent(
    recordCurrent(base(), currentEvent("append")),
    currentEvent("replace", { at: 2000 }),
  );

describe("versioned independent evidence", () => {
  it("does not count recognition as a second coding task", () => {
    const state = recordCurrent(
      recordCurrent(base(), currentEvent("append")),
      currentEvent("choice"),
    );
    expect(state.mastery["mutable-borrow"].level).toBe("practiced");
    expect(
      independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
    ).toEqual(["append"]);
  });

  it("requires distinct authored task families, even across refs and event IDs", () => {
    let state = recordCurrent(base(), currentEvent("append"));
    state = recordCurrent(
      state,
      currentEvent("appendCopy", { id: "revision", at: 2000 }),
    );
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("practiced");
    expect(
      independentCodingTaskIds(state, "shared-borrow", calibratedPolicy),
    ).toEqual(["append"]);
    state = recordCurrent(state, currentEvent("replace", { at: 3000 }));
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("understood");
  });

  it.each([{ hints: 1 }, { revealed: true }])(
    "needs two fresh tasks after an assisted primary %o",
    (assistance) => {
      let state = recordCurrent(base(), currentEvent("append", assistance));
      state = recordCurrent(state, currentEvent("replace"));
      expect(
        independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
      ).toEqual(["replace"]);
      expect(state.mastery["mutable-borrow"].level).toBe("practiced");
      state = recordCurrent(state, currentEvent("surround"));
      expect(state.mastery["mutable-borrow"].level).toBe("understood");
    },
  );

  it.each([
    { evidenceVersion: undefined },
    { evidenceVersion: 1 },
    { evidenceVersion: 3 },
    { conceptIds: ["mutable-borrow", "copy-semantics"] },
    { evaluator: "exact-output" as const },
    { stepId: "wrong" },
    { lessonId: "wrong" },
    { kind: "transfer" as const },
  ])(
    "keeps mismatched evidence raw without current assessment or scheduling %o",
    (mismatch) => {
      const candidate = currentEvent("append", mismatch);
      const state = recordCurrent(base(), candidate);
      expect(state.events).toEqual([candidate]);
      expect(state.review).toEqual([]);
      expect(["understood", "retained", "practiced"]).not.toContain(
        state.mastery["mutable-borrow"]?.level,
      );
      expect(
        independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
      ).toEqual([]);
      expect(
        deriveConceptMastery(state, "copy-semantics", calibratedPolicy).level,
      ).not.toBe("understood");
    },
  );

  it("interprets stale high caches purely without changing history or saved progress", () => {
    const state = base();
    state.events = [
      currentEvent("append", { evidenceVersion: undefined }),
      currentEvent("choice", {
        evidenceVersion: undefined,
        id: "legacy-choice",
      }),
    ];
    state.mastery["mutable-borrow"] = {
      level: "retained",
      reason: "old proof",
      updatedAt: 9999999,
    };
    state.steps["authored:append"] = {
      ...createStepProgress("saved draft"),
      completed: true,
      hints: 2,
      revealed: true,
    };
    state.review = [
      {
        conceptId: "mutable-borrow",
        dueAt: 100,
        intervalDays: 2,
        attempts: 1,
        reason: "old",
      },
    ];
    state.ratings = [{ conceptId: "mutable-borrow", rating: "good", at: 3000 }];
    const before = structuredClone(state);
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy),
    ).toMatchObject({ level: "exposed", updatedAt: 3000 });
    expect(state).toEqual(before);
    const restored = importState(exportState(state));
    expect(restored).toEqual(before);
    expect(
      deriveConceptMastery(restored, "mutable-borrow", calibratedPolicy).level,
    ).toBe("exposed");
  });

  it("records delayed executable retention using only history, then preserves it across roundtrip and later contact", () => {
    let state = twoTasks();
    const at = 2000 + DAY + 1;
    state = recordCurrent(state, currentEvent("recall", { delayed: true, at }));
    expect(state.review[0].dueAt).toBeGreaterThan(at);
    expect(state.mastery["mutable-borrow"]).toMatchObject({
      level: "retained",
      updatedAt: at,
    });
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("retained");
    state = importState(exportState(state));
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("retained");
    state = recordLessonExposure(
      state,
      {
        conceptIds: ["mutable-borrow"],
        lessonId: "authored",
        stepId: "choice",
        at: at + 1,
      },
      calibratedPolicy,
    );
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("retained");
  });

  it.each([
    { at: 2000 + DAY },
    { hints: 1 },
    { revealed: true },
    { delayed: false },
    { evaluator: "choice" as const },
    { passed: false },
    { evidenceVersion: 3 },
  ])("does not retain from ineligible recall %o", (override) => {
    const state = recordCurrent(
      twoTasks(),
      currentEvent("recall", {
        delayed: true,
        at: 2000 + DAY + 1,
        ...override,
      }),
    );
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("understood");
  });

  it("recall sessions never supply a missing primary task", () => {
    let state = recordCurrent(base(), currentEvent("append"));
    state = recordCurrent(
      state,
      currentEvent("recall", { delayed: true, at: 1000 + DAY + 1 }),
    );
    state = recordCurrent(
      state,
      currentEvent("recall", {
        id: "another-session",
        delayed: true,
        at: 1000 + 2 * DAY + 2,
      }),
    );
    expect(
      independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
    ).toEqual(["append"]);
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("practiced");
  });

  it.each([
    "recent exposure",
    "same-time exposure",
    "recent rating",
    "same-time rating",
  ])("includes %s in the quiet interval", (contact) => {
    let state = twoTasks();
    const at = 2000 + DAY + 1;
    const contactAt = contact.startsWith("same-time") ? at : at - 1;
    if (contact.endsWith("rating"))
      state = rateReview(state, "mutable-borrow", "good", contactAt);
    else
      state = recordLessonExposure(
        state,
        {
          conceptIds: ["mutable-borrow"],
          lessonId: "authored",
          stepId: "append",
          at: contactAt,
        },
        calibratedPolicy,
      );
    state = recordCurrent(state, currentEvent("recall", { delayed: true, at }));
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("understood");
  });

  it("ignores future ratings and mutable cache timestamps in historical retention", () => {
    let state = twoTasks();
    state = rateReview(state, "mutable-borrow", "good", 2000 + 10 * DAY);
    state = recordCurrent(
      state,
      currentEvent("recall", { delayed: true, at: 2000 + DAY + 1 }),
    );
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy),
    ).toMatchObject({ level: "retained", updatedAt: 2000 + 10 * DAY });
  });

  it("retains empty attribution without an award or review", () => {
    const candidate = currentEvent("append", { conceptIds: [] });
    const state = recordCurrent(base(), candidate);
    expect(state.events).toEqual([candidate]);
    expect(state.mastery).toEqual({});
    expect(state.review).toEqual([]);
  });
});

it("rejects surplus uncalibrated attribution for awards and unrelated reviews", () => {
  const state = recordCurrent(
    base(),
    currentEvent("append", {
      conceptIds: ["mutable-borrow", "unrelated-concept"],
    }),
  );
  expect(state.review).toEqual([]);
  expect(
    deriveConceptMastery(state, "unrelated-concept", calibratedPolicy).level,
  ).toBe("new");
  expect(state.events[0].conceptIds).toEqual([
    "mutable-borrow",
    "unrelated-concept",
  ]);
});

it("keeps a forged versioned event attributed only to an unrelated concept raw and neutral", () => {
  const state = recordCurrent(
    base(),
    currentEvent("append", { conceptIds: ["unrelated-concept"] }),
  );
  expect(state.review).toEqual([]);
  expect(
    deriveConceptMastery(state, "unrelated-concept", calibratedPolicy).level,
  ).toBe("new");
});

describe("chronological task-family assistance", () => {
  it("preserves a clean success earned before later assistance", () => {
    let state = recordCurrent(base(), currentEvent("append"));
    state = recordCurrent(
      state,
      currentEvent("append", { id: "later-assisted", hints: 1, at: 2000 }),
    );
    state = recordCurrent(state, currentEvent("replace", { at: 3000 }));
    expect(
      independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
    ).toEqual(["append", "replace"]);
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("understood");
    state.steps["authored:append"] = {
      ...createStepProgress(),
      hints: 2,
      revealed: true,
    };
    expect(
      independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
    ).toEqual(["append", "replace"]);
  });
  it.each(["append", "appendCopy"] as const)(
    "blocks later clean flags after stale assistance on %s",
    (stepId) => {
      let state = recordCurrent(
        base(),
        currentEvent(stepId, {
          id: "prior-assisted",
          hints: 1,
          evidenceVersion: undefined,
        }),
      );
      state = importState(exportState(state));
      const before = structuredClone(state.events);
      state = recordCurrent(state, currentEvent("append", { at: 2000 }));
      expect(
        independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
      ).toEqual([]);
      expect(state.events.slice(0, 1)).toEqual(before);
      state = recordCurrent(state, currentEvent("replace", { at: 3000 }));
      expect(
        independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
      ).toEqual(["replace"]);
    },
  );
  it.each([false, true])(
    "neutral exposure taints a task only when revealed=%s",
    (revealed) => {
      let state = recordLessonExposure(
        base(),
        {
          conceptIds: ["mutable-borrow"],
          lessonId: "authored",
          stepId: "appendCopy",
          at: 1000,
          revealed,
        },
        calibratedPolicy,
      );
      state = recordCurrent(state, currentEvent("append", { at: 2000 }));
      expect(
        independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
      ).toEqual(revealed ? [] : ["append"]);
    },
  );
  it("does not treat revised evidence or review IDs as clearing earlier recall assistance", () => {
    let state = recordCurrent(
      twoTasks(),
      currentEvent("recall", {
        id: "old-recall",
        evidenceVersion: 1,
        hints: 1,
        at: 3000,
      }),
    );
    state = recordCurrent(
      state,
      currentEvent("recall", {
        id: "new-session",
        delayed: true,
        at: 3000 + DAY + 1,
      }),
    );
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("understood");
    expect(state.review[0].reason).not.toMatch(/Samodzielne odtworzenie/);
  });
});

it.each([24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000 + 1])(
  "permits separate unaided review after old reveal only beyond quiet interval %i",
  (elapsed) => {
    let state = recordCurrent(
      twoTasks(),
      currentEvent("recall", {
        id: "revealed-session",
        revealed: true,
        at: 3000,
      }),
    );
    state = recordCurrent(
      state,
      currentEvent("recallAgain", { delayed: true, at: 3000 + elapsed }),
    );
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe(elapsed > DAY ? "retained" : "understood");
    expect(
      independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
    ).toEqual(["append", "replace"]);
  },
);

it("passes authored calibration from concepts into the evidence policy", () => {
  const policy = evidencePolicyForConcepts([
    {
      id: "calibrated",
      title: "",
      prerequisites: [],
      competencyIds: [],
      reviewPrompt: "",
      reviewAnswer: "",
      distinguish: "",
      evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
    },
  ]);
  const state = base();
  state.mastery.calibrated = {
    level: "retained",
    reason: "cached",
    updatedAt: 999,
  };
  expect(deriveConceptMastery(state, "calibrated", policy)).toMatchObject({
    level: "new",
    updatedAt: 0,
  });
});

it("retains one-argument eligibility while rejecting wrong artifacts with context", () => {
  const rust = event({ conceptIds: ["manifest-concept"], evaluator: "tests" });
  expect(isIndependentSuccess(rust)).toBe(true);
  expect(isIndependentSuccess(rust, "manifest-concept", manifestPolicy)).toBe(
    false,
  );
});

it.each(["timeout", "infrastructure-error"] as const)(
  "does not award evidence from an infrastructure-only %s attempt",
  (status) => {
    const state = base();
    state.steps["authored:append"] = {
      ...createStepProgress("saved"),
      attempts: [
        {
          at: 1000,
          code: "saved",
          passed: false,
          feedback: status,
          result: {
            status,
            stdout: "",
            stderr: "",
            diagnostics: [],
            durationMs: 1,
          },
        },
      ],
    };
    expect(
      deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
    ).toBe("new");
    expect(
      independentCodingTaskIds(state, "mutable-borrow", calibratedPolicy),
    ).toEqual([]);
    expect(state.events).toEqual([]);
  },
);

it("keeps current proof after a later failed primary", () => {
  const state = recordCurrent(
    twoTasks(),
    currentEvent("surround", { passed: false, at: 3000 }),
  );
  expect(
    deriveConceptMastery(state, "mutable-borrow", calibratedPolicy).level,
  ).toBe("understood");
});
