import type { CourseModule } from "@/domain/types";

export const tokioIoModule: CourseModule = {
  id: "tokio-io-streams",
  title: "Tokio: I/O i strumienie",
  whyItMatters:
    "Odczyt może dostarczyć fragment wiadomości, a przerwana operacja może już mieć skutki. Nauczysz się wyznaczać granice danych, zachowywać postęp i odbierać strumień bez utraty kolejnego elementu.",
  capabilities: [
    "Przekażesz pełną odpowiedź i ograniczony fragment wejścia mimo częściowych odczytów i zapisów.",
    "Odróżnisz koniec wejścia od uciętej ramki i sprawdzisz rozmiar przed alokacją lub wysłaniem danych.",
    "Zachowasz prefiks odczytu i offset zapisu po anulowaniu oczekiwania.",
    "Pobierzesz elementy przypiętego Stream bez wymagania Unpin i bez zjadania kolejnego elementu.",
    "Rozdzielisz zatrzymanie odbioru od zamknięcia i opróżnienia kanału.",
  ],
  prerequisites: ["tokio-flow-control"],
  lessonIds: [
    "tokio-async-read-write",
    "tokio-framing-eof",
    "tokio-retained-frame-progress",
    "tokio-stream-next",
    "tokio-receiver-stream-drain",
  ],
  exitGate: [
    "Samodzielnie potwierdzisz sześć kontraktów: pełne I/O, granice ramek, zachowanie postępu, odbiór Stream, zamknięcie z drainem i stop bez utraty elementu.",
    "Testy sprawdzą bajty, niepełne operacje, błędy, anulowanie i własność elementów.",
  ],
  projectConnection:
    "Przygotujesz warstwę odczytu ramek i kontroli wejścia do dalszego rozwinięcia laboratorium pipeline. Ćwiczenia używają duplex i kanałów; sieć TCP będzie osobnym etapem projektu.",
  assessmentId:
    "tokio-receiver-stream-drain/tokio-receiver-stream-drain-next-or-stop-blank",
  gateCriteria: [
    {
      id: "tokio-complete-io",
      label:
        "Częściowe I/O zachowuje całą odpowiedź lub dokładnie wyznaczony fragment wejścia.",
      taskRefs: [
        {
          lessonId: "tokio-async-read-write",
          stepId: "tokio-async-read-write-reply-gate",
        },
        {
          lessonId: "tokio-async-read-write",
          stepId: "tokio-async-read-write-transfer-blank",
        },
      ],
    },
    {
      id: "tokio-frame-boundaries",
      label:
        "Format rozróżnia EOF i ucięcie, a limit działa przed odczytem treści lub zapisem ramki.",
      taskRefs: [
        {
          lessonId: "tokio-framing-eof",
          stepId: "tokio-framing-eof-read-gate",
        },
        {
          lessonId: "tokio-framing-eof",
          stepId: "tokio-framing-eof-write-blank",
        },
      ],
    },
    {
      id: "tokio-io-retained-progress",
      label:
        "Wznowienie po anulowaniu nie gubi odebranych bajtów ani nie powiela wysłanego prefiksu.",
      taskRefs: [
        {
          lessonId: "tokio-retained-frame-progress",
          stepId: "tokio-retained-frame-progress-read-gate",
        },
        {
          lessonId: "tokio-retained-frame-progress",
          stepId: "tokio-retained-frame-progress-write-blank",
        },
      ],
    },
    {
      id: "tokio-pinned-stream-consumption",
      label:
        "Limit lub dopasowanie kończą odbiór bez dodatkowego poll i utraty następnego elementu.",
      taskRefs: [
        {
          lessonId: "tokio-stream-next",
          stepId: "tokio-stream-next-take-at-most-gate",
        },
        {
          lessonId: "tokio-stream-next",
          stepId: "tokio-stream-next-first-matching-blank",
        },
      ],
    },
    {
      id: "tokio-receiver-close-and-drain",
      label:
        "Zamknięcie ReceiverStream odrzuca nowe send i opróżnia bufor oraz wcześniejsze rezerwacje.",
      taskRefs: [
        {
          lessonId: "tokio-receiver-stream-drain",
          stepId: "tokio-receiver-stream-drain-close-and-drain-gate",
        },
        {
          lessonId: "tokio-receiver-stream-drain",
          stepId: "tokio-receiver-stream-drain-partition-transfer",
        },
      ],
    },
    {
      id: "tokio-receiver-stop-preserves-next",
      label:
        "Stop ma pierwszeństwo przed odczytem i zachowuje kolejny element ReceiverStream.",
      taskRefs: [
        {
          lessonId: "tokio-receiver-stream-drain",
          stepId: "tokio-receiver-stream-drain-next-or-stop-blank",
        },
        {
          lessonId: "tokio-receiver-stream-drain",
          stepId: "tokio-receiver-stream-drain-batch-or-stop-transfer",
        },
      ],
    },
  ],
};

