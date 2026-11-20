import { expect, it } from "vitest";
import { lessons, modules, reviewExercises } from "./course";
import {
  courseGateRecovery,
  courseModuleGate,
  recordCourseEvidence,
  recordSuppliedSolutions,
} from "./learning-context";
import { revealAuthoredStepSolutions } from "../domain/project-package";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";

const ids = [
  "dependency-graph-diagnosis-primary-contract",
  "dependency-graph-diagnosis-blank-contract",
  "dependency-source-license-policy-primary-contract",
  "dependency-source-license-policy-blank-contract",
  "dependency-advisory-exceptions-primary-contract",
  "dependency-advisory-exceptions-blank-contract",
  "dependency-release-dossier-primary-contract",
  "dependency-release-dossier-blank-contract",
  "tokio-close-and-drain",
  "tokio-receiver-close-and-drain",
  "tokio-receiver-stop-preserves-next",
];

it.each(ids)(
  "%s keeps a separately assessable alternative after revealing primary",
  (id) => {
    const criterion = modules
      .flatMap((stage) => stage.gateCriteria ?? [])
      .find((entry) => entry.id === id)!;
    const first = criterion.taskRefs[0];
    const lesson = lessons.find((entry) => entry.id === first.lessonId)!;
    const primary = lesson.steps.find((step) => step.id === first.stepId)!;
    const state = recordSuppliedSolutions(
      revealAuthoredStepSolutions(createInitialState(), [first], lessons, 1),
      primary,
      "solution",
      1,
    );
    const recovery = courseGateRecovery(state, criterion, lessons);
    expect(recovery.status).toBe("available");
    if (recovery.status !== "available") return;
    expect(recovery.task).not.toEqual(first);
    const alternative = lesson.steps.find(
      (step) => step.id === recovery.task.stepId,
    )!;
    expect(alternative.evaluator?.kind).toBe("tests");
    expect(alternative.solution).not.toBe(primary.solution);
  },
);

it("keeps separate dependency and Tokio shutdown confirmations disjoint", () => {
  const refs = modules
    .flatMap((stage) => stage.gateCriteria ?? [])
    .filter((criterion) => ids.includes(criterion.id))
    .flatMap((criterion) =>
      criterion.taskRefs.map((ref) => ref.lessonId + "/" + ref.stepId),
    );
  expect(new Set(refs).size).toBe(refs.length);
});

it("receiver close recovery remains distinct from the ordinary shutdown review", () => {
  const criterion = modules
    .find((stage) => stage.id === "tokio-io-streams")!
    .gateCriteria!.find(
      (entry) => entry.id === "tokio-receiver-close-and-drain",
    )!;
  const alternative = lessons
    .find((lesson) => lesson.id === criterion.taskRefs[1].lessonId)!
    .steps.find((step) => step.id === criterion.taskRefs[1].stepId)!;
  expect(alternative.solution).not.toBe(
    reviewExercises["tokio-receiver-stream-shutdown"].solution,
  );
});

it.each(ids)(
  "%s fresh alternative confirms only its own labeled contract",
  (id) => {
    const stage = modules.find((stage) =>
      stage.gateCriteria?.some((criterion) => criterion.id === id),
    )!;
    const criterion = stage.gateCriteria!.find(
      (criterion) => criterion.id === id,
    )!;
    const primary = criterion.taskRefs[0];
    let state = createInitialState();
    state.steps[stepKey(primary.lessonId, primary.stepId)] = {
      ...createStepProgress(),
      revealed: true,
    };
    state = importState(exportState(state));
    const recovery = courseGateRecovery(state, criterion, lessons);
    expect(recovery.status).toBe("available");
    if (recovery.status !== "available") return;
    const lesson = lessons.find(
      (lesson) => lesson.id === recovery.task.lessonId,
    )!;
    const alternative = lesson.steps.find(
      (step) => step.id === recovery.task.stepId,
    )!;
    state = recordCourseEvidence(state, {
      id: "alternative-success",
      ...recovery.task,
      conceptIds: alternative.evidence?.conceptIds ?? lesson.conceptIds,
      ...(alternative.evidence
        ? { evidenceVersion: alternative.evidence.version }
        : {}),
      kind: alternative.evidenceKind,
      evaluator: alternative.evaluator?.kind,
      gate: true,
      passed: true,
      hints: 0,
      revealed: false,
      at: 10,
    });
    const result = courseModuleGate(
      importState(exportState(state)),
      lessons,
      stage,
    );
    expect(
      result.criteria
        .filter((entry) => entry.passed)
        .map((entry) => entry.label),
    ).toEqual([criterion.label]);
    expect(result.passed).toBe(false);
  },
);
