import { expect, it } from "vitest";
import { evaluate } from "../engine/evaluate";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  stepKey,
} from "../persistence/state";
import { lessons } from "./course";
import {
  courseEvidenceSummary,
  recordCourseEvidence,
} from "./learning-context";
import {
  hashRegistryValue,
  matchesRegistryValue,
} from "./file-schema-evolution-compatibility-fixture";
import { restoreLogAnalyzerRecallLessons } from "./workshop-assessment-repair-compatibility-fixture";

const examples = [
  {
    lessonId: "log-records",
    stepId: "records-recall",
    answers: [
      "Zwracam fragment wiersza dokładnie tak, jak go zapisano. Gdy po oddzieleniu nagłówka zostaje sama biel albo nic, odrzucam wpis.",
      "Test na pustkę mogę wykonać na przyciętym widoku. Odbiorcy oddaję oryginalną wiadomość wraz ze spacjami.",
    ],
    incomplete: "Każdej wiadomości obcinam odstępy i zwracam to, co zostaje.",
    criteria: [/całą treść.*spacjami/, /białe znaki.*błąd/],
  },
  {
    lessonId: "log-streaming",
    stepId: "stream-recall",
    answers: [
      "Zdejmuję separator linii, a ostatni rekord bez niego też badam. Uszkodzenie doliczam zawsze. Z prawidłowych do podsumowania trafi tutaj tylko ostrzeżenie.",
      "Czytam także końcówkę bez entera. Po usunięciu zakończenia sprawdzam składnię. Zły wpis daje plus jeden do błędów, INFO nic nie zmienia, WARN liczę.",
    ],
    incomplete:
      "Najpierw wybieram wiersze zawierające WARN i dopiero te waliduję.",
    criteria: [
      /LF lub CRLF.*bez zakończenia/s,
      /przed filtrowaniem.*malformed/s,
      /INFO pomijam.*WARN/,
    ],
  },
  {
    lessonId: "log-analyzer-project",
    stepId: "report-recall",
    answers: [
      "Zgadzają się i liczby, i układ tekstu: nagłówek, filtr oraz pola w umówionej kolejności. Wypisuję też zera i domykam każdy wiersz bajtem nowej linii.",
      "Dla tych samych danych oczekuję identycznych bajtów. Zostawiam nazwy, porządek i puste liczniki wypisane jako 0. Po ostatniej liczbie też jest LF.",
    ],
    incomplete:
      "Porównuję tylko niezerowe liczniki, więc układ tekstu nie ma znaczenia.",
    criteria: [/nagłówek.*filtra.*kolejność/, /zero/, /LF.*ostatniego/],
  },
];

const restore = (catalog: typeof lessons) =>
  restoreLogAnalyzerRecallLessons(catalog, new Map(), matchesRegistryValue);
const previous = restore(lessons);

it.each(examples)(
  "accepts paraphrases for $stepId after criterion-by-criterion self-assessment",
  (fixture) => {
    const lesson = lessons.find((l) => l.id === fixture.lessonId)!;
    const step = lesson.steps.find((s) => s.id === fixture.stepId)!;
    const old = previous
      .find((l) => l.id === lesson.id)!
      .steps.find((s) => s.id === step.id)!;
    if (step.evaluator?.kind !== "rubric" || old.evaluator?.kind !== "answer")
      throw new Error("Unexpected recall contract");
    expect(step.kind).toBe("recall");
    expect(step.evidenceKind).toBe("self-rating");
    expect(step.evidenceGate).toBeFalsy();
    const rubricChecks = step.evaluator.criteria;
    expect(rubricChecks).toHaveLength(fixture.criteria.length);
    fixture.criteria.forEach((pattern, i) =>
      expect(rubricChecks[i]).toMatch(pattern),
    );
    for (const answer of fixture.answers) {
      expect(evaluate(old.evaluator, { answer }).passed).toBe(false);
      expect(evaluate(step.evaluator, { answer, rubricChecks }).passed).toBe(
        true,
      );
    }
    expect(
      evaluate(step.evaluator, { answer: "  \n ", rubricChecks }).passed,
    ).toBe(false);
    for (const missing of rubricChecks) {
      const partial = rubricChecks.filter((criterion) => criterion !== missing);
      expect(
        evaluate(step.evaluator, {
          answer: fixture.incomplete,
          rubricChecks: partial,
        }).passed,
      ).toBe(false);
    }
  },
);