export const tokioBlockingModule: CourseModule = {
  id: "tokio-blocking-work",
  title: "Tokio: praca blokująca",
  whyItMatters:
    "Blokujące wywołanie może zatrzymać postęp zadań async. Przeniesiesz skończoną pracę na pulę wątków i zachowasz odpowiedzialność za jej wynik, limit oraz rzeczywiste zakończenie.",
  capabilities: [
    "Dobierzesz granicę Send i 'static dla pracy uruchamianej przez spawn_blocking.",
    "Odbierzesz wynik lub JoinError i wrócisz do lokalnego kodu async.",
    "Poprosisz rozpoczęte zadanie o zakończenie i zaczekasz na jego cleanup.",
    "Utrzymasz limit przez cały czas działania closure, również po abort uchwytu.",
  ],
  prerequisites: ["tokio-io-streams"],
  lessonIds: [
    "tokio-spawn-blocking-boundary",
    "tokio-blocking-cooperative-stop",
  ],
  exitGate: [
    "Samodzielnie napiszesz granicę async/blocking i nowy wariant kontroli zakończenia lub pojemności.",
    "Wynik testu potwierdzi życie zasobu i koniec pracy, a nie tylko koniec oczekiwania.",
  ],
  projectConnection:
    "Te kontrakty przygotowują integrację blokującego parsera lub obliczeń z asynchronicznym pipeline. Limit przyjęć i koszt pracy pozostają odrębnymi decyzjami projektowymi.",
  assessmentId:
    "tokio-blocking-cooperative-stop/tokio-blocking-cooperative-stop-blank",
  gateCriteria: [
    {
      id: "tokio-blocking-owned-boundary",
      label:
        "Praca działa na puli blocking i zachowuje wynik lub JoinError bez zbędnych ograniczeń na lokalny kod async.",
      taskRefs: [
        {
          lessonId: "tokio-spawn-blocking-boundary",
          stepId: "tokio-spawn-blocking-boundary-owned-gate",
        },
        {
          lessonId: "tokio-spawn-blocking-boundary",
          stepId: "tokio-spawn-blocking-boundary-blank",
        },
        {
          lessonId: "tokio-spawn-blocking-boundary",
          stepId: "tokio-spawn-blocking-boundary-map-transfer",
        },
      ],
    },
    {
      id: "tokio-blocking-lifetime-control",
      label:
        "Zamknięcie i permit obejmują prawdziwy czas działania rozpoczętej pracy blokującej.",
      taskRefs: [
        {
          lessonId: "tokio-blocking-cooperative-stop",
          stepId: "tokio-blocking-cooperative-stop-stop-gate",
        },
        {
          lessonId: "tokio-blocking-cooperative-stop",
          stepId: "tokio-blocking-cooperative-stop-blank",
        },
      ],
    },
  ],
};
