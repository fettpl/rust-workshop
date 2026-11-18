/** Persistent identities for the learner-owned project; these are notes, not evidence. */
export const STUDY_SESSION_PROJECT_ID = "log-analyzer-project";
export const STUDY_SESSION_ENDPOINT_STEP_ID = "report-blank";
export const STUDY_SESSION_ENTRY_LABEL = "Otwórz własny Study Session CLI";

export const studySessionNoteFields = [
  {
    key: "study-session:first-design",
    label: "Pierwsza wersja — decyzja projektowa",
    stage: "first",
    guidance:
      "Kto jest właścicielem nazw w raporcie? Uzasadnij wybór struktury danych. Wskaż, gdzie Twój kod odróżnia błędny rekord od błędu odczytu pliku. Zapisz, z jakiej dokumentacji lub pomocy korzystasz.",
  },
  {
    key: "study-session:first-test",
    label: "Pierwsza wersja — własny test",
    stage: "first",
    guidance:
      "Pokaż własny test błędnego rekordu oraz agregacji z kolejnością, jego wynik i nieudany test, który zmienił Twoją decyzję.",
  },
  {
    key: "study-session:first-cli-results",
    label: "Pierwsza wersja — rzeczywiste wyniki CLI",
    stage: "first",
    guidance:
      "Wklej faktycznie wykonane polecenia, wejście, stdout, stderr i kod wyjścia dla pliku poprawnego i mieszanego. Jeśli jeszcze ich nie uruchomiono, zapisz to wprost.",
  },
  {
    key: "study-session:change-regression",
    label: "Po przeglądzie — test regresji zmiany",
    stage: "change",
    guidance:
      "Zapisz wynik pierwszej samooceny lub przeglądu zewnętrznego oraz wcześniejszy kontakt ze zmianą. Pokaż własny kontrakt --min-total N, test nowego filtra i test zachowania starego wywołania, diagnostyki oraz kodów wyjścia wraz z wynikami.",
  },
  {
    key: "study-session:remaining-limit",
    label: "Po przeglądzie — pozostała granica",
    stage: "change",
    guidance:
      "Opisz, co po zmianie pozostaje niesprawdzone, i jaki kolejny test lub obserwacja pozwoli to sprawdzić.",
  },
] as const;

export function studySessionNoteTitle(key: string): string | undefined {
  const field = studySessionNoteFields.find((field) => field.key === key);
  return field ? `Study Session CLI — ${field.label}` : undefined;
}
