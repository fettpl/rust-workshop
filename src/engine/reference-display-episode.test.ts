import { expect, it } from "vitest";
import { lessons } from "@/content/course";
import {
  recordCourseLessonExposure,
  recordExactReviewSolutionContact,
} from "@/content/learning-context";
import { createInitialState } from "@/persistence/state";

const lesson = lessons.find((lesson) => lesson.id === "todo-terminal-cli")!;
const source = lesson.steps.find((step) => step.id === "cli-gate")!;
const sourceFacts = (state: ReturnType<typeof createInitialState>) =>
  state.events.filter(
    (event) =>
      event.lessonId === lesson.id &&
      event.stepId === source.id &&
      event.id.startsWith("supplied-solution:"),
  );

it("an explicit reveal and its resulting visible reference share one source contact", () => {
  const state = createInitialState();
  const episodeStart = state.events.length;
  const explicit = recordCourseLessonExposure(
    state,
    {
      lessonId: lesson.id,
      stepId: source.id,
      conceptIds: lesson.conceptIds,
      at: 100,
      revealed: true,
    },
    "supplied-solution",
  );
  const visible = recordExactReviewSolutionContact(
    explicit,
    source,
    "solution",
    102,
    episodeStart,
  );
  expect(visible).toBe(explicit);
  expect(sourceFacts(visible)).toHaveLength(1);
});

it("a genuinely later display renews contact without changing the original receipt", () => {
  const earlier = recordExactReviewSolutionContact(
    createInitialState(),
    source,
    "solution",
    100,
  );
  const episodeStart = earlier.events.length;
  const later = recordExactReviewSolutionContact(
    earlier,
    source,
    "solution",
    200,
    episodeStart,
  );
  expect(sourceFacts(later)).toHaveLength(2);
  expect(later.events.slice(0, earlier.events.length)).toEqual(earlier.events);
  expect(sourceFacts(later)[1]).toMatchObject({
    at: 200,
    kind: "exposure",
    revealed: true,
    gate: false,
  });
});

it("a hint or unrelated source contact does not consume the current display episode", () => {
  let state = createInitialState();
  const episodeStart = state.events.length;
  state = recordCourseLessonExposure(state, {
    lessonId: lesson.id,
    stepId: source.id,
    conceptIds: lesson.conceptIds,
    at: 100,
    revealed: true,
  });
  state = recordCourseLessonExposure(
    state,
    {
      lessonId: "todo-storage-format",
      stepId: "format-gate",
      conceptIds: ["io-format-roundtrip"],
      at: 101,
      revealed: true,
    },
    "supplied-solution",
  );
  const shown = recordExactReviewSolutionContact(
    state,
    source,
    "solution",
    102,
    episodeStart,
  );
  expect(sourceFacts(shown)).toHaveLength(1);
  expect(shown.events.slice(0, state.events.length)).toEqual(state.events);
});
