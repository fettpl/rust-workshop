import { expect, it } from "vitest";
import * as course from "./course";

import type {
  EvidenceEvent,
  Lesson,
  LessonStep,
  UserState,
} from "../domain/types";
import { DAY, independentCodingTaskIds } from "../engine/learning";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { fileSchemaEvolutionAssessmentFixtures as fixtures } from "./file-schema-evolution-assessment-fixtures";
import { fileSchemaNormalizationContract as contract } from "./file-schema-evolution-contracts";
import { fileSchemaEvolutionSources } from "./file-schema-evolution";
import {
  assistanceForLessonStep,
  courseCompetencyProgress,
  courseDelayedReviewEligibility,
  courseEvidencePolicy,
  courseEvidenceSummary,
  courseGateRecovery,
  courseMastery,
  courseModuleGate,
  courseNextGateTask,
  evidenceForLessonStep,
  evidenceForReview,
  recordCourseEvidence,
  recordCourseLessonExposure,
  revealCourseProjectPackageVariant,
} from "./learning-context";

const moduleId = "file-schema-evolution";
const normalizeId = "file-schema-normalization";
const upgradeId = "file-schema-explicit-upgrade";
const conceptId = "file-version-meaning";
const competencyId = "file-identity-evolution";
const family = "file-schema-evolution/normalize-v1";

it("appends the two six-step lessons and the one-family gate", () => {
  const courseModule = course.modules.find(({ id }) => id === moduleId);
  expect(courseModule?.lessonIds).toEqual([normalizeId, upgradeId]);
  expect(courseModule?.prerequisites).toEqual(["todo-io"]);
  expect(courseModule?.assessmentId).toBe("schema-normalize-apply");
  expect(
    courseModule?.gateCriteria?.map(
      ({ id, taskRefs, requiredIndependentCodingTasks }) => ({
        id,
        taskRefs,
        requiredIndependentCodingTasks,
      }),
    ),
  ).toEqual([
    {
      id: "file-schema-normalization-gate",
      taskRefs: [
        { lessonId: normalizeId, stepId: "schema-normalize-apply" },
        { lessonId: normalizeId, stepId: "schema-normalize-blank" },
      ],
      requiredIndependentCodingTasks: 1,
    },
  ]);
  expect(
    course.lessons
      .slice(-2)
      .map(({ id, steps }) => [id, steps.map((step) => step.id)]),
  ).toEqual([
    [
      normalizeId,
      [
        "schema-normalize-predict",
        "schema-normalize-model",
        "schema-normalize-debug",
        "schema-normalize-apply",
        "schema-normalize-blank",
        "schema-normalize-recall",
      ],
    ],
    [
      upgradeId,
      [
        "schema-upgrade-predict",
        "schema-upgrade-model",
        "schema-upgrade-inspect",
        "schema-upgrade-rehearse",
        "schema-upgrade-review",
        "schema-upgrade-reflect",
      ],
    ],
  ]);
  expect(course.concepts.at(-1)).toMatchObject({
    id: conceptId,
    competencyIds: [competencyId],
    evidenceCalibration: { version: 2, minimumCodingTasks: 1 },
  });
  const review = course.reviewExercises[conceptId];
  expect(review).toMatchObject({
    id: "review-file-version-meaning",
    kind: "recall",
    evidenceKind: "recall",
    evidenceGate: false,
    code: "",
    evidence: { version: 2, conceptIds: [conceptId], codingTaskId: family },
  });
  expect(course.reviewExerciseForId(review.id)).toBe(review);
});

const courseModule = course.modules.find(({ id }) => id === moduleId)!;
const normalization = course.lessons.find(({ id }) => id === normalizeId)!;
const upgrade = course.lessons.find(({ id }) => id === upgradeId)!;
const scopedLessons = [normalization, upgrade];
const criterion = courseModule.gateCriteria![0];
const apply = normalization.steps[3];
const blank = normalization.steps[4];
const explanation = normalization.steps[5];
const review = course.reviewExercises[conceptId];
const reviewSession = `${review.id}:synthetic-session`;
const at = 1700000000000;
const singular =
  "Potwierdzone w jednym samodzielnym zadaniu kodowym bez podpowiedzi.";

function submission(
  state: UserState,
  lesson: Lesson,
  step: LessonStep,
  time: number,
): EvidenceEvent {
  return {
    id: `synthetic:${step.id}:${time}`,
    at: time,
    lessonId: lesson.id,
    stepId: step.id,
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    gate: step.evidenceGate,
    ...evidenceForLessonStep(lesson, step),
    ...assistanceForLessonStep(state, lesson, step),
    passed: true,
  };
}

