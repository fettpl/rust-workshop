import { durableLogServicePackage } from "./durable-log-service/archive";

export const durableLogServiceProject = {
  id: "durable-log-service",
  title: "Projekt: trwały serwis logów",
  objective:
    "Zbuduj loopbackowy serwis ingestujący zdarzenia z idempotentnym receipt, trwałym magazynem i dowodem restartu.",
  requiredBehaviors: [
    "Walidacja domeny odrzuca przekroczenia bajtów i znaki sterujące.",
    "Retry tego samego klucza zwraca pierwotny sequence.",
    "Shutdown dołącza workera i bilansuje przyjęte prace.",
  ],
  requiredEvidence: [
    "Testy publicznego API i protokołu.",
    "Testy transakcji i migracji.",
    "Testy loopback, restartu i procesu.",
    "Wypełniony pakiet A8-MAINTENANCE.md i własny plan przeglądu utrzymania.",
  ],
  constraints: [
    "Tylko loopback i bounded zasoby.",
    "Brak unsafe oraz publicznego listenera.",
    "Pobranie paczki nie przyznaje mastery.",
  ],
  lessonId: "capstone-domain-boundary",
  adversarialLessonId: "capstone-release-evidence",
  adversarialInject:
    "Po utracie odpowiedzi klient ponawia to samo żądanie, a raport wydania może dotyczyć innego digestu.",
  retrospective: [
    "Który dowód był niezależny od referencji?",
    "Który wynik pozostał Unknown?",
    "Jakie ograniczenie pozostaje otwarte?",
  ],
  learnerInstruction: {
    title: "Zmiana wymagania: limit K na strumień",
    summary:
      "Rozszerz własny lokalny projekt o konfigurowalny limit K dla nowo zatwierdzanych rekordów każdego strumienia. To problem do rozwiązania we własnym kodzie, bez podanego API ani układu plików.",
    points: [
      "Wcześniej zatwierdzone rekordy liczą się do limitu K. Dla `K=1` pokaż pierwszy zapis, identyczną idempotentną ponowną próbę przy pełnym limicie, konflikt przy ponownym użyciu tego samego ID oraz odrzucenie nowego ID przy pełnym limicie.",
      "Odrzucenie nowego ID przy pełnym limicie nie może utworzyć zatwierdzonego wiersza ani potwierdzenia sukcesu. Konflikt istniejącego ID pozostaje konfliktem, a identyczna próba nadal jest sukcesem.",
      "Pokaż `K=2` osobno dla co najmniej dwóch strumieni i sprawdź, że restart zachowuje rozliczenie pojemności. Istniejące żądania klienta pozostają zgodne poza opisanym odrzuceniem z powodu pełnego limitu.",
      "Zbadaj awarię magazynu i brak częściowego zapisu. Próby jednoczesne dodaj tylko wtedy, gdy deklarujesz obsługę współbieżności; implementacja jednoprocesowa może jasno opisać i zademonstrować swoją granicę.",
      "Wybierz miejsce reguły i uzasadnij granicę transakcji oraz przyjęcia żądania. Nie kopiuj wewnętrznych nazw, sygnatur ani układu rozwiązania referencyjnego.",
      "Przygotuj własne testy i dowody dla sekwencji `K=1`, dwóch strumieni przy `K=2`, restartu, awarii magazynu oraz zadeklarowanej granicy współbieżności.",
      "Użyj `CHANGE-REVIEW.md` z pakietu: wskaż własną wersję źródeł i narzędzi, porównaj dwa projekty rozwiązania, zachowaj rzeczywiście nieudane polecenie oraz wynik poprawki. Oddaj etap A do przeglądu przed etapem B.",
      "Zachowaj niezależny limit globalny. Własna integracja klient–serwis–magazyn wymaga własnych testów; test magazynu autora kursu jej nie dowodzi.",
      "Rozdziel samoocenę od przeglądu człowieka lub obserwacji pracy. Pobrany pakiet i znane studium przypadku są pomocą; nie są automatycznym wykonaniem kodu uczącego się ani zaliczeniem tego zadania.",
    ],
    followUp: {
      title: "Po przeglądzie: obniżenie i podniesienie K",
      summary:
        "Etap B wykonaj po przeglądzie pierwszej wersji. Ta karta i źródła są publiczne: zapisz, czy wymaganie było wcześniej znane. To znana zmiana wymagania, jeśli już ją widziano; zwinięcie karty nie zapewnia niewidzianego transferu.",
      points: [
        "Zatwierdź dwa rekordy jednego strumienia przy `K=2`. Zamknij magazyn i otwórz go z `K=1`: oba rekordy muszą przetrwać, identyczna próba zwraca pierwotny receipt, zmieniona treść lub korelacja nadal daje konflikt. Nowy ID jest odrzucany bez zapisu i sukcesu.",
        "Po kolejnym zamknięciu otwórz magazyn z `K=3`: przyjmij dokładnie jeden nowy rekord i odrzuć następny. Sprawdź receipt oraz liczbę wierszy, osobny strumień i zachowany limit globalny. Zmiana dotyczy ponownego otwarcia, bez usuwania rekordów i bez przeładowania działającego procesu.",
        "W `CHANGE-REVIEW.md` powiąż zmianę własnych źródeł i testów z rzeczywistymi poleceniami, wynikami oraz uwagami recenzenta. Rozdziel samoocenę, przegląd źródeł przez inną osobę i obserwację pracy; zapisz wcześniejszą pomoc i ekspozycję.",
        "Sprawdź własną integrację klient–serwis–magazyn. Referencja autora dowodzi opcjonalnej reguły Store; domyślny serwis jej nie włącza. Odczyt, pobranie i samoopis nie przyznaje zaliczenia, mastery ani dowodu samodzielności.",
      ],
    },
  },
  lessonIds: [
    "capstone-domain-boundary",
    "capstone-idempotent-commit",
    "capstone-bounded-lifecycle",
    "capstone-protocol-evolution",
    "capstone-incident-recovery",
    "capstone-release-evidence",
    "capstone-maintenance-recovery",
  ],
  reviewConceptIds: [
    "capstone-domain-boundary-contract",
    "capstone-idempotent-commit-contract",
    "capstone-bounded-lifecycle-contract",
    "capstone-protocol-evolution-contract",
    "capstone-incident-recovery-contract",
    "capstone-release-evidence-contract",
  ],
  package: durableLogServicePackage,
};
