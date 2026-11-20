import {
  assertReviewedHistoryRedaction,
  historyRedactionDeltas,
  historyRedactionPath,
} from "./history-redaction-test-support";
import { historicalBeforeSendHandoff } from "./async-lending-send-compatibility-fixture";
import { historicalBeforeCancellationTransfer } from "./async-lending-cancel-compatibility-fixture";
import { historicalBeforeFrameProtocolMaintenance } from "./frame-maintenance-compatibility-fixture";
import { expect, it } from "vitest";
import * as actualCurrentCourse from "./course";
import { historicalBeforeInitializedPrefix } from "./unsafe-miri-prefix-compatibility-fixture";
import {
  historicalBeforeA10,
  historicalBeforeA10ThenA9ThenA8ThenA7ThenExistingContractRepair as historicalBeforeExistingContractRepair,
} from "./file-schema-evolution-compatibility-fixture";

const course = historicalBeforeA10(actualCurrentCourse);

it("appends one documentation lesson after the testing workflow with executable recall and counted families", () => {
  const stage = course.modules.find((m) => m.id === "testing-quality")!;
  expect(stage.lessonIds.slice(-2)).toEqual([
    "testing-quality-workflow",
    "documentation-guided-repair",
  ]);
  const lesson = course.lessons.find(
    (l) => l.id === "documentation-guided-repair",
  )!;
  expect(lesson).toBeDefined();
  expect(lesson.steps).toHaveLength(9);
  expect(lesson.prerequisites).toEqual(["testing-quality-workflow"]);
  const review =
    course.reviewExercises[
      "documentation-guided-repair" as keyof typeof course.reviewExercises
    ];
  expect(review).toMatchObject({
    code: "",
    kind: "recall",
    evidenceKind: "recall",
    evidenceGate: false,
    evaluator: { kind: "tests" },
  });
  expect(stage.gateCriteria?.at(-1)).toMatchObject({
    id: "testing-documentation-repair-gate",
    requiredIndependentCodingTasks: 2,
  });
  const historicalCourse = historicalBeforeFrameProtocolMaintenance(
    historicalBeforeExistingContractRepair(course),
  );
  expect(historicalCourse.lessons).toHaveLength(193);
  expect(course.concepts).toHaveLength(194);
});

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import legacy from "./documentation-guided-repair-legacy.json";
import oldSaves from "./fixtures/baseline-correction-saves.json";
import { historicalBeforeDocumentationRepair } from "./documentation-guided-repair-compatibility-fixture";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
} from "../persistence/state";
import {
  gateRecovery,
  moduleGate,
  independentCodingTaskIds,
} from "../engine/learning";
import { evaluate } from "../engine/evaluate";
import {
  assistanceForLessonStep,
  courseDelayedReviewEligibility,
  courseEvidencePolicy,
  courseMastery,
  evidenceForLessonStep,
  evidenceForReview,
  recordCourseEvidence,
  resolveReviewExercise,
} from "./learning-context";
import type { UserState } from "../domain/types";

const id = "documentation-guided-repair";
const doc = () => course.lessons.find((l) => l.id === id)!;
const criterion = () =>
  course.modules
    .find((m) => m.id === "testing-quality")!
    .gateCriteria!.find((g) => g.id === "testing-documentation-repair-gate")!;
const stage = () => ({
  ...course.modules.find((m) => m.id === "testing-quality")!,
  gateCriteria: [criterion()],
});
function submit(
  state: UserState,
  stepId: string,
  flags: { hints?: number; revealed?: boolean } = {},
  at = state.events.length + 1,
): UserState {
  const lesson = doc(),
    step = lesson.steps.find((s) => s.id === stepId)!;
  return recordCourseEvidence(state, {
    id: `${stepId}/${state.events.length}`,
    lessonId: id,
    stepId,
    ...evidenceForLessonStep(lesson, step),
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    ...assistanceForLessonStep(state, lesson, step),
    ...flags,
    at,
  });
}
const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const families = (state: UserState) =>
  independentCodingTaskIds(state, id, courseEvidencePolicy);

