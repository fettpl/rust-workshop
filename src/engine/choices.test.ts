import { describe, expect, it } from "vitest";
import { lessons } from "../content/course";
import { choicesForStep } from "./choices";
import type { LessonStep } from "../domain/types";

const sample: LessonStep = {
  id: "sample",
  kind: "predict",
  title: "Predict",
  prompt: "Which outcome?",
  evidenceKind: "prediction",
  choices: [
    { id: "right", label: "Correct" },
    { id: "other", label: "Different" },
    { id: "third", label: "Another" },
  ],
  evaluator: {
    kind: "choice",
    correct: "right",
    explanations: { right: "Yes", other: "No", third: "No" },
  },
};

describe("choice presentation", () => {
  it("keeps every answer ID and label, with a stable order for a resumed task", () => {
    const before = structuredClone(sample);
    const choices = choicesForStep(sample, "lesson-a");
    expect(choices).toEqual(
      choicesForStep(structuredClone(sample), "lesson-a"),
    );
    expect([...choices].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...sample.choices!].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(sample).toEqual(before);
    expect(
      choicesForStep(
        {
          ...sample,
          evaluator: {
            ...sample.evaluator!,
            kind: "choice",
            correct: "third",
            explanations: {},
          },
        },
        "lesson-a",
      ),
    ).toEqual(choices);
    expect(choices.find((choice) => choice.id === "other")?.label).toBe(
      "Different",
    );
  });

  it("does not turn the first displayed position into an answer key in early modules", () => {
    for (const moduleId of ["rust-foundations", "ownership", "data-modeling"]) {
      const positions = lessons
        .filter((lesson) => lesson.moduleId === moduleId)
        .flatMap((lesson) => lesson.steps.map((step) => ({ lesson, step })))
        .filter(({ step }) => step.evaluator?.kind === "choice")
        .map(({ lesson, step }) => {
          const correct =
            step.evaluator!.kind === "choice" ? step.evaluator!.correct : "";
          return choicesForStep(step, lesson.id).findIndex(
            (choice) => choice.id === correct,
          );
        });
      expect(positions.length).toBeGreaterThan(5);
      expect(new Set(positions).size, moduleId).toBeGreaterThan(1);
      for (const position of new Set(positions))
        expect(
          positions.filter((value) => value === position).length /
            positions.length,
          moduleId,
        ).toBeLessThanOrEqual(0.7);
    }
  });

  it("preserves meaningful ordering tasks and handles missing or single choices", () => {
    const ordering: LessonStep = {
      ...sample,
      evaluator: { kind: "ordering", correct: ["right", "other", "third"] },
    };
    expect(choicesForStep(ordering, "lesson-a")).toEqual(sample.choices);
    expect(choicesForStep({ ...sample, choices: [] }, "lesson-a")).toEqual([]);
    expect(
      choicesForStep({ ...sample, choices: undefined }, "lesson-a"),
    ).toEqual([]);
    expect(
      choicesForStep({ ...sample, choices: [sample.choices![0]] }, "lesson-a"),
    ).toEqual([sample.choices![0]]);
  });
});
