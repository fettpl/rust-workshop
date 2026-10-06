import { describe, expect, it } from "vitest";
import { lessons as curriculum, ownershipModule } from "@/content/course";
import type {
  CourseModule,
  EvidenceEvent,
  Lesson,
  UserState,
} from "@/domain/types";
import { createInitialState } from "@/persistence/state";
import {
  dueReviews,
  evidencePolicyForConcepts,
  moduleGate,
  rateReview,
  recordEvidence,
  recordLessonExposure,
} from "./learning";

const DAY = 24 * 60 * 60 * 1000;
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
    const state = recordEvidence(
      base(),
      event({ kind: "prediction", evaluator: "expected-error", passed: true }),
    );
    expect(state.mastery.ownership?.level).toBe("new");
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
    const campaignPolicy = evidencePolicyForConcepts([
      {
        id: "fuzz-campaign-evidence",
        title: "Fuzz campaign",
        prerequisites: [],
        competencyIds: [],
        reviewPrompt: "",
        reviewAnswer: "",
        distinguish: "",
        evidenceArtifact: "rust-code",
      },
    ]);
    let state = recordEvidence(
      base(),
      event({
        id: "campaign-gate",
        conceptIds: ["fuzz-campaign-evidence"],
        lessonId: "fuzz-campaign-evidence",
        stepId: "fuzz-campaign-evidence-gate",
        kind: "assessment",
        evaluator: "tests",
      }),
      campaignPolicy,
    );
    state = recordEvidence(
      state,
      event({
        id: "campaign-blank",
        conceptIds: ["fuzz-campaign-evidence"],
        lessonId: "fuzz-campaign-evidence",
        stepId: "fuzz-campaign-evidence-blank",
        kind: "assessment",
        evaluator: "tests",
        at: 2_000,
      }),
      campaignPolicy,
    );
    expect(state.mastery["fuzz-campaign-evidence"]?.level).toBe("understood");
    expect(state.review).toEqual([
      expect.objectContaining({
        conceptId: "fuzz-campaign-evidence",
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