it("preserves the actual accepted Feature1 registry, all old definitions and the three old testing criteria", () => {
  expect(
    sha(
      readFileSync(
        new URL("./documentation-guided-repair-legacy.json", import.meta.url),
      ),
    ),
  ).toBe("92bd1425f3e5acf0bdf20877e919924c4aef5c5f3aa9d0e1433ec0fa0081ffb3");
  expect(legacy.provenance.head).toBe(
    "c42c9253715ccd36d688677b0ef8e081f6771204",
  );
  const preHandoff = historicalBeforeSendHandoff(
    historicalBeforeCancellationTransfer(
      historicalBeforeInitializedPrefix(
        historicalBeforeExistingContractRepair(course),
      ),
    ),
  );
  const previous = historicalBeforeDocumentationRepair(preHandoff);
  expect(previous.modules).toEqual(legacy.modules);
  expect(previous.concepts).toEqual(legacy.concepts);
  expect(previous.sources).toEqual(legacy.sources);
  expect(previous.competencies).toEqual(legacy.competencies);
  expect(previous.lessons.map((l) => l.id)).toEqual(
    legacy.lessons.map((l) => l.id),
  );
  for (const old of legacy.lessons) {
    const current = preHandoff.lessons[old.index];
    expect(sha(JSON.stringify(current)), old.id).toBe(old.definitionHash);
    expect(current.steps.map((s) => s.id)).toEqual(old.stepIds);
  }
  for (const name of ["reviewExercises", "reviewExercisesById"] as const) {
    const actual = Object.entries(previous[name]).map(([key, step]) => ({
      key,
      id: step.id,
      definitionHash: sha(JSON.stringify(step)),
    }));
    expect(actual).toEqual(legacy[name]);
  }
  expect(Object.keys(historyRedactionDeltas)).toEqual([historyRedactionPath]);
  assertReviewedHistoryRedaction(
    legacy.immutable,
    readFileSync(new URL(`../../${historyRedactionPath}`, import.meta.url)),
  );
  for (const immutable of legacy.immutable)
    expect(
      sha(readFileSync(new URL(`../../${immutable.path}`, import.meta.url))),
      immutable.path,
    ).toBe(
      immutable.path === historyRedactionPath
        ? historyRedactionDeltas[historyRedactionPath].currentSha256
        : immutable.sha256,
    );
  const historicalCourse = historicalBeforeFrameProtocolMaintenance(
    historicalBeforeExistingContractRepair(course),
  );
  expect(
    historicalCourse.lessons.slice(legacy.lessons.length).map((l) => l.id),
  ).toEqual([id, "ownership-foundation-transfer"]);
  expect(
    course.concepts.slice(legacy.concepts.length).map((c) => c.id),
  ).toEqual([id]);
  expect(course.sources.slice(legacy.sources.length).map((s) => s.id)).toEqual([
    "docs-str-strip-prefix",
    "docs-str-split-once",
    "docs-str-rsplit-once",
    "docs-rustc-explain",
    "docs-cargo-doc",
    "docs-rustdoc",
  ]);
  expect(
    Object.keys(course.reviewExercises).slice(legacy.reviewExercises.length),
  ).toEqual([id]);
  const testing = course.modules.find((m) => m.id === "testing-quality")!;
  expect(testing.gateCriteria!.slice(0, 3)).toEqual(
    legacy.modules.find((m) => m.id === "testing-quality")!.gateCriteria,
  );
  expect(testing.assessmentId).toBe(
    "testing-quality-workflow/quality-blank-gate",
  );
});

it("maps every primary alias literally and keeps the gate's rationale distinct from two-family mastery", () => {
  expect(criterion().requiredIndependentCodingTasks).toBe(2);
  expect(criterion().taskRefs).toEqual(
    ["docs-prefix-repair", "docs-split-transfer", "docs-split-blank"].map(
      (stepId) => ({ lessonId: id, stepId }),
    ),
  );
  expect(criterion().taskRefs.map((r) => r.stepId)).toEqual(
    doc()
      .steps.filter((s) => s.evidenceGate && s.evaluator?.kind === "tests")
      .map((s) => s.id),
  );
  expect(criterion().supplementaryStepRefs).toEqual([
    { lessonId: id, stepId: "docs-hypothesis-rationale" },
  ]);
  for (const split of ["docs-split-transfer", "docs-split-blank"]) {
    const coded = submit(
      submit(createInitialState(), "docs-prefix-repair"),
      split,
    );
    expect(families(coded), split).toEqual([
      "docs/prefix-repair",
      "docs/first-setting",
    ]);
    expect(courseMastery(coded, id).level).toBe("understood");
    expect(moduleGate(coded, course.lessons, stage()).passed).toBe(false);
    expect(gateRecovery(coded, criterion(), course.lessons)).toEqual({
      status: "available",
      task: { lessonId: id, stepId: "docs-hypothesis-rationale" },
    });
    const completed = submit(coded, "docs-hypothesis-rationale");
    expect(moduleGate(completed, course.lessons, stage()).passed).toBe(true);
    expect(gateRecovery(completed, criterion(), course.lessons)).toEqual({
      status: "complete",
    });
  }
  const aliases = submit(
    submit(createInitialState(), "docs-split-transfer"),
    "docs-split-blank",
  );
  expect(families(aliases)).toEqual(["docs/first-setting"]);
  expect(courseMastery(aliases, id).level).toBe("practiced");
  expect(gateRecovery(aliases, criterion(), course.lessons)).toEqual({
    status: "available",
    task: { lessonId: id, stepId: "docs-prefix-repair" },
  });
});

