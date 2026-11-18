import type { CourseModule } from "@/domain/types";

export const tokioFlowModule: CourseModule = {
  id: "tokio-flow-control",
  title: "Tokio: przepływ i zamknięcie",
  whyItMatters:
    "Producent może dostarczać pracę szybciej niż odbiorca ją kończy. Zaprojektujesz pojemność kolejki, zachowanie danych po anulowaniu i zamknięcie, które rozlicza zaakceptowaną pracę.",
  capabilities: [
    "Ograniczysz kolejkę bounded mpsc i odbierzesz dane po zamknięciu wejścia.",
    "Zarezerwujesz miejsce przed przeniesieniem danych i sprawdzisz, co zachowuje anulowanie.",
    "Odróżnisz timeout posiadanego Future od końca oczekiwania na niezależne zadanie.",
    "Zachowasz trwającą operację między iteracjami select i nazwiesz politykę priorytetu.",
    "Zamkniesz wejście, opróżnisz bufor oraz zbierzesz sukcesy i błędy dzieci.",
  ],
  prerequisites: ["tokio-runtime-tasks"],
  lessonIds: [
    "tokio-bounded-channels",
    "tokio-reservation-cancellation",
    "tokio-timeouts",
    "tokio-select-cancellation",
    "tokio-graceful-shutdown",
  ],
  exitGate: [
    "Samodzielnie potwierdzisz sześć kontraktów: pojemność, rezerwację, czas, select, zamknięcie z drainem i pełny raport dzieci.",
    "Testy obserwują dane i zasoby, także poza happy path.",
  ],
  projectConnection:
    "Laboratorium Tokio łączy bounded queue, limit aktywnych zadań, deadline i pełny raport zamknięcia w jednym pakiecie Cargo.",
  assessmentId: "tokio-graceful-shutdown/tokio-graceful-shutdown-join-blank",
  gateCriteria: [
    {
      id: "tokio-bounded-flow",
      label:
        "Pełny bufor wstrzymuje nadawcę, a zamknięcie zachowuje przyjęte dane.",
      taskRefs: [
        {
          lessonId: "tokio-bounded-channels",
          stepId: "tokio-bounded-channels-send-gate",
        },
        {
          lessonId: "tokio-bounded-channels",
          stepId: "tokio-bounded-channels-blank",
        },
      ],
    },
    {
      id: "tokio-reserved-transfer",
      label:
        "Anulowanie oczekiwania nie zabiera danych przechowanych poza Future.",
      taskRefs: [
        {
          lessonId: "tokio-reservation-cancellation",
          stepId: "tokio-reservation-cancellation-retain-gate",
        },
        {
          lessonId: "tokio-reservation-cancellation",
          stepId: "tokio-reservation-cancellation-blank",
        },
      ],
    },
    {
      id: "tokio-deadline-ownership",
      label:
        "Deadline zachowuje właściwy wynik i nie jest mylony z zatrzymaniem niezależnego dziecka.",
      taskRefs: [
        { lessonId: "tokio-timeouts", stepId: "tokio-timeouts-owned-gate" },
        { lessonId: "tokio-timeouts", stepId: "tokio-timeouts-blank" },
      ],
    },
    {
      id: "tokio-select-retained-work",
      label:
        "Gałęzie select zachowują dane i trwającą operację zgodnie z jawną polityką.",
      taskRefs: [
        {
          lessonId: "tokio-select-cancellation",
          stepId: "tokio-select-cancellation-recv-gate",
        },
        {
          lessonId: "tokio-select-cancellation",
          stepId: "tokio-select-cancellation-blank",
        },
      ],
    },
    {
      id: "tokio-close-and-drain",
      label:
        "Sygnał true zamyka wejście, a drain rozlicza bufor i wcześniejsze rezerwacje zgodnie z polityką watch.",
      taskRefs: [
        {
          lessonId: "tokio-graceful-shutdown",
          stepId: "tokio-graceful-shutdown-drain-gate",
        },
      ],
    },
    {
      id: "tokio-signal-and-join",
      label:
        "Sygnał stop i pełny raport zachowują tożsamość, wyniki oraz JoinError wszystkich dzieci.",
      taskRefs: [
        {
          lessonId: "tokio-graceful-shutdown",
          stepId: "tokio-graceful-shutdown-join-blank",
        },
        {
          lessonId: "tokio-graceful-shutdown",
          stepId: "tokio-graceful-shutdown-join-transfer",
        },
      ],
    },
  ],
};
