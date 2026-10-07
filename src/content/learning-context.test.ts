import { describe, expect, it } from "vitest";
import { concepts, lessons, projects, reviewExercises } from "./course";
import {
  recordCourseEvidence,
  evidenceForLessonStep,
  evidenceForReview,
  courseMastery,
  courseEvidenceSummary,
  courseCompetencyProgress,
  revealCourseProjectPackageVariant,
} from "./learning-context";
import type { EvidenceEvent, ProjectPackage } from "@/domain/types";
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
