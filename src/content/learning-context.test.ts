import { describe, expect, it } from "vitest";
import {
  concepts,
  delayedReviewExercises,
  lessons,
  projects,
  reviewExercises,
  shortReviewExercises,
} from "./course";
import { ownershipModule } from "./catalog";
import {
  recordCourseEvidence,
  evidenceForLessonStep,
  evidenceForReview,
  courseMastery,
  courseReviewQueue,
  courseEvidenceSummary,
  courseCompetencyProgress,
  assistanceForLessonStep,
  revealCourseProjectPackageVariant,
  courseDelayedReviewEligibility,
  courseEvidencePolicy,
  resolveReviewExercise,
  reviewExerciseIdForSelection,
  reviewPurposeForExercise,
  reviewExerciseIdForOrigin,
} from "./learning-context";
import type { EvidenceEvent, ProjectPackage, UserState } from "@/domain/types";
import { DAY, independentCodingTaskIds, moduleGate } from "@/engine/learning";
import {
  createInitialState,
  createStepProgress,
  stepKey,
  exportState,
  importState,
} from "@/persistence/state";

const rustEvent = (overrides: Partial<EvidenceEvent> = {}): EvidenceEvent => ({
  id: "course-rust",
  conceptIds: ["ownership"],
  lessonId: "memory",
  stepId: "gate",
  kind: "fix",
  passed: true,
  hints: 0,
  revealed: false,
  at: 1_000,
  ...overrides,
});

describe("course learning context", () => {
  it("preserves every current review at its due boundary and retains unavailable imported items for export", () => {
    const now = 2 * DAY;
    const state = createInitialState();
    state.review = [...concepts.map((concept) => concept.id), "retired-concept"].map(
      (conceptId, index) => ({
        conceptId,
        dueAt: index % 2 === 0 ? now : now + DAY,
        intervalDays: 1,
        attempts: 1,
        reason: "scheduled",
      }),
    );
    const original = exportState(state);
    const restored = importState(original);
    const { due, upcoming } = courseReviewQueue(restored, now);
    expect(due.every((item) => item.dueAt === now)).toBe(true);
    expect(upcoming.every((item) => item.dueAt === now + DAY)).toBe(true);
    expect([...due, ...upcoming].map((item) => item.conceptId).sort()).toEqual(
      concepts.map((concept) => concept.id).sort(),
    );
    expect(courseReviewQueue(restored, now + DAY).due).toHaveLength(concepts.length);
    expect(restored.review).toEqual(state.review);
  });

  it("uses authored policy and does not let a manifest evaluator prove a Rust concept", () => {
    const state = recordCourseEvidence(
      createInitialState(),
      rustEvent({ id: "wrong-artifact", evaluator: "manifest-contract" }),
    );
    expect(state.events).toHaveLength(1);
    expect(state.mastery.ownership?.level ?? "new").toBe("new");
  });

  it("keeps package reveal semantics behind the course facade", () => {
    const project: ProjectPackage = {
      id: "context-package",
      title: "Pakiet",
      description: "Pakiet testowy",
      instructions: ["cargo test"],
      revealStepRefs: [
        { lessonId: "todo-session-project", stepId: "session-debug" },
      ],
      starterRevealStepRefs: [
        { lessonId: "todo-session-project", stepId: "session-blank" },
      ],
      files: [
        {
          path: "Cargo.toml",
          starter: '[package]\nname = "context-package"\nversion = "0.1.0"\n',
        },
        { path: "src/lib.rs", starter: "pub fn run() {}" },
      ],
    };
    const starter = revealCourseProjectPackageVariant(
      createInitialState(),
      project,
      lessons,
      "starter",
      2_000,
    );
    expect(
      starter.steps[stepKey("todo-session-project", "session-blank")],
    ).toMatchObject({
      revealed: true,
    });
    expect(
      starter.steps[stepKey("todo-session-project", "session-debug")],
    ).toBeUndefined();
    const solution = revealCourseProjectPackageVariant(
      starter,
      project,
      lessons,
      "solution",
      3_000,
    );
    expect(solution.events).toHaveLength(2);
  });

  it("has authored manifest concepts once the Cargo curriculum is registered", () => {
    const manifestConcepts = concepts.filter(
      (concept) => concept.evidenceArtifact === "manifest",
    );
    expect(manifestConcepts.length).toBeGreaterThan(0);
    const concept = manifestConcepts[0];
    const event = rustEvent({
      id: "manifest-wrong-artifact",
      conceptIds: [concept.id],
      evaluator: "tests",
    });
    const state = recordCourseEvidence(createInitialState(), event);
    expect(state.mastery[concept.id]?.level ?? "new").toBe("new");
  });

  it("keeps manifest retention after later authored exposure", () => {
    const concept = concepts.find(
      (candidate) => candidate.evidenceArtifact === "manifest",
    );
    expect(concept).toBeDefined();
    const conceptId = concept!.id;
    const makeEvent = (id: string, at: number): EvidenceEvent => ({
      id,
      conceptIds: [conceptId],
      lessonId: "cargo-dependency-contract",
      stepId: id,
      kind:
        id === "recall"
          ? "recall"
          : id === "second"
            ? "assessment"
            : "transfer",
      passed: true,
      hints: 0,
      revealed: false,
      at,
      delayed: id === "recall" ? true : undefined,
      evaluator: "manifest-contract",
    });
    let state = recordCourseEvidence(
      createInitialState(),
      makeEvent("first", 1_000),
    );
    state = recordCourseEvidence(state, makeEvent("second", 2_000));
    state = recordCourseEvidence(
      state,
      makeEvent("recall", 2_000 + 24 * 60 * 60 * 1000 + 1),
    );
    expect(state.mastery[conceptId]?.level).toBe("retained");
    state = recordLaterExposure(state, conceptId);
    expect(state.mastery[conceptId]?.level).toBe("retained");
  });

  it("exposes Frame starter refs while leaving each independent blank available", () => {
    const frame = projects.find((project) => project.id === "frame-protocol");
    expect(frame?.package?.starterRevealStepRefs).toHaveLength(4);
    const state = revealCourseProjectPackageVariant(
      createInitialState(),
      frame!.package!,
      lessons,
      "starter",
      1_000,
    );
    expect(state.events).toHaveLength(4);
    expect(
      state.events.every(
        (event) => event.kind === "exposure" && event.revealed,
      ),
    ).toBe(true);
    expect(
      state.steps[
        stepKey("cargo-dependency-contract", "cargo-dependency-contract-blank")
      ],
    ).toBeUndefined();
  });
});

