import type { CourseModule } from "../domain/types";

const criteria = [
  [
    "variance-shared-views",
    "Skracasz wspólny widok bez zmiany właściciela i sprawdzasz zgodność typów klienta.",
  ],
  [
    "variance-mutable-slots",
    "Oddzielasz czas mutowalnej pożyczki slotu od czasu referencji zapisanej w środku.",
  ],
  [
    "hrtb-local-visitors",
    "Przyjmujesz callback działający dla każdej lokalnej pożyczki, bez zbędnego wymagania 'static.",
  ],
  [
    "hrtb-borrowed-projections",
    "Opisujesz wynik pożyczony na czas wejścia i zużywasz go, zanim właściciel zniknie.",
  ],
] as const;

export const borrowedCallbacksModule: CourseModule = {
  id: "borrowed-callbacks",
  title: "Pożyczone API: wariancja i HRTB",
  whyItMatters:
    "Poprawna relacja lifetimes pozwala użyć biblioteki z lokalnymi danymi i callbackami. Sprawdzisz, kiedy widok można skrócić, dlaczego mutowalny slot wymaga ostrożności i jak przyjąć funkcję działającą dla wielu różnych pożyczek.",
  capabilities: [
    "Rozpoznasz kierunek zgodności współdzielonych widoków oraz argumentów i wyników funkcji.",
    "Naprawisz zbyt długą mutowalną pożyczkę bez klonowania przechowywanych danych.",
    "Zaprojektujesz FnMut dla danych żyjących tylko wewnątrz pojedynczego wywołania.",
    "Odróżnisz stały typ wyniku od widoku, którego lifetime zależy od pożyczonego wejścia.",
  ],
  prerequisites: ["closures"],
  lessonIds: criteria.map(([id]) => id),
  exitGate: [
    "Rozwiążesz cztery kontrakty sprawdzane przez kod klienta i testy zachowania.",
    "Po podglądzie rozwiązania zostaje świeże zadanie od pustej kartki. Powtórki sprawdzą te same umiejętności na kolejnych kontraktach.",
  ],
  projectConnection:
    "Pożyczone widoki przydają się w parserach i analizatorach tekstu. Ten moduł sprawdza kontrakty typów i callbacków w bezpiecznym Rust; pomiary wydajności, GAT i wariancja kodu unsafe wymagają dalszych ćwiczeń.",
  assessmentId: "hrtb-borrowed-projections/hrtb-borrowed-projections-blank",
  gateCriteria: criteria.map(([id, label]) => ({
    id: `${id}-contract`,
    label,
    taskRefs: [
      { lessonId: id, stepId: `${id}-gate` },
      { lessonId: id, stepId: `${id}-blank` },
    ],
  })),
};
