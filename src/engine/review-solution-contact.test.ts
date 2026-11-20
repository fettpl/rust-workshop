import { expect, it } from "vitest";
import { lessons, reviewExercises, projects } from "@/content/course";
import {
  courseEvidencePolicy,
  courseMastery,
  evidenceForLessonStep,
  evidenceForReview,
  recordCourseEvidence,
  recordCourseLessonExposure,
  recordExactReviewSolutionContact,
  revealCourseProjectPackageVariant,
} from "@/content/learning-context";
import {
  createInitialState,
  exportState,
  importState,
} from "@/persistence/state";
import type { EvidenceEvent, UserState } from "@/domain/types";
import { DAY, hasQuietInterval } from "./learning";

const routes = [
  {
    concept: "macros-exported-paths-2024",
    lesson: "macros-exported-paths-2024",
    tasks: [
      "macros-exported-paths-2024-gate",
      "macros-exported-paths-2024-blank",
    ],
    sourceLesson: "macros-exactly-once",
    sourceStep: "macros-exactly-once-gate",
  },
  {
    concept: "unsafe-miri-disjoint-regions-contract",
    lesson: "unsafe-miri-disjoint-regions",
    tasks: [
      "disjoint-regions-contract-gate",
      "disjoint-regions-range-transfer",
    ],
    sourceLesson: "unsafe-ffi-split-regions",
    sourceStep: "split-regions-alias-gate",
  },
];
function foundation(route: (typeof routes)[number]) {
  const lesson = lessons.find((lesson) => lesson.id === route.lesson)!;
  let state = createInitialState();
  for (const [index, id] of route.tasks.entries()) {
    const step = lesson.steps.find((step) => step.id === id)!;
    state = recordCourseEvidence(state, {
      id: `primary:${id}`,
      ...evidenceForLessonStep(lesson, step),
      lessonId: lesson.id,
      stepId: id,
      kind: step.evidenceKind,
      evaluator: step.evaluator?.kind,
      passed: true,
      hints: 0,
      revealed: false,
      gate: true,
      at: index + 1,
    });
  }
  return state;
}
function disclosure(
  state: UserState,
  route: (typeof routes)[number],
  at: number,
) {
  const source = lessons.find((lesson) => lesson.id === route.sourceLesson)!;
  const step = source.steps.find((step) => step.id === route.sourceStep)!;
  expect(step.solution?.trim()).toBe(
    reviewExercises[route.concept].solution?.trim(),
  );
  return recordCourseLessonExposure(
    state,
    {
      lessonId: source.id,
      stepId: step.id,
      conceptIds: source.conceptIds,
      revealed: true,
      at,
    },
    "supplied-solution",
  );
}
function recall(
  route: (typeof routes)[number],
  at: number,
  session = "fresh",
): EvidenceEvent {
  const step = reviewExercises[route.concept];
  return {
    id: `recall:${session}`,
    ...evidenceForReview(route.concept, step),
    lessonId: "review",
    stepId: `${step.id}:${session}`,
    kind: "recall",
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: false,
    gate: false,
    delayed: true,
    at,
  };
}

it.each(routes)(
  "$concept: an exact reference shown in another concept resets quiet time without adding independent proof",
  (route) => {
    const prior = foundation(route);
    expect(courseMastery(prior, route.concept).level).toBe("understood");
    const at = DAY + 10;
    const shown = disclosure(prior, route, at);
    const immediate = recordCourseEvidence(shown, recall(route, at + 1));
    expect(courseMastery(immediate, route.concept).level).toBe("understood");
    expect(
      immediate.review.find((item) => item.conceptId === route.concept)
        ?.intervalDays,
    ).toBe(1);
    const boundary = recordCourseEvidence(
      shown,
      recall(route, at + DAY, "boundary"),
    );
    expect(courseMastery(boundary, route.concept).level).toBe("understood");
    const later = recordCourseEvidence(
      shown,
      recall(route, at + DAY + 1, "later"),
    );
    expect(courseMastery(later, route.concept).level).toBe("retained");
    expect(
      later.review.find((item) => item.conceptId === route.concept)
        ?.intervalDays,
    ).toBe(2);
    expect(shown.events.slice(0, 2)).toEqual(prior.events);
  },
);

it.each(routes)(
  "$concept: imported journal order cannot backdate or hide exact-solution contact",
  (route) => {
    const at = DAY + 10;
    const prior = foundation(route);
    const shown = disclosure(prior, route, at);
    const contact = shown.events.at(-1)!;
    const candidate = recall(route, at + 1);
    const imported = importState(
      exportState({ ...prior, events: [candidate, contact, ...prior.events] }),
    );
    expect(courseMastery(imported, route.concept).level).toBe("understood");
    const laterContact = importState(
      exportState({
        ...prior,
        events: [{ ...contact, at: at + 2 }, candidate, ...prior.events],
      }),
    );
    expect(courseMastery(laterContact, route.concept).level).toBe("retained");
    expect(imported.events).toEqual([candidate, contact, ...prior.events]);
  },
);

