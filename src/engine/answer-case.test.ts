import { expect, it } from "vitest";
import { lessons, reviewExercisesById } from "@/content/course";
import { evaluate } from "./evaluate";

const cases = [
  ["assessment-unseen-copy", "(8, true) (8, true)", "(8, TRUE) (8, TRUE)"],
  ["move-copy-return-predict", "7 14 RUST", "7 14 rust"],
  ["scalar-predict", "-4 2.5 true R", "-4 2.5 TRUE r"],
  ["assessment-unseen-move", "E0382", "e0382"],
  [
    "assessment-recall",
    "Task, TaskState, Option<i32>, &self",
    "task, taskstate, option<i32>, &self",
  ],
  ["result-recall", "Ok, Err", "ok, err"],
  ["propagate-recall", "Err", "err"],
  ["panic-recall", "Result", "result"],
  ["review-program-entry", "main", "MAIN"],
  ["review-copy-semantics", "(2, true) (2, true)", "(2, TRUE) (2, TRUE)"],
  [
    "review-method-receivers",
    "&self, &mut self, Self",
    "&self, &mut self, self",
  ],
  ["review-optional-values", "None", "none"],
  ["async-lending-send-boundary-recall", "Send + 'static", "send + 'static"],
];

it.each(cases)(
  "%s preserves Rust spelling rather than accepting another program's output",
  (id, correct, incorrect) => {
    const step =
      lessons
        .flatMap((lesson) => lesson.steps)
        .find((step) => step.id === id) ?? reviewExercisesById[id];
    expect(evaluate(step.evaluator!, { answer: ` ${correct} ` }).passed).toBe(
      true,
    );
    expect(evaluate(step.evaluator!, { answer: incorrect }).passed).toBe(false);
  },
);

it("retains case-insensitive prose recall where capitalization does not change the concept", () => {
  const step = lessons
    .flatMap((lesson) => lesson.steps)
    .find((step) => step.id === "async-lending-callbacks-recall")!;
  expect(evaluate(step.evaluator!, { answer: "ZATRZYMUJE PĘTLĘ" }).passed).toBe(
    true,
  );
});