function recordLaterExposure(
  state: ReturnType<typeof createInitialState>,
  conceptId: string,
) {
  return recordCourseEvidence(state, {
    id: "later-exposure",
    conceptIds: [conceptId],
    lessonId: "cargo-dependency-contract",
    stepId: "later-exposure",
    kind: "exposure",
    passed: true,
    hints: 0,
    revealed: true,
    at: 2_000 + 24 * 60 * 60 * 1000 + 2,
  });
}

const day = 24 * 60 * 60 * 1000;
function authoredEvent(
  lessonId: string,
  stepId: string,
  at = 1_000,
): EvidenceEvent {
  const lesson = lessons.find((item) => item.id === lessonId)!;
  const step = lesson.steps.find((item) => item.id === stepId)!;
  return rustEvent({
    id: `${lessonId}/${stepId}/${at}`,
    lessonId,
    stepId,
    at,
    conceptIds: [...step.evidence!.conceptIds],
    evidenceVersion: step.evidence!.version,
    evaluator: step.evaluator!.kind,
    kind: step.evaluator!.kind === "rubric" ? "self-rating" : step.evidenceKind,
  });
}
function twoPrimaryTasks() {
  let state = recordCourseEvidence(
    createInitialState(),
    authoredEvent("borrow-intro", "borrow-conflict"),
  );
  state = recordCourseEvidence(
    state,
    authoredEvent("borrow-intro", "borrow-mutable-run", 2_000),
  );
  return state;
}
function reviewEvent(
  at: number,
  overrides: Partial<EvidenceEvent> = {},
): EvidenceEvent {
  return rustEvent({
    id: `recall/${at}`,
    lessonId: "review",
    stepId: "mutable-borrow:session-a",
    kind: "recall",
    evaluator: "tests",
    conceptIds: ["mutable-borrow"],
    evidenceVersion: 2,
    delayed: true,
    at,
    ...overrides,
  });
}
describe("current authored ownership evidence", () => {
  it("emits exact lesson metadata only for submissions with an uncalibrated fallback", () => {
    const lesson = lessons.find((item) => item.id === "move-copy-discovery")!;
    const step = lesson.steps.find((item) => item.id === "move-error")!;
    expect(evidenceForLessonStep(lesson, step)).toEqual({
      conceptIds: ["move-semantics"],
      evidenceVersion: 2,
    });
    const nonclaim = lessons
      .filter((item) => item.moduleId === "ownership")
      .flatMap((item) => item.steps)
      .find((item) => item.evidence?.conceptIds.length === 0)!;
    expect(evidenceForLessonStep(lesson, nonclaim)).toEqual({
      conceptIds: [],
      evidenceVersion: 2,
    });
    expect(
      evidenceForLessonStep(lessons[0], {
        ...lessons[0].steps[0],
        evidence: undefined,
      }),
    ).toEqual({ conceptIds: lessons[0].conceptIds });
    expect(
      evidenceForReview("mutable-borrow", reviewExercises["mutable-borrow"]),
    ).toEqual({ conceptIds: ["mutable-borrow"], evidenceVersion: 2 });
  });

  it("keeps broad legacy/cache/completion/drafts unchanged while deriving current labels", () => {
    const state = createInitialState();
    state.events = [authoredEvent("move-copy-discovery", "move-error")];
    delete state.events[0].evidenceVersion;
    state.events[0].conceptIds = ["move-semantics", "copy-semantics"];
    state.mastery["copy-semantics"] = {
      level: "retained",
      reason: "old cache",
      updatedAt: 55,
    };
    state.steps[stepKey("move-copy-discovery", "move-error")] = {
      ...createStepProgress("saved legacy code"),
      completed: true,
      hints: 2,
      revealed: true,
    };
    const before = structuredClone(state);
    expect(courseMastery(state, "copy-semantics").level).toBe("exposed");
    expect(courseEvidenceSummary(state, "copy-semantics")).toMatchObject({
      qualifyingCodingTasks: 0,
      requiredCodingTasks: 2,
      hasLegacyEvidence: true,
    });
    const imported = importState(exportState(state));
    expect(imported.events).toEqual(before.events);
    expect(imported.mastery).toEqual(before.mastery);
    expect(imported.steps).toEqual(before.steps);
    expect(state).toEqual(before);
  });

  it("records Move without spilling practice or queue entries into Copy", () => {
    const event = authoredEvent("move-copy-discovery", "move-error");
    const state = recordCourseEvidence(createInitialState(), event);
    expect(courseMastery(state, "move-semantics").level).toBe("practiced");
    expect(courseMastery(state, "copy-semantics").level).toBe("new");
    expect(state.review.map((item) => item.conceptId)).toEqual([
      "move-semantics",
    ]);
  });

  it.each([
    { stepId: "missing" },
    { lessonId: "missing" },
    { evaluator: "exact-output" as const },
    { kind: "transfer" as const },
    { evidenceVersion: 1 },
    { evidenceVersion: 3 },
    { conceptIds: ["mutable-borrow", "copy-semantics"] },
    { conceptIds: [] },
  ])("retains malformed current evidence raw without awards: %j", (changes) => {
    const event = {
      ...authoredEvent("borrow-intro", "borrow-conflict"),
      ...changes,
    };
    const state = recordCourseEvidence(createInitialState(), event);
    expect(state.events).toEqual([event]);
    expect(state.review).toEqual([]);
    expect(
      courseEvidenceSummary(state, "mutable-borrow").qualifyingCodingTasks,
    ).toBe(0);
  });

  it("preserves an intentional empty claim without mastery or review awards", () => {
    const lesson = lessons.find((item) =>
      item.steps.some((step) => step.evidence?.conceptIds.length === 0),
    )!;
    const step = lesson.steps.find(
      (item) => item.evidence?.conceptIds.length === 0,
    )!;
    const event = authoredEvent(lesson.id, step.id);
    const state = recordCourseEvidence(createInitialState(), event);
    expect(state.events).toEqual([event]);
    expect(state.mastery).toEqual({});
    expect(state.review).toEqual([]);
    const imported = importState(exportState(state));
    expect(imported.events).toEqual([event]);
  });

  it("counts actual primary families and shares the conservative competency policy", () => {
    const state = twoPrimaryTasks();
    expect(courseEvidenceSummary(state, "mutable-borrow")).toMatchObject({
      qualifyingCodingTasks: 2,
      requiredCodingTasks: 2,
      mastery: { level: "understood" },
    });
    const repeated = recordCourseEvidence(state, {
      ...state.events[0],
      id: "repeat",
      at: 3_000,
    });
    expect(
      courseEvidenceSummary(repeated, "mutable-borrow").qualifyingCodingTasks,
    ).toBe(2);
    const competencyId = concepts.find((item) => item.id === "mutable-borrow")!
      .competencyIds[0];
    expect(
      courseCompetencyProgress(repeated, competencyId).independentTasks,
    ).toBe(2);
  });

  it("retains through the real recorder after queue/cache changes and raw state roundtrip", () => {
    const state = recordCourseEvidence(
      twoPrimaryTasks(),
      reviewEvent(2_000 + day + 1),
    );
    expect(state.mastery["mutable-borrow"].level).toBe("retained");
    expect(state.mastery["mutable-borrow"].updatedAt).toBe(2_000 + day + 1);
    expect(
      state.review.find((item) => item.conceptId === "mutable-borrow")!.dueAt,
    ).toBeGreaterThan(2_000 + day + 1);
    expect(courseMastery(state, "mutable-borrow").level).toBe("retained");
    const imported = importState(exportState(state));
    expect(imported.events).toEqual(state.events);
    expect(imported.mastery).toEqual(state.mastery);
    expect(courseMastery(imported, "mutable-borrow").level).toBe("retained");
  });

  it.each([
    { at: 2_000 + day },
    { revealed: true },
    { stepId: "copy-semantics:session-a" },
    { stepId: "mutable-borrow" },
    { stepId: "mutable-borrow:" },
    { evaluator: "choice" as const },
    { conceptIds: ["mutable-borrow", "shared-borrow"] },
  ])(
    "does not retain a mismatched or non-independent review: %j",
    (changes) => {
      const state = recordCourseEvidence(
        twoPrimaryTasks(),
        reviewEvent(2_000 + day + 1, changes),
      );
      expect(courseMastery(state, "mutable-borrow").level).toBe("understood");
      expect(
        courseEvidenceSummary(state, "mutable-borrow").qualifyingCodingTasks,
      ).toBe(2);
    },
  );

  it("includes neutral and same-time preceding exposure in the review quiet interval", () => {
    for (const at of [2_000 + day, 2_000 + day + 1]) {
      const contact = rustEvent({
        conceptIds: ["mutable-borrow"],
        kind: "exposure",
        at,
      });
      const state = recordCourseEvidence(
        recordCourseEvidence(twoPrimaryTasks(), contact),
        reviewEvent(2_000 + day + 1),
      );
      expect(courseMastery(state, "mutable-borrow").level).toBe("understood");
    }
    const state = recordCourseEvidence(
      recordCourseEvidence(
        createInitialState(),
        authoredEvent("borrow-intro", "borrow-conflict"),
      ),
      reviewEvent(1_000 + day + 1),
    );
    expect(courseMastery(state, "mutable-borrow").level).not.toBe("retained");
  });
});

