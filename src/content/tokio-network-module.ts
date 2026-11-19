import type { CourseModule } from "@/domain/types";

const skills = [
  [
    "tokio-tcp-connect",
    "Połączenie zachowuje własność gniazda, dokładne bajty i właściwy błąd I/O.",
  ],
  [
    "tokio-tcp-half-close",
    "Zamknięcie kierunku zapisu przekazuje EOF, a odbiór nadal działa.",
  ],
  [
    "tokio-frame-deadlines",
    "Cała ramka ma jeden deadline; błąd I/O i upływ czasu pozostają rozróżnialne.",
  ],
  [
    "tokio-admission-lifecycle",
    "Limit obejmuje przyjętą pracę aż do jej końca, a zamknięcie rozlicza zadania.",
  ],
] as const;

export const tokioNetworkModule: CourseModule = {
  id: "tokio-network-service",
  title: "Tokio: sieć i serwis",
  whyItMatters:
    "Klient może wysyłać dane powoli, przerwać połączenie albo nie odebrać odpowiedzi. Połączysz protokół wiadomości z czasem, pojemnością i odpowiedzialnością za pracę już przyjętą przez serwis.",
  capabilities: [
    "Połączysz klienta i serwer TCP oraz zachowasz gniazdo do dalszej wymiany danych.",
    "Oddzielisz EOF od zamknięcia całego połączenia i użyjesz obu kierunków świadomie.",
    "Zastosujesz jeden limit czasu do całej ramki i określisz skutki częściowego wykonania.",
    "Ograniczysz przyjmowanie połączeń i utrzymasz permit do rzeczywistego końca zadania.",
    "Sprawdzisz zamknięcie serwisu przy aktywnych klientach i pracy blokującej.",
  ],
  prerequisites: ["tokio-blocking-work"],
  lessonIds: skills.map(([lessonId]) => lessonId),
  exitGate: [
    "Rozwiążesz nowy kontrakt z każdej z czterech umiejętności bez pełnego rozwiązania.",
    "Testy sprawdzą dane, czas, własność zasobów i zakończenie pracy przy błędzie lub zatrzymaniu.",
  ],
  projectConnection:
    "Laboratorium serwisu TCP łączy ramki, deadline, ograniczoną kolejkę i pulę pracy blokującej. Uruchomisz je lokalnie, przeanalizujesz raport zamknięcia i zapiszesz decyzje o granicach zasobów.",
  assessmentId: "tokio-admission-lifecycle/tokio-admission-lifecycle-blank",
  gateCriteria: skills.map(([lessonId, label]) => ({
    id: `${lessonId}-contract`,
    label,
    taskRefs: [
      { lessonId, stepId: `${lessonId}-gate` },
      { lessonId, stepId: `${lessonId}-blank` },
      ...(lessonId === "tokio-frame-deadlines"
        ? [{ lessonId, stepId: "tokio-frame-deadlines-owned-discard-transfer" }]
        : []),
    ],
  })),
};