function submit(
  state: UserState,
  lesson: Lesson,
  step: LessonStep,
  time: number,
) {
  return recordCourseEvidence(state, submission(state, lesson, step, time));
}

function recall(state: UserState, time: number, delayed = false) {
  return recordCourseEvidence(state, {
    id: `synthetic-review:${time}`,
    at: time,
    lessonId: "review",
    stepId: reviewSession,
    ...evidenceForReview(conceptId, review),
    kind: review.evidenceKind,
    evaluator: review.evaluator?.kind,
    gate: false,
    passed: true,
    hints: 0,
    revealed: false,
    delayed,
  });
}

function revealReview(state: UserState, time: number) {
  return recordCourseLessonExposure(state, {
    lessonId: "review",
    stepId: reviewSession,
    conceptIds: [conceptId],
    at: time,
    revealed: true,
  });
}

function expectFamily(state: UserState, credited: boolean) {
  expect(
    independentCodingTaskIds(state, conceptId, courseEvidencePolicy),
  ).toEqual(credited ? [family] : []);
  expect(courseEvidenceSummary(state, conceptId)).toMatchObject({
    qualifyingCodingTasks: credited ? 1 : 0,
    requiredCodingTasks: 1,
  });
  expect(courseCompetencyProgress(state, competencyId)).toMatchObject({
    total: 1,
    independentTasks: credited ? 1 : 0,
    proven: credited ? 1 : 0,
  });
  expect(courseModuleGate(state, scopedLessons, courseModule)).toEqual({
    passed: credited,
    criteria: [{ label: criterion.label, passed: credited }],
  });
}

it("deduplicates both clean primary aliases and repeated submissions", () => {
  const state = createInitialState();
  expectFamily(state, false);
  expect(courseNextGateTask(state, criterion, scopedLessons)).toEqual(
    criterion.taskRefs[0],
  );
  const first = submission(state, normalization, apply, at);
  const applied = recordCourseEvidence(state, first);
  expect(recordCourseEvidence(applied, first)).toBe(applied);
  const both = submit(applied, normalization, blank, at + 1);
  const repeated = submit(both, normalization, apply, at + 2);
  for (const candidate of [
    applied,
    both,
    repeated,
    submit(state, normalization, blank, at),
  ]) {
    expectFamily(candidate, true);
    expect(courseGateRecovery(candidate, criterion, scopedLessons)).toEqual({
      status: "complete",
    });
  }
  // This is a controlled import of matching event fields, not authenticated work.
  const roundTrip = importState(exportState(both));
  expect(roundTrip.events).toEqual(both.events);
  expectFamily(roundTrip, true);
  expect(repeated.events).toHaveLength(3);
  expect(repeated.events[0]).toEqual(first);
  expect(courseMastery(repeated, conceptId)).toEqual({
    level: "understood",
    reason: singular,
    updatedAt: at + 2,
  });
});

it.each([
  { helped: apply, alias: blank, hints: 1, revealed: false },
  { helped: blank, alias: apply, hints: 0, revealed: true },
])(
  "carries saved assistance from $helped.id to $alias.id",
  ({ helped, alias, hints, revealed }) => {
    const state = createInitialState();
    const key = stepKey(normalization.id, helped.id);
    state.steps[key] = { ...createStepProgress(helped.code), hints, revealed };
    const attempted = submit(state, normalization, helped, at);
    const switched = submit(attempted, normalization, alias, at + 1);
    expect(
      switched.events.map((event) => [event.hints, event.revealed]),
    ).toEqual([
      [hints, revealed],
      [hints, revealed],
    ]);
    expectFamily(switched, false);
    expect(courseMastery(switched, conceptId).level).not.toBe("understood");
    expect(courseGateRecovery(switched, criterion, scopedLessons)).toEqual({
      status: "exhausted",
    });
  },
);

it("keeps ordinary review apart from primary credit and resolves its revealed session for both aliases", () => {
  const initial = createInitialState();
  expectFamily(recall(initial, at), false);
  const exposed = revealReview(initial, at);
  expect(exposed.events[0]).toMatchObject({
    lessonId: "review",
    stepId: reviewSession,
    kind: "exposure",
    revealed: true,
    passed: true,
    gate: false,
    hints: 0,
    at,
  });
  for (const alias of [apply, blank]) {
    const attempted = submit(exposed, normalization, alias, at + 1);
    expect(attempted.events[1]).toMatchObject({
      hints: 0,
      revealed: false,
      evidenceVersion: 2,
    });
    expectFamily(attempted, false);
    expect(courseGateRecovery(attempted, criterion, scopedLessons)).toEqual({
      status: "exhausted",
    });
    expect(
      courseNextGateTask(attempted, criterion, scopedLessons),
    ).toBeUndefined();
  }
  const applied = submit(initial, normalization, apply, at);
  const later = submit(
    revealReview(applied, at + 1),
    normalization,
    blank,
    at + 2,
  );
  expect(later.events.slice(0, 1)).toEqual(applied.events);
  expectFamily(later, true);
  expect(courseMastery(later, conceptId)).toEqual({
    level: "understood",
    reason: singular,
    updatedAt: at + 2,
  });
});

