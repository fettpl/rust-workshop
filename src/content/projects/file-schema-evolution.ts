// Operational metadata is MIT. Original Polish teaching prose is CC BY 4.0.
import type { ProjectContract } from "../../domain/types";
import { fileSchemaEvolutionPackage } from "./file-schema-evolution/package";

export { fileSchemaEvolutionPackage };

export const fileSchemaEvolutionProject: ProjectContract = {
  id: "file-schema-evolution",
  title: "Jawna aktualizacja formatu pliku",
  objective:
    "Przenieś znaczenie zadań ze starej wersji i zapisz nowy format tylko po jawnym poleceniu.",
  lessonId: "file-schema-normalization",
  lessonIds: ["file-schema-normalization", "file-schema-explicit-upgrade"],
  adversarialLessonId: "file-schema-explicit-upgrade",
  reviewConceptIds: ["file-version-meaning"],
  requiredBehaviors: [
    "Nadaj zadaniom V1 identyfikatory według kolejności wierszy, zachowując tytuły, stany i powtórzenia.",
    "Zachowaj identyfikatory i zapisany NEXT dla poprawnego pliku V2.",
    "Zastąp poprawny plik V1 tylko przy jawnej aktualizacji. Zatrzymaj się przed zapisem, gdy zawartość źródła się zmieniła.",
  ],
  requiredEvidence: [
    "Porównanie dokładnych danych i oczekiwanych bajtów dla dwóch przykładów V1.",
    "Przykład V2 z luką między identyfikatorami i zachowaną historią NEXT.",
    "Sprawdzenie bajtów i zawartości katalogu po aktualizacji, odmowie i kolizji pliku tymczasowego.",
  ],
  constraints: [
    "Zakładaj jednego zapisującego i pracuj na własnej kopii pliku.",
    "Odczyt i przygotowanie planu nie zapisują pliku.",
    "Brak gwarancji utrwalenia zmiany po utracie zasilania.",
  ],
  adversarialInject:
    "Między przygotowaniem planu a aktualizacją zmieniła się treść pliku. Zachowaj zmienione bajty i zastany plik tymczasowy.",
  retrospective: [
    "Dlaczego po usunięciu zadania nie można obliczyć NEXT z widocznych identyfikatorów?",
    "Kiedy następuje aktualizacja i co oznacza błąd wypisania komunikatu po niej?",
  ],
  package: fileSchemaEvolutionPackage,
};