it("exhausts assisted families and rejects saved/event sibling help in both alias directions", () => {
  for (const [helped, attempted] of [
    ["docs-split-transfer", "docs-split-blank"],
    ["docs-split-blank", "docs-split-transfer"],
  ]) {
    for (const mode of ["saved", "event"] as const) {
      let state = submit(createInitialState(), "docs-prefix-repair");
      if (mode === "saved")
        state.steps[`${id}:${helped}`] = {
          ...createStepProgress("// zachowany szkic"),
          hints: 1,
          revealed: true,
        };
      else state = submit(state, helped, { hints: 1, revealed: true });
      const raw = structuredClone(state.events);
      expect(gateRecovery(state, criterion(), course.lessons)).toEqual({
        status: "exhausted",
      });
      state = submit(state, attempted);
      expect(state.events.slice(0, raw.length)).toEqual(raw);
      expect(families(state)).toEqual(["docs/prefix-repair"]);
      expect(moduleGate(state, course.lessons, stage()).passed).toBe(false);
      expect(gateRecovery(state, criterion(), course.lessons)).toEqual({
        status: "exhausted",
      });
    }
  }
  for (const mode of ["saved", "event"] as const) {
    let state = createInitialState();
    for (const ref of criterion().taskRefs) {
      if (mode === "saved")
        state.steps[`${id}:${ref.stepId}`] = {
          ...createStepProgress(),
          hints: 1,
        };
      else state = submit(state, ref.stepId, { hints: 1 });
    }
    expect(families(state)).toEqual([]);
    expect(gateRecovery(state, criterion(), course.lessons)).toEqual({
      status: "exhausted",
    });
    expect(moduleGate(state, course.lessons, stage()).passed).toBe(false);
  }
});

it("requires actual code outcomes and explicit self-rating without primary credit for noncoding work or recall", () => {
  let neutral = createInitialState();
  for (const step of doc().steps) {
    if (step.evidenceGate) {
      expect(
        evaluate(step.evaluator!, { answer: "correct", code: step.solution })
          .passed,
      ).toBe(false);
    } else neutral = submit(neutral, step.id);
  }
  expect(families(neutral)).toEqual([]);
  const rationale = doc().steps.find(
    (s) => s.id === "docs-hypothesis-rationale",
  )!;
  if (rationale.evaluator?.kind !== "rubric")
    throw new Error("Missing self-review rubric");
  expect(
    evaluate(rationale.evaluator, { answer: "Źródło i moja hipoteza" }).passed,
  ).toBe(false);
  expect(
    evaluate(rationale.evaluator, {
      rubricChecks: rationale.evaluator.criteria,
    }).passed,
  ).toBe(false);
  expect(
    evaluate(rationale.evaluator, {
      answer: "Źródło i moja hipoteza",
      rubricChecks: rationale.evaluator.criteria,
    }).passed,
  ).toBe(true);
  const review = course.reviewExercises[id];
  neutral = recordCourseEvidence(neutral, {
    id: "ordinary-review",
    lessonId: "review",
    stepId: `${id}:session`,
    ...evidenceForReview(id, review),
    kind: "recall",
    evaluator: "tests",
    passed: true,
    hints: 0,
    revealed: false,
    at: 100,
    delayed: false,
  });
  expect(families(neutral)).toEqual([]);
  expect(resolveReviewExercise(id).status).toBe("ready");
  expect(course.reviewExerciseForId(review.id)).toBe(review);
  expect(
    evaluate(review.evaluator!, { answer: "correct", code: review.solution })
      .passed,
  ).toBe(false);
  for (const step of doc().steps.filter(
    (s) => s.evaluator?.kind === "expected-error",
  ))
    expect(
      evaluate(step.evaluator!, { answer: step.expectedError, code: step.code })
        .passed,
    ).toBe(false);
});