describe("saved assistance at the current primary submission boundary", () => {
  const sibling = lessons.find((item) => item.id === "adversarial-no-clone")!;
  const siblingStep = sibling.steps.find(
    (item) => item.id === "adversarial-code",
  )!;
  const target = lessons.find((item) => item.id === "scenario-assessment")!;
  const targetStep = target.steps.find(
    (item) => item.id === "assessment-repair",
  )!;
  function submit(
    state: ReturnType<typeof createInitialState>,
    lesson = target,
    step = targetStep,
    at = 2_000,
  ) {
    return recordCourseEvidence(state, {
      ...authoredEvent(lesson.id, step.id, at),
      ...assistanceForLessonStep(state, lesson, step),
    });
  }
  it.each([
    { hints: 1, revealed: false },
    { hints: 0, revealed: true },
  ])(
    "inherits imported sibling assistance in each new event without rewriting history: %j",
    (flags) => {
      const raw = createInitialState();
      raw.steps[stepKey(sibling.id, siblingStep.id)] = {
        ...createStepProgress("legacy sibling draft"),
        completed: true,
        ...flags,
      };
      const imported = importState(exportState(raw));
      expect(imported.steps).toEqual(raw.steps);
      const before = structuredClone(imported);
      const next = submit(imported);
      expect(next.events.at(-1)).toMatchObject(flags);
      expect(
        courseEvidenceSummary(next, "shared-borrow").qualifyingCodingTasks,
      ).toBe(0);
      expect(
        courseEvidenceSummary(next, "ownership-repair").qualifyingCodingTasks,
      ).toBe(0);
      expect(next.steps).toEqual(before.steps);
      expect(imported).toEqual(before);
      expect(importState(exportState(next)).events).toEqual(next.events);
    },
  );
  it("preserves clean credit earned before sibling help and permits a different fresh family", () => {
    const state = submit(createInitialState(), target, targetStep, 1_000);
    state.steps[stepKey(sibling.id, siblingStep.id)] = {
      ...createStepProgress("later draft"),
      hints: 2,
      revealed: true,
    };
    const after = submit(state);
    expect(after.events[0]).toMatchObject({ hints: 0, revealed: false });
    expect(after.events[1]).toMatchObject({ hints: 2, revealed: true });
    expect(
      courseEvidenceSummary(after, "shared-borrow").qualifyingCodingTasks,
    ).toBe(1);
    const mutableLesson = lessons.find((item) => item.id === "borrow-intro")!;
    const mutableStep = mutableLesson.steps.find(
      (item) => item.id === "borrow-conflict",
    )!;
    const fresh = submit(after, mutableLesson, mutableStep);
    expect(fresh.events.at(-1)).toMatchObject({ hints: 0, revealed: false });
    expect(
      courseEvidenceSummary(fresh, "mutable-borrow").qualifyingCodingTasks,
    ).toBe(1);
  });
  it("retains exact-ref flags and keeps separate review assistance out of primary submissions", () => {
    const state = createInitialState();
    state.steps[stepKey(target.id, targetStep.id)] = {
      ...createStepProgress("target draft"),
      hints: 3,
      revealed: true,
    };
    expect(assistanceForLessonStep(state, target, targetStep)).toEqual({
      hints: 3,
      revealed: true,
    });
    delete state.steps[stepKey(target.id, targetStep.id)];
    state.steps["review:old-session"] = {
      ...createStepProgress(),
      hints: 4,
      revealed: true,
    };
    expect(assistanceForLessonStep(state, target, targetStep)).toEqual({
      hints: 0,
      revealed: false,
    });
  });
});