it("requires a strictly greater than 24-hour quiet interval for ordinary delayed retention", () => {
  const applied = submit(createInitialState(), normalization, apply, at);
  expect(
    applied.review.find((item) => item.conceptId === conceptId)?.dueAt,
  ).toBe(at + DAY);
  expect(courseDelayedReviewEligibility(applied, conceptId, at + DAY)).toBe(
    false,
  );
  expect(courseMastery(recall(applied, at + DAY, true), conceptId).level).toBe(
    "understood",
  );
  const later = at + DAY + 1;
  expect(courseDelayedReviewEligibility(applied, conceptId, later)).toBe(true);
  const retained = recall(applied, later, true);
  expectFamily(retained, true);
  expect(courseMastery(retained, conceptId)).toEqual({
    level: "retained",
    reason: "Samodzielne rozwiązanie kodowe odtworzone po ponad 24 godzinach.",
    updatedAt: later,
  });
  expect(
    retained.review.find((item) => item.conceptId === conceptId),
  ).toMatchObject({ dueAt: later + 2 * DAY, intervalDays: 2 });
  expect(retained.events.slice(0, 1)).toEqual(applied.events);
});

it("records explanatory recall and the practice lesson without another family or gate", () => {
  expect(explanation).toMatchObject({
    kind: "recall",
    evidenceKind: "self-rating",
    evidenceGate: false,
    evidence: { version: 2, conceptIds: [conceptId] },
  });
  expect(explanation.evidence?.codingTaskId).toBeUndefined();
  expect(upgrade.practiceOnly).toBe(true);
  expect(fileSchemaEvolutionSources).toEqual([]);
  const reusedSources = [
    "io-std-file",
    "io-std-write",
    "io-std-rename",
    "io-std-path",
  ];
  expect(normalization.sourceIds).toEqual(reusedSources);
  expect(upgrade.sourceIds).toEqual(reusedSources);
  expect(course.sources.map(({ id }) => id)).toEqual(
    expect.arrayContaining(reusedSources),
  );

  expect(upgrade.conceptIds).toEqual([
    "io-safe-persistence",
    "io-terminal-boundary",
  ]);
  let state = submit(createInitialState(), normalization, explanation, at);
  for (const [index, step] of upgrade.steps.entries()) {
    expect(step.evidenceGate).toBe(false);
    expect(step.evidence).toBeUndefined();
    state = submit(state, upgrade, step, at + 1 + index);
  }
  expect(
    state.events.filter((event) => event.conceptIds.includes(conceptId)),
  ).toEqual([state.events[0]]);
  expectFamily(state, false);
  expect(courseMastery(state, conceptId).updatedAt).toBe(at);
});

it("records only the real solution refs and round trips controlled history, dates, assistance and resume", () => {
  const project = course.projects.at(-1)!;
  expect(project.id).toBe(moduleId);
  expect(project.reviewConceptIds).toEqual([conceptId]);
  const workshop = project.package!;
  expect(workshop.id).toBe("file-schema-evolution-workshop");
  expect(workshop.revealStepRefs).toEqual(criterion.taskRefs);
  expect(workshop.starterRevealStepRefs).toEqual([]);
  const initial = createInitialState();
  const previous = course.lessons.find(
    ({ id }) => id === "todo-file-persistence",
  )!;
  const previousStep = previous.steps[0];
  const previousKey = stepKey(previous.id, previousStep.id);
  initial.resume = {
    view: "lesson",
    lessonId: previous.id,
    stepIndex: 0,
    panel: "code",
    focus: true,
  };
  initial.notes[previous.id] = "synthetic note";
  initial.review = [
    {
      conceptId: "io-safe-persistence",
      dueAt: at + DAY,
      intervalDays: 1,
      attempts: 1,
      lastReviewedAt: at,
      reason: "synthetic queue",
    },
  ];
  initial.steps[previousKey] = {
    ...createStepProgress("synthetic draft"),
    hints: 1,
    revealed: true,
    attempts: [{ at, passed: false, feedback: "synthetic history" }],
  };
  const history = recordCourseLessonExposure(initial, {
    lessonId: previous.id,
    stepId: previousStep.id,
    conceptIds: previous.conceptIds,
    at,
    revealed: true,
  });
  expect(
    revealCourseProjectPackageVariant(
      history,
      workshop,
      course.lessons,
      "starter",
      at + 1,
    ),
  ).toBe(history);
  const exposed = revealCourseProjectPackageVariant(
    history,
    workshop,
    course.lessons,
    "solution",
    at + 1,
  );
  expect(exposed.events.slice(0, history.events.length)).toEqual(
    history.events,
  );
  const additions = exposed.events.slice(history.events.length);
  expect(
    additions.map(({ lessonId, stepId }) => ({ lessonId, stepId })),
  ).toEqual(criterion.taskRefs);
  for (const event of additions)
    expect(event).toMatchObject({
      revealed: true,
      gate: false,
      kind: "exposure",
      at: at + 1,
    });
  const roundTrip = importState(exportState(exposed));
  expect(roundTrip.resume).toEqual(history.resume);
  expect(roundTrip.notes).toEqual(history.notes);
  expect(roundTrip.steps[previousKey]).toEqual(history.steps[previousKey]);
  expect(roundTrip.events).toEqual(exposed.events);
  expect(roundTrip.review).toEqual(history.review);
  for (const alias of [apply, blank])
    expect(assistanceForLessonStep(roundTrip, normalization, alias)).toEqual({
      hints: 0,
      revealed: true,
    });
  expectFamily(roundTrip, false);
});

