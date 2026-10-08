import type { CourseModule } from "../domain/types";

const skills = [
  [
    "api-validated-construction",
    "Publiczny konstruktor chroni reguły wartości, a konwersja odrzuca niepoprawne dane.",
  ],
  [
    "api-error-source-chain",
    "Błąd zachowuje kontekst operacji i oryginalną przyczynę dostępną przez Error::source.",
  ],
  [
    "api-trait-compatibility",
    "Rozszerzenie traitu zachowuje wcześniejsze implementacje i sposób użycia przez dyn.",
  ],
  [
    "api-compatible-surface",
    "Wcześniejsze ścieżki, sygnatury i zachowanie API pozostają zgodne z kontraktem klienta.",
  ],
] as const;

export const publicApiModule: CourseModule = {
  id: "public-api-workspaces",
  title: "Publiczne API i workspace Cargo",
  whyItMatters:
    "Biblioteka może przechodzić własne testy, a po aktualizacji przestać działać u jej użytkowników. Zaprojektujesz granicę API, zachowasz przyczyny błędów i sprawdzisz zmianę z perspektywy kodu klienta.",
  capabilities: [
    "Zbudujesz typ, którego publiczne operacje zachowują reguły poprawności.",
    "Przekażesz błąd z kontekstem bez utraty jego oryginalnej przyczyny.",
    "Sprawdzisz, jak zmiana traitu wpływa na implementerów i odbiorców dyn.",
    "Zachowasz dawny sposób wywołania API podczas rozbudowy biblioteki.",
    "Przećwiczysz osobnego klienta, features i MSRV w pobieranym workspace Cargo.",
  ],
  prerequisites: ["testing-quality", "traits", "modules-cargo"],
  lessonIds: skills.map(([lessonId]) => lessonId),
  exitGate: [
    "Rozwiążesz cztery nowe kontrakty API bez podglądania referencji.",
    "Testy sprawdzą poprawność wartości, źródła błędów oraz wcześniejsze sposoby użycia API. Nie są pełnym dowodem zgodności każdej przyszłej zmiany.",
  ],
  projectConnection:
    "W laboratorium protokołu ramek biblioteka i klient są osobnymi pakietami Cargo. Testy projektu sprawdzają publiczną granicę, konfiguracje features i minimalny kompilator; ćwiczenie jednego pliku w przeglądarce nie zastępuje tych kontroli. Zakładasz praktykę testowania, traitów i modułów Cargo; możesz od razu zacząć od małej biblioteki bez Tokio i osobnego klienta.",
  assessmentId: "api-compatible-surface/api-compatible-surface-blank",
  gateCriteria: skills.map(([lessonId, label]) => ({
    id: `${lessonId}-contract`,
    label,
    taskRefs: [
      { lessonId, stepId: `${lessonId}-gate` },
      { lessonId, stepId: `${lessonId}-blank` },
    ],
  })),
};
