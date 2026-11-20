import { expect, it } from "vitest";
import { contentBundle } from "../../scripts/validate-content";
import { validateContent } from "./validate";
import type { LessonStep } from "@/domain/types";

const lesson = contentBundle.lessons.find(
  (entry) => entry.id === "service-client-bounded-retry",
)!;
const observation = lesson.steps.find(
  (step) => step.id === "bounded-retry-model-trace",
)!;
function issues(change: Partial<LessonStep> = {}) {
  return validateContent({
    ...contentBundle,
    lessons: contentBundle.lessons.map((entry) =>
      entry === lesson
        ? {
            ...entry,
            steps: entry.steps.map((step) =>
              step === observation
                ? { ...step, evaluator: undefined, ...change }
                : step,
            ),
          }
        : entry,
    ),
  }).filter((error) =>
    error.includes(`${lesson.id}/${observation.id} is missing evaluator`),
  );
}

it("allows the existing acknowledgement action for plain exposure observations", () => {
  expect(issues()).toEqual([]);
});

it.each<Partial<LessonStep>>([
  { kind: "recall" },
  { kind: "blank" },
  { evidenceKind: "recall" },
  { evidenceKind: "transfer" },
  { evidenceGate: true },
  { code: "fn main() {}" },
  { solution: "fn main() {}" },
  { expectedStatus: "success" },
  {
    evidence: {
      version: 2,
      conceptIds: lesson.conceptIds,
      codingTaskId: "coding-task",
    },
  },
])(
  "requires an evaluator when the observation acquires an assessment contract: %j",
  (change) => {
    expect(issues(change)).toHaveLength(1);
  },
);
