import { describe, expect, it } from "vitest";
import { lessons } from "@/content/course";
import {
  courseEvidencePolicy,
  evidenceForLessonStep,
  recordCourseEvidence,
} from "@/content/learning-context";
import {
  createInitialState,
  exportState,
  importState,
} from "@/persistence/state";
import { deriveConceptMastery, isIndependentSuccess } from "./learning";
import { evaluate } from "./evaluate";

const explanations: [string, string][] = [
  [
    "capstone-domain-contrast",
    "Źródło dopuszcza tylko ASCII i 4 bajty, a wiadomość 8 bajtów UTF-8 bez znaków sterujących.",
  ],
  [
    "capstone-domain-explain",
    "Jeden znak UTF-8 może zajmować kilka bajtów, więc limit bajtów sprawdzam osobno.",
  ],
  [
    "capstone-commit-contrast",
    "Commit bez odpowiedzi może wymagać replay, a rollback nie zostawia zapisu; inny payload daje konflikt.",
  ],
  [
    "capstone-commit-explain",
    "Receipt sukcesu wolno wysłać dopiero po zatwierdzeniu, bo commit może się nie udać.",
  ],
  [
    "capstone-lifecycle-contrast",
    "Admission zwiększa accepted; rozłączenie po enqueue nie cofa pracy, odmowa nie zwiększa licznika.",
  ],
  [
    "capstone-lifecycle-explain",
    "Accepted nadal liczy zobowiązania workera po rozłączeniu klienta.",
  ],
  [
    "capstone-protocol-contrast",
    "V1 ma trzy pola i brak correlation, V2 ma cztery i sentinel, a inne wersje są odrzucane.",
  ],
  [
    "capstone-protocol-explain",
    "Brak pola w V1 normalizuję do None, a nie do pustego String.",
  ],
  [
    "capstone-incident-contrast",
    "Oddzielam commit od delivery; bez sygnału commit pozostawiam Unknown.",
  ],
  [
    "capstone-incident-explain",
    "Brak potwierdzenia commit nie dowodzi rollbacku; ponawiam to samo żądanie zamiast zgadywać.",
  ],
  [
    "capstone-release-contrast",
    "Raport musi pasować do digestu bieżącego ZIP-a i mieć komplet świeżych kontroli.",
  ],
  [
    "capstone-release-explain",
    "Nieznany status nie dostarcza aktualnego dowodu bezpieczeństwa, więc utrzymuję Hold.",
  ],
  [
    "async-lending-receiver-explain",
    "Future utrzymuje wyłączną pożyczkę receivera do Ready albo Drop.",
  ],
  [
    "async-lending-callbacks-explain",
    "Future callbacku może pożyczać argument oraz lokalny stan callbacku.",
  ],
  [
    "async-lending-cancel-commit-explain",
    "Receive odbiera, callback wykonuje pracę, a commit zatwierdza postęp po jej powodzeniu.",
  ],
  [
    "async-lending-send-boundary-explain",
    "Send dotyczy przenoszenia między wątkami, a static wyklucza krótsze pożyczki.",
  ],
  [
    "async-lending-dyn-adapter-explain",
    "Adapter ujawnia alokację, dynamiczne wywołanie i lifetime future ograniczony do wywołania.",
  ],
];

function authored(id: string) {
  const lesson = lessons.find((entry) =>
    entry.steps.some((step) => step.id === id),
  )!;
  return { lesson, step: lesson.steps.find((step) => step.id === id)! };
}

describe("open explanations", () => {
  it.each(explanations)(
    "%s accepts learner wording only after explicit self-evaluation",
    (id, answer) => {
      const { step } = authored(id);
      const evaluator = step.evaluator!;
      const checks = evaluator.kind === "rubric" ? evaluator.criteria : [];
      expect(evaluate(evaluator, { answer, rubricChecks: checks }).passed).toBe(
        true,
      );
      expect(evaluate(evaluator, { answer }).passed).toBe(false);
      expect(
        evaluate(evaluator, { answer: " ", rubricChecks: checks }).passed,
      ).toBe(false);
    },
  );

  it("records contact without independent credit and preserves historical exposure on import", () => {
    const { lesson, step } = authored("capstone-domain-explain");
    const historical = {
      id: "historical-exposure",
      ...evidenceForLessonStep(lesson, step),
      lessonId: lesson.id,
      stepId: step.id,
      kind: "exposure" as const,
      evaluator: "answer" as const,
      gate: false,
      passed: true,
      hints: 0,
      revealed: false,
      at: 100,
    };
    const state = importState(
      exportState({ ...createInitialState(), events: [historical] }),
    );
    const next = recordCourseEvidence(state, {
      ...historical,
      id: "self-evaluated-explanation",
      kind: "self-rating",
      evaluator: "rubric",
      at: 200,
    });
    expect(next.events[0]).toEqual(historical);
    expect(next.events).toHaveLength(2);
    expect(next.events.every((event) => !isIndependentSuccess(event))).toBe(
      true,
    );
    expect(
      deriveConceptMastery(next, lesson.conceptIds[0], courseEvidencePolicy)
        .level,
    ).toBe("exposed");
    expect(importState(exportState(next)).events).toEqual(next.events);
  });
});