it("a reference displayed again resets contact without rewriting the first disclosure", () => {
  const route = routes[0];
  const source = lessons
    .find((lesson) => lesson.id === route.sourceLesson)!
    .steps.find((step) => step.id === route.sourceStep)!;
  const original = disclosure(foundation(route), route, 100);
  const later = recordExactReviewSolutionContact(
    original,
    source,
    "solution",
    DAY + 200,
  );
  expect(later.events.slice(0, original.events.length)).toEqual(
    original.events,
  );
  expect(
    hasQuietInterval(later, route.concept, DAY + 201, courseEvidencePolicy),
  ).toBe(false);
  expect(
    hasQuietInterval(later, route.concept, 2 * DAY + 201, courseEvidencePolicy),
  ).toBe(true);
  expect(later.events.at(-1)).toMatchObject({
    kind: "exposure",
    revealed: true,
    gate: false,
    at: DAY + 200,
  });
});

it("repeated solution-package downloads reset reference contact while starter downloads do not", () => {
  const project = projects.find(
    (project) => project.id === "file-schema-evolution",
  )!.package!;
  const initial = createInitialState();
  initial.events.push({
    id: "old-contact",
    lessonId: "file-schema-normalization",
    stepId: "schema-normalize-apply",
    conceptIds: ["file-version-meaning"],
    kind: "exposure",
    passed: true,
    hints: 0,
    revealed: false,
    gate: false,
    at: 1,
  });
  const starter = revealCourseProjectPackageVariant(
    initial,
    project,
    lessons,
    "starter",
    2 * DAY,
  );
  expect(
    hasQuietInterval(
      starter,
      "file-version-meaning",
      2 * DAY + 1,
      courseEvidencePolicy,
    ),
  ).toBe(true);
  const shown = revealCourseProjectPackageVariant(
    starter,
    project,
    lessons,
    "solution",
    2 * DAY,
  );
  expect(
    hasQuietInterval(
      shown,
      "file-version-meaning",
      2 * DAY + 1,
      courseEvidencePolicy,
    ),
  ).toBe(false);
  const repeated = revealCourseProjectPackageVariant(
    shown,
    project,
    lessons,
    "solution",
    4 * DAY,
  );
  expect(
    hasQuietInterval(
      repeated,
      "file-version-meaning",
      4 * DAY + 1,
      courseEvidencePolicy,
    ),
  ).toBe(false);
  expect(
    repeated.events.every(
      (event) => event.kind === "exposure" && event.gate === false,
    ),
  ).toBe(true);
});

it("an unrelated full reference and an ordinary hint do not imply the target review solution was displayed", () => {
  const route = routes[0];
  let state = foundation(route);
  state = recordCourseLessonExposure(state, {
    lessonId: route.sourceLesson,
    stepId: route.sourceStep,
    conceptIds: ["macros-exactly-once"],
    revealed: true,
    hints: 1,
    at: DAY + 10,
  });
  state = recordCourseLessonExposure(
    state,
    {
      lessonId: "first-program",
      stepId: "entry-modify",
      conceptIds: ["program-entry"],
      revealed: true,
      at: DAY + 10,
    },
    "supplied-solution",
  );
  expect(
    hasQuietInterval(state, route.concept, DAY + 11, courseEvidencePolicy),
  ).toBe(true);
});

it("a text reminder does not pretend that another review's complete Rust solution was displayed", () => {
  const route = routes[0];
  const state = foundation(route);
  const sourceReview = reviewExercises["macros-exactly-once"];
  const shown = recordCourseLessonExposure(state, {
    lessonId: "review",
    stepId: `${sourceReview.id}:reminder-session`,
    conceptIds: ["macros-exactly-once"],
    revealed: true,
    at: DAY + 10,
  });
  expect(
    hasQuietInterval(shown, route.concept, DAY + 11, courseEvidencePolicy),
  ).toBe(true);
  expect(
    hasQuietInterval(
      shown,
      "macros-exactly-once",
      DAY + 11,
      courseEvidencePolicy,
    ),
  ).toBe(false);
});

it("a later attempt carrying an inherited reveal flag does not renew exact-reference contact", () => {
  const route = routes[0];
  const state = disclosure(foundation(route), route, 100);
  const source = lessons.find((lesson) => lesson.id === route.sourceLesson)!;
  const step = source.steps.find((step) => step.id === route.sourceStep)!;
  const later = recordCourseEvidence(state, {
    id: "inherited-assisted-submission",
    ...evidenceForLessonStep(source, step),
    lessonId: source.id,
    stepId: step.id,
    kind: step.evidenceKind,
    evaluator: step.evaluator?.kind,
    passed: true,
    hints: 0,
    revealed: true,
    gate: true,
    at: DAY + 200,
  });
  expect(
    hasQuietInterval(later, route.concept, DAY + 201, courseEvidencePolicy),
  ).toBe(true);
});