it.each(examples)(
  "retains historical answers and records $stepId self-checks separately",
  ({ lessonId, stepId, answers }) => {
    const lesson = lessons.find((l) => l.id === lessonId)!;
    const key = stepKey(lessonId, stepId);
    const history = createInitialState();
    const old = previous
      .find((l) => l.id === lessonId)!
      .steps.find((s) => s.id === stepId)!;
    if (old.evaluator?.kind !== "answer")
      throw new Error("Missing historical evaluator");
    history.steps[key] = {
      ...createStepProgress(),
      answer: old.evaluator.accepted[0],
      completed: true,
      attempts: [
        {
          at: 100,
          answer: old.evaluator.accepted[0],
          passed: true,
          feedback: old.evaluator.feedback,
        },
      ],
    };
    const event = {
      id: "historical",
      lessonId,
      stepId,
      conceptIds: lesson.conceptIds,
      kind: "recall",
      evaluator: "answer",
      at: 100,
      passed: true,
      hints: 0,
      revealed: false,
    } as const;
    const imported = importState(
      exportState(recordCourseEvidence(history, event)),
    );
    expect(imported.steps[key]).toEqual(history.steps[key]);
    expect(imported.steps[key].rubricChecks).toEqual([]);
    const current = recordCourseEvidence(imported, {
      ...event,
      id: "self-check",
      at: 200,
      kind: "self-rating",
      evaluator: "rubric",
    });
    expect(current.events).toEqual([
      event,
      {
        ...event,
        id: "self-check",
        at: 200,
        kind: "self-rating",
        evaluator: "rubric",
      },
    ]);
    expect(current.review).toEqual(imported.review);
    for (const conceptId of lesson.conceptIds) {
      expect(
        courseEvidenceSummary(current, conceptId).qualifyingCodingTasks,
      ).toBe(0);
    }
    const step = lesson.steps.find((s) => s.id === stepId)!;
    expect(
      evaluate(step.evaluator!, {
        answer: answers[0],
        rubricChecks: imported.steps[key].rubricChecks,
      }).passed,
    ).toBe(false);
  },
);

it("restores the genuine 28eeca0 catalog while preserving neighboring steps, positions and unrelated edits", () => {
  expect(hashRegistryValue(previous)).toBe(
    "1e8d7d7438fd10e319ead0ed5b00f90bf89f5f438f2efb792e10f2f6699015f1",
  );
  expect(restore(previous)).toBe(previous);
  lessons.forEach((lesson, index) => {
    const target = examples.find((item) => item.lessonId === lesson.id);
    if (!target) {
      expect(previous[index]).toBe(lesson);
      return;
    }
    const before = previous[index];
    expect(before.steps.map((s) => s.id)).toEqual(
      lesson.steps.map((s) => s.id),
    );
    before.steps.forEach((step, i) => {
      if (step.id !== target.stepId) expect(step).toBe(lesson.steps[i]);
    });
  });
  const drift = lessons.map((l) =>
    l.id === "log-records"
      ? {
          ...l,
          steps: l.steps.map((s) =>
            s.id === "records-recall"
              ? { ...s, prompt: "Unreviewed prompt" }
              : s,
          ),
        }
      : l,
  );
  const projected = restore(drift);
  expect(
    projected
      .find((l) => l.id === "log-records")!
      .steps.find((s) => s.id === "records-recall")!.prompt,
  ).toBe("Unreviewed prompt");
  expect(hashRegistryValue(projected)).not.toBe(hashRegistryValue(previous));
});