const contactAt = 10_000;
const atDay = contactAt + DAY;
const now = contactAt + DAY + 1;

function authoredSuccess(
  lessonId: string,
  stepId: string,
  id: string,
  at: number,
): EvidenceEvent {
  const lesson = lessons.find((candidate) => candidate.id === lessonId);
  const step = lesson?.steps.find((candidate) => candidate.id === stepId);
  if (!step?.evidence || !step.evaluator || !step.evidenceKind)
    throw new Error("missing authored step evidence kind");
  return {
    id,
    conceptIds: [...step.evidence.conceptIds],
    lessonId,
    stepId,
    kind: step.evidenceKind,
    passed: true,
    hints: 0,
    revealed: false,
    at,
    evidenceVersion: step.evidence.version,
    evaluator: step.evaluator.kind,
    gate: false,
  };
}

function dueState(
  conceptId: string,
  refs: Array<[string, string]>,
  contactAt: number,
): UserState {
  const base = createInitialState();
  return {
    ...base,
    events: refs
      .map(([lessonId, stepId], index) =>
        authoredSuccess(lessonId, stepId, "family-" + index, 100 + index),
      )
      .concat({
        id: "contact",
        conceptIds: [conceptId],
        lessonId: "review",
        stepId: conceptId + ":old-session",
        kind: "exposure",
        passed: false,
        hints: 0,
        revealed: false,
        at: contactAt,
        evidenceVersion: 2,
        evaluator: "answer",
        gate: false,
      }),
    review: [
      {
        conceptId,
        dueAt: contactAt,
        intervalDays: 1,
        attempts: 1,
        reason: "test",
      },
    ],
  };
}