it("keeps the displayed Rust limited to the normalization API and tracks all assessed source", () => {
  const declarations = {
    types: [
      "Version",
      "NextId",
      "Entry",
      "LegacyEntry",
      "LegacyTodo",
      "Todo",
      "Decoded",
      "Loaded",
      "ConversionError",
    ],
    functions: [
      "id",
      "done",
      "title",
      "done",
      "title",
      "entries",
      "entries",
      "next_id",
      "version",
      "todo",
      "into_todo",
      "normalize",
      "main",
    ],
  };
  expect(Object.keys(fixtures)).toEqual([apply.id, blank.id, review.id]);
  for (const step of [apply, blank, review]) {
    const authored = fixtures[step.id as keyof typeof fixtures];
    expect(step.solution).toBe(authored.canonical);
    expect(step.evaluator).toEqual({ kind: "tests", tests: authored.tests });
    for (const source of [
      authored.starter,
      authored.canonical,
      ...authored.equivalents,
      ...authored.semanticMutants.map((mutant) => mutant.source),
    ]) {
      expect(
        [...source.matchAll(/\b(?:struct|enum|type|trait)\s+(\w+)/g)].map(
          (match) => match[1],
        ),
      ).toEqual(declarations.types);
      expect(
        [...source.matchAll(/\bfn\s+(\w+)/g)].map((match) => match[1]),
      ).toEqual(declarations.functions);
      const accessors = Object.fromEntries(
        Array.from(
          source.matchAll(/impl (\w+) \{\n([\s\S]*?)\n\}/g),
          ([, owner, methods]) => [
            owner,
            [
              ...methods.matchAll(
                /pub fn (\w+)\([^)]*\) -> [^{]+\{ ([^}]+) \}/g,
              ),
            ].map(([, name, body]) => [name, body]),
          ],
        ),
      );
      expect(accessors).toEqual({
        Entry: [
          ["id", "self.id"],
          ["done", "self.done"],
          ["title", "&self.title"],
        ],
        LegacyEntry: [
          ["done", "self.done"],
          ["title", "&self.title"],
        ],
        LegacyTodo: [["entries", "&self.entries"]],
        Todo: [
          ["entries", "&self.entries"],
          ["next_id", "self.next_id"],
        ],
        Loaded: [
          ["version", "self.version"],
          ["todo", "&self.todo"],
          ["into_todo", "self.todo"],
        ],
      });
      expect(source).not.toMatch(
        /\b(?:std::fs|include(?:_str|_bytes)?!|mod\s)/,
      );
    }
    expect(step.code).toBe(step === apply ? authored.starter : "");
    expect(step.prompt).not.toContain(authored.canonical);
    if (step !== apply) expect(step.prompt).toContain(contract.promptScaffold);
  }
  expect(contract.starter).toContain('todo!("implement normalization")');
  for (const step of [
    ...scopedLessons.flatMap((lesson) => lesson.steps),
    review,
  ]) {
    if (![apply, blank, review].includes(step)) {
      expect(step.code).toBeUndefined();
      expect(step.solution).toBeUndefined();
      expect(step.prompt).not.toContain("fn normalize");
    }
    expect(step.hints?.join("\n") ?? "").not.toContain("fn normalize");
  }
});
