import type { CourseModule, Lesson, LessonStep } from "../domain/types";
import { capstoneIntegrationModule } from "./capstone-integration";

const lessonId = "capstone-maintenance-recovery";

function choiceStep(options: {
  id: string;
  title: string;
  prompt: string;
  choices: [string, string, string];
  correct: string;
  explanations: [string, string, string];
}): LessonStep {
  return {
    id: options.id,
    kind: "predict",
    title: options.title,
    prompt: options.prompt,
    choices: options.choices.map((label, index) => ({
      id: String(index),
      label,
    })),
    evaluator: {
      kind: "choice",
      correct: options.correct,
      explanations: Object.fromEntries(
        options.explanations.map((explanation, index) => [
          String(index),
          explanation,
        ]),
      ),
    },
    evidenceKind: "prediction",
  };
}

function rubricStep(options: {
  id: string;
  kind: "explain" | "observe";
  title: string;
  prompt: string;
  criteria: string[];
  evidenceKind: "exposure" | "self-rating";
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    evaluator: { kind: "rubric", criteria: options.criteria },
    rubric: options.criteria,
    evidenceKind: options.evidenceKind,
  };
}

export const capstoneMaintenanceRecoveryLesson: Lesson = {
  practiceOnly: true,
  id: lessonId,
  moduleId: "capstone-integration",
  conceptIds: [
    "capstone-bounded-lifecycle-contract",
    "capstone-incident-recovery-contract",
  ],
  competencyIds: [
    "capstone-bounded-lifecycle-competency",
    "capstone-incident-recovery-competency",
  ],
  prerequisites: ["capstone-incident-recovery"],
  title: "Zaplanuj utrzymanie po przerwanym żądaniu",
  subtitle:
    "Przećwiczysz granicę utrzymania, trwałą tożsamość i odpowiedź Unknown bez uruchamiania kodu uczącego się.",
  minutes: 16,
  outcomes: [
    "Rozróżnisz zamknięcie admission, commit, dostarczenie odpowiedzi i Unknown.",
    "Opiszesz własne wymaganie utrzymaniowe oraz granicę zaufania bez kopiowania architektury referencyjnej.",
    "Zostawisz nieuzupełniony plan review, zmiany Stage B i nierozstrzygnięte komórki.",
  ],
  steps: [
    choiceStep({
      id: "capstone-maintenance-predict",
      title: "Najpierw zamknij admission",
      prompt:
        "W kontrolowanym drenażu masz przyjęte zadania, ale nie chcesz przyjąć nowego klienta po rozpoczęciu zamykania. Co zapisujesz jako pierwszą decyzję?",
      choices: [
        "Zamykam admission, rozliczam przyjęte zadania, a nowe odrzucam bez wywołania Store.",
        "Przyjmuję nowe zadanie i liczę, że timeout zastąpi jawne rozliczenie.",
        "Uznam brak odpowiedzi za commit i dopiero potem zamknę admission.",
      ],
      correct: "0",
      explanations: [
        "Granica przyjęcia i rozliczenie istniejącej pracy muszą być jawne; odrzucone nowe zadanie nie jest wywołaniem Store.",
        "Timeout nie jest stanem domenowym ani dowodem zakończenia pracy.",
        "Brak odpowiedzi nie rozstrzyga, czy commit się udał.",
      ],
    }),
    choiceStep({
      id: "capstone-maintenance-contrast",
      title: "Oddziel commit od dostarczenia",
      prompt:
        "Który kontrast zachowuje trwałą tożsamość po utracie odpowiedzi klienta?",
      choices: [
        "Ten sam klucz i treść po restarcie daje Duplicate z pierwotnym receipt; brak potwierdzenia dostarczenia pozostaje osobnym faktem.",
        "Brak odpowiedzi zawsze oznacza rollback, więc można wykonać nowy INSERT.",
        "Dostarczona odpowiedź zawsze dowodzi, że trwały commit zakończył się wcześniej.",
      ],
      correct: "0",
      explanations: [
        "Durable identity, commit i delivery są osobnymi obserwacjami; replay rozstrzyga istniejącą tożsamość bez drugiego INSERT.",
        "Brak odpowiedzi nie jest dowodem rollbacku.",
        "Delivery nie zastępuje niezależnego sprawdzenia trwałego zapisu.",
      ],
    }),
    rubricStep({
      id: "capstone-maintenance-explain",
      kind: "explain",
      title: "Opisz granicę zaufania",
      prompt:
        "Zapisz własną krótką odpowiedź: jak rozdzielisz durable identity, wynik Store, dostarczenie odpowiedzi i granicę zaufania lokalnego dowodu? Nie przepisuj nazw ani układu referencyjnego.",
      criteria: [
        "Odpowiedź rozróżnia identity/receipt, commit, delivery oraz Unknown.",
        "Odpowiedź wskazuje lokalny zakres dowodu i ograniczenie zaufania bez obietnicy publicznego bezpieczeństwa.",
      ],
      evidenceKind: "self-rating",
    }),
    rubricStep({
      id: "capstone-maintenance-packet",
      kind: "observe",
      title: "Zostaw własny pakiet utrzymania",
      prompt:
        "Obejrzyj pusty pakiet A8-MAINTENANCE.md jako referencję autora. Zapisz inne wymaganie, dwie alternatywy i własne miejsce granicy; pakiet nie jest wymaganym API, architekturą ani graderem.",
      criteria: [
        "Plan pozostaje nieuzupełniony i wskazuje własne wymaganie inne niż kopiowanie referencyjnego układu.",
        "Plan oddziela samoocenę, pobraną referencję i pomoc od dowodu Cargo oraz nie obiecuje automatycznego zaliczenia.",
      ],
      evidenceKind: "exposure",
    }),
    rubricStep({
      id: "capstone-maintenance-review-response",
      kind: "explain",
      title: "Przygotuj odpowiedź na review",
      prompt:
        "Zostaw szkic odpowiedzi na jeden komentarz review: jaka jest decyzja, jaka zmiana Stage B wynika z komentarza i która komórka pozostaje nierozstrzygnięta?",
      criteria: [
        "Szkic zawiera komentarz, jawną decyzję/disposition i konkretną zmianę Stage B.",
        "Szkic zachowuje nierozstrzygniętą komórkę zamiast dopisywać sukces lub pomiar.",
      ],
      evidenceKind: "self-rating",
    }),
    rubricStep({
      id: "capstone-maintenance-witness",
      kind: "observe",
      title: "Wskaż istniejący witness",
      prompt:
        "Poznaj istniejący kontrakt capstone-incident-recall jako opcjonalny witness. Zaznaczenie ekspozycji nie tworzy nowej fixture, review ani niezależnego credit.",
      criteria: [
        "Wskazano istniejący capstone-incident-recall jako referencyjny witness, bez tworzenia nowej fixture lub review.",
      ],
      evidenceKind: "exposure",
    }),
  ],
  misconceptions: [
    "Brak odpowiedzi klienta jest tym samym co rollback.",
    "Zamknięcie admission przyjmuje jeszcze jedno zadanie, jeśli Store ma miejsce.",
    "Pobrany pakiet albo samoocena dowodzi niezależnego wykonania.",
  ],
  transferTask:
    "Wybierz inne wymaganie utrzymaniowe i zapisz jego własną granicę przyjęcia, trwałości, dostarczenia, zaufania oraz review.",
  evidenceGate:
    "To opcjonalna praktyka bez bramki, niezależnego zaliczenia, nowej fixture i opartych na czasie obietnic.",
  sourceIds: [
    "capstone-tokio-mpsc",
    "capstone-tokio-blocking",
    "capstone-sqlite-transactions",
    "capstone-rusqlite-transactions",
    "capstone-rust-errors",
  ],
};

export const capstoneMaintenanceModuleExtension: CourseModule = {
  ...capstoneIntegrationModule,
  lessonIds: [...capstoneIntegrationModule.lessonIds, lessonId],
  exitGate: [
    ...capstoneIntegrationModule.exitGate,
    "Opcjonalna praktyka utrzymania nie jest nową bramką ani niezależnym zaliczeniem.",
  ],
};