const stateEligibleForFunctionOwnership = dueState(
  "function-ownership",
  [
    ["scenario-assessment", "assessment-repair"],
    ["function-ownership-calibration", "function-is-empty-text"],
  ],
  contactAt,
);
const stateDueForMutableBorrow = dueState(
  "mutable-borrow",
  [
    ["borrow-intro", "borrow-conflict"],
    ["borrow-intro", "borrow-mutable-run"],
  ],
  contactAt,
);

describe("stable review exercise routing", () => {
  it("resolves an absent exercise ID through the historical concept map", () => {
    const old = resolveReviewExercise("function-ownership");
    expect(old).toMatchObject({
      status: "ready",
      exerciseId: reviewExercises["function-ownership"].id,
    });
  });

  it("does not treat a historical concept key as a stable exercise ID", () => {
    expect(
      resolveReviewExercise("function-ownership", "function-ownership"),
    ).toEqual({
      status: "unavailable",
      reason: "unknown-id",
    });
  });

  it("resolves the delayed stable ID", () => {
    const delayed = resolveReviewExercise(
      "function-ownership",
      "review-function-ownership-delayed-v1",
    );
    expect(delayed).toMatchObject({
      status: "ready",
      exerciseId: delayedReviewExercises["function-ownership"].id,
    });
  });

  it.each([
    ["io-format-roundtrip", "review-io-format-flag-probe-v1"],
    ["io-safe-persistence", "review-io-missing-file-probe-v1"],
    ["io-terminal-boundary", "review-io-confirm-save-probe-v1"],
  ])("resolves the authored short ID for %s", (conceptId, exerciseId) => {
    expect(resolveReviewExercise(conceptId, exerciseId)).toMatchObject({
      status: "ready",
      exerciseId,
      step: shortReviewExercises[conceptId],
    });
    expect(reviewExerciseIdForSelection(conceptId, "short")).toBe(exerciseId);
    expect(reviewExerciseIdForSelection(conceptId, "extended")).toBe(
      reviewExercises[conceptId].id,
    );
  });

  it("keeps old I/O IDs and missing IDs on the extended contracts", () => {
    for (const [conceptId, oldId] of [
      ["io-format-roundtrip", "review-io-format"],
      ["io-safe-persistence", "review-io-files"],
      ["io-terminal-boundary", "review-io-command"],
    ] as const) {
      expect(resolveReviewExercise(conceptId, oldId)).toMatchObject({
        status: "ready",
        exerciseId: oldId,
        step: reviewExercises[conceptId],
      });
      expect(resolveReviewExercise(conceptId)).toMatchObject({
        status: "ready",
        exerciseId: oldId,
        step: reviewExercises[conceptId],
      });
      expect(reviewPurposeForExercise(conceptId, oldId)).toBe("extended");
    }
  });

  it("keeps unknown and wrong-concept pinned IDs unavailable", () => {
    expect(
      resolveReviewExercise("function-ownership", "removed-review-id"),
    ).toEqual({
      status: "unavailable",
      reason: "unknown-id",
    });
    expect(
      resolveReviewExercise(
        "function-ownership",
        reviewExercises["mutable-borrow"].id,
      ),
    ).toEqual({ status: "unavailable", reason: "wrong-concept" });
  });

  it("counts the authored legacy and fresh families for delayed eligibility", () => {
    expect(
      courseEvidenceSummary(
        stateEligibleForFunctionOwnership,
        "function-ownership",
      ).qualifyingCodingTasks,
    ).toBe(2);
    expect(
      independentCodingTaskIds(
        stateEligibleForFunctionOwnership,
        "function-ownership",
        courseEvidencePolicy,
      ),
    ).toEqual(["ownership/read-length", "ownership/function-predicate-v1"]);
    expect(
      moduleGate(
        stateEligibleForFunctionOwnership,
        lessons,
        ownershipModule,
      ).criteria.find(
        (criterion) =>
          criterion.label === "Dwie niezależne granice własności funkcji",
      ),
    ).toEqual({
      label: "Dwie niezależne granice własności funkcji",
      passed: false,
    });
  });

  it("routes only eligible delayed due reviews dynamically by concept", () => {
    expect(
      courseDelayedReviewEligibility(
        stateEligibleForFunctionOwnership,
        "function-ownership",
        atDay,
      ),
    ).toBe(false);
    expect(
      courseDelayedReviewEligibility(
        stateEligibleForFunctionOwnership,
        "function-ownership",
        now,
      ),
    ).toBe(true);
    expect(
      reviewExerciseIdForOrigin(
        stateEligibleForFunctionOwnership,
        "function-ownership",
        "due",
        now,
      ),
    ).toBe(delayedReviewExercises["function-ownership"].id);
    expect(
      reviewExerciseIdForOrigin(
        stateDueForMutableBorrow,
        "mutable-borrow",
        "due",
        now,
      ),
    ).toBeUndefined();
    expect(
      reviewExerciseIdForOrigin(
        stateDueForMutableBorrow,
        "mutable-borrow",
        "practice",
        now,
      ),
    ).toBeUndefined();
    expect(
      reviewExerciseIdForOrigin(
        createInitialState(),
        "io-format-roundtrip",
        "practice",
        now,
      ),
    ).toBe(shortReviewExercises["io-format-roundtrip"].id);
    expect(
      reviewExerciseIdForOrigin(
        createInitialState(),
        "io-format-roundtrip",
        "practice",
        now,
        "extended",
      ),
    ).toBe(reviewExercises["io-format-roundtrip"].id);
  });

  it("keeps a legacy concept-key review event on the historical course definition", () => {
    const state = createInitialState();
    const historical = reviewExercises["function-ownership"];
    const event: EvidenceEvent = {
      id: "legacy-review-event",
      conceptIds: ["function-ownership"],
      lessonId: "review",
      stepId: "function-ownership:legacy-session",
      kind: historical.evidenceKind!,
      evaluator: historical.evaluator!.kind,
      evidenceVersion: historical.evidence!.version,
      passed: true,
      hints: 0,
      revealed: false,
      at: 10_000,
      delayed: false,
    };
    const recorded = recordCourseEvidence(state, event);
    expect(recorded.events).toEqual([event]);
    expect(evidenceForReview("function-ownership", historical)).toEqual({
      conceptIds: ["function-ownership"],
      evidenceVersion: historical.evidence!.version,
    });
  });

  it("attributes only a false-delay exposure to a marked short probe", () => {
    const probe = shortReviewExercises["io-format-roundtrip"];
    const event: EvidenceEvent = {
      id: "short-probe-exposure",
      conceptIds: ["io-format-roundtrip"],
      lessonId: "review",
      stepId: `${probe.id}:session`,
      kind: "exposure",
      passed: true,
      hints: 0,
      revealed: false,
      at: 20_000,
      evidenceVersion: 1,
      delayed: false,
      evaluator: "tests",
      gate: false,
    };
    expect(courseEvidencePolicy.definitionForEvent(event)).toEqual(
      probe.evidence,
    );
    expect(
      courseEvidencePolicy.definitionForEvent({
        ...event,
        kind: "recall",
        delayed: true,
      }),
    ).toBeUndefined();
    expect(
      courseEvidencePolicy.definitionForEvent({ ...event, delayed: true }),
    ).toBeUndefined();
    const recorded = recordCourseEvidence(createInitialState(), event);
    expect(recorded.review).toEqual([]);
    expect(recorded.events.at(-1)).toMatchObject({
      kind: "exposure",
      delayed: false,
    });
  });
});