it("keeps ordinary recall delayed-capable only after two families, due time and a quiet interval", () => {
  const day = 86_400_000,
    now = day + 100;
  const base = submit(
    submit(createInitialState(), "docs-prefix-repair"),
    "docs-split-transfer",
  );
  expect(courseDelayedReviewEligibility(base, id, day - 1)).toBe(false);
  expect(courseDelayedReviewEligibility(base, id, now)).toBe(true);
  const review = course.reviewExercises[id];
  const recall = (
    state: UserState,
    at: number,
    delayed: boolean,
    revealed = false,
  ) =>
    recordCourseEvidence(state, {
      id: `review/${state.events.length}/${at}`,
      lessonId: "review",
      stepId: `${id}:session-${at}`,
      ...evidenceForReview(id, review),
      kind: "recall",
      evaluator: "tests",
      passed: true,
      hints: 0,
      revealed,
      at,
      delayed,
    });
  expect(courseMastery(recall(base, 100, false), id).level).toBe("understood");
  expect(courseMastery(recall(base, now, true, true), id).level).toBe(
    "understood",
  );
  const practiced = recall(base, now, false);
  expect(courseDelayedReviewEligibility(practiced, id, now + 1)).toBe(false);
  expect(courseMastery(recall(practiced, now + 1, true), id).level).toBe(
    "understood",
  );
  const due = recall(base, now, true);
  expect(courseMastery(due, id).level).toBe("retained");
  expect(families(due)).toEqual(["docs/prefix-repair", "docs/first-setting"]);
});

it("round-trips old V1/V2/V3 history and accepted Feature1/workflow resumes without passing new tasks", () => {
  for (const fixture of oldSaves.fixtures) {
    const raw = fixture.state;
    const restored = importState(
      JSON.stringify({
        schemaVersion: raw.schemaVersion,
        appVersion: raw.appVersion,
        exportedAt: "2026-10-13T00:00:00.000Z",
        state: raw,
      }),
    );
    expect(restored.events).toEqual(raw.events);
    expect(restored.steps).toEqual(raw.steps);
    expect(restored.notes).toEqual(raw.notes);
    expect(restored.bookmarks).toEqual(raw.bookmarks);
    expect(restored.review).toEqual(raw.review);
    expect(restored.reviewSession).toEqual(raw.reviewSession);
    expect(restored.ratings).toEqual(raw.ratings ?? []);
    expect(families(restored)).toEqual([]);
    expect(restored.steps[`${id}:docs-prefix-repair`]).toBeUndefined();
    expect(importState(exportState(restored))).toEqual(restored);
  }
  for (const oldId of [
    "testing-quality-workflow",
    "fallible-iterator-contracts",
  ]) {
    const old = course.lessons.find((l) => l.id === oldId)!;
    const state = createInitialState();
    state.resume = {
      ...state.resume,
      view: "lesson",
      lessonId: oldId,
      stepIndex: 3,
      panel: "output",
    };
    state.steps[`${oldId}:${old.steps[3].id}`] = {
      ...createStepProgress("// mój szkic żółć"),
      answer: "własna odpowiedź",
      hints: 2,
      revealed: true,
      completed: true,
      attempts: [
        { at: 10, code: "// stara próba", passed: false, feedback: "zachowaj" },
      ],
    };
    state.notes[oldId] = "notatka";
    state.bookmarks = [oldId];
    state.reviewSession = {
      conceptId: old.conceptIds[0],
      sessionId: "saved-session",
      startedAt: 20,
      wasDue: true,
      mode: "challenge",
    };
    const restored = importState(exportState(state));
    expect(restored).toEqual(state);
    expect(
      course.lessons.find((l) => l.id === restored.resume.lessonId)!.steps[
        restored.resume.stepIndex
      ].id,
    ).toBe(old.steps[3].id);
    expect(families(restored)).toEqual([]);
  }
});
