import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";
import { capstoneContracts } from "./capstone-integration/contracts";

const reviewedAt = "2026-09-18";
const moduleId = "capstone-integration";

export const capstoneIntegrationSources: Source[] = [
  {
    id: "capstone-sqlite-transactions",
    title: "SQLite: Transactions",
    url: "https://www.sqlite.org/lang_transaction.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie semantyki BEGIN IMMEDIATE, COMMIT lub ROLLBACK.",
  },
  {
    id: "capstone-sqlite-wal",
    title: "SQLite: Write-Ahead Logging",
    url: "https://www.sqlite.org/wal.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie uzasadnienia trybu WAL i ograniczeń współbieżności.",
  },
  {
    id: "capstone-sqlite-pragmas",
    title: "SQLite: PRAGMA synchronous",
    url: "https://www.sqlite.org/pragma.html#pragma_synchronous",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie ustawień synchronous, journal_mode lub busy_timeout.",
  },
  {
    id: "capstone-rusqlite-transactions",
    title: "rusqlite 0.40.2: Transaction",
    url: "https://docs.rs/rusqlite/0.40.2/rusqlite/struct.Transaction.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przypiętej wersji rusqlite albo API transakcji.",
  },
  {
    id: "capstone-tokio-mpsc",
    title: "Tokio 1.53.1: bounded mpsc",
    url: "https://docs.rs/tokio/1.53.1/tokio/sync/mpsc/index.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przypiętej wersji Tokio albo kontraktu bounded kanału.",
  },
  {
    id: "capstone-tokio-blocking",
    title: "Tokio 1.53.1: spawn_blocking",
    url: "https://docs.rs/tokio/1.53.1/tokio/task/fn.spawn_blocking.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie modelu właściciela blokującego zapisu i joinowania workera.",
  },
  {
    id: "capstone-cargo-semver",
    title: "Cargo: specifying dependencies",
    url: "https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie przypięć wersji i polityki aktualizacji lockfile.",
  },
  {
    id: "capstone-rust-errors",
    title: "The Rust Book: error handling",
    url: "https://doc.rust-lang.org/book/ch09-00-error-handling.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie publicznych kodów błędów i łańcucha źródeł.",
  },
];

export const capstoneIntegrationCompetencies: Competency[] = [
  {
    id: "capstone-domain-boundary-competency",
    title:
      "Walidujesz wartości domenowe na granicy i zachowujesz stabilny publiczny kod błędu.",
  },
  {
    id: "capstone-idempotent-commit-competency",
    title:
      "Rozróżniasz ponowienie, konflikt i atomowy commit bez fałszywego receiptu.",
  },
  {
    id: "capstone-bounded-lifecycle-competency",
    title: "Rozliczasz admission, kolejkę, anulowanie klienta i join workera.",
  },
  {
    id: "capstone-protocol-evolution-competency",
    title:
      "Normalizujesz obsługiwane wersje i odrzucasz nieznaną wersję lub migrację.",
  },
  {
    id: "capstone-incident-recovery-competency",
    title:
      "Korelujesz dowody i pozostawiasz wynik Unknown, gdy commit nie jest potwierdzony.",
  },
  {
    id: "capstone-release-evidence-competency",
    title:
      "Wiążesz decyzję wydania z artefaktem, kompletem kontroli i świeżym dowodem.",
  },
];

export const capstoneIntegrationConcepts: Concept[] = [
  {
    id: "capstone-domain-boundary-contract",
    title: "Granica wartości domenowej",
    prerequisites: [],
    competencyIds: ["capstone-domain-boundary-competency"],
    reviewPrompt:
      "Jak odróżnić tekst, który ma UTF-8, od wartości dopuszczonej przez kontrakt domeny?",
    reviewAnswer:
      "Sprawdź niepustość, alfabet i limity w bajtach przed utworzeniem nieprzezroczystej wartości. Publiczny kod błędu opisuje kategorię, a nie szczegóły wejścia.",
    distinguish:
      "UTF-8 jest warunkiem reprezentacji; nie zastępuje limitów, alfabetu ani zakazu znaków sterujących.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "capstone-idempotent-commit-contract",
    title: "Idempotentny commit i receipt",
    prerequisites: ["capstone-domain-boundary-contract"],
    competencyIds: ["capstone-idempotent-commit-competency"],
    reviewPrompt:
      "Co musi pozostać prawdą, gdy klient ponawia żądanie po utracie odpowiedzi?",
    reviewAnswer:
      "Ten sam composite key z tą samą kanoniczną treścią zwraca dokładnie poprzedni sequence, zmieniona treść daje Conflict, a receipt sukcesu pojawia się dopiero po commit.",
    distinguish:
      "Duplicate nie oznacza ponownego INSERT; idempotency key obejmuje źródło i klucz, a porównanie obejmuje kanoniczną treść.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "capstone-bounded-lifecycle-contract",
    title: "Bounded lifecycle i accounting",
    prerequisites: ["capstone-idempotent-commit-contract"],
    competencyIds: ["capstone-bounded-lifecycle-competency"],
    reviewPrompt: "Kiedy accepted może być rozliczone jako zakończone?",
    reviewAnswer:
      "Dopiero po obserwowalnym wyniku pracy. Rozłączenie klienta nie wycofuje przyjętego zadania, a Stopped wymaga zbilansowania i dołączonego workera.",
    distinguish:
      "Zamknięcie kanału odpowiedzi nie jest anulowaniem pracy, a pustka kolejki nie dowodzi, że nie ma już przyjętych zadań.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "capstone-protocol-evolution-contract",
    title: "Normalizacja protokołu i migracji",
    prerequisites: ["capstone-bounded-lifecycle-contract"],
    competencyIds: ["capstone-protocol-evolution-competency"],
    reviewPrompt:
      "Jak zachować starego klienta przy dodaniu opcjonalnego pola?",
    reviewAnswer:
      "Dekoder V1 (trzy pola) tworzy kanoniczny brak pola, V2 (cztery pola) mapuje sentinel na None, a nieznaną wersję lub dodatkowe pola odrzuca. Migracja starszego schematu aktualizuje marker dopiero po powodzeniu.",
    distinguish:
      "Kompatybilność wsteczna to jawna normalizacja, nie ciche ignorowanie pól ani akceptowanie każdej wersji.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "capstone-incident-recovery-contract",
    title: "Dowód incydentu i Unknown",
    prerequisites: ["capstone-protocol-evolution-contract"],
    competencyIds: ["capstone-incident-recovery-competency"],
    reviewPrompt:
      "Dlaczego brak odpowiedzi nie rozstrzyga, czy zapis się udał?",
    reviewAnswer:
      "Commit i dostarczenie odpowiedzi to osobne zdarzenia. Bez korelacji sygnału commit wynik pozostaje Unknown i bezpiecznym krokiem jest ponowienie tego samego żądania.",
    distinguish:
      "Delivered nie dowodzi committed, committed bez delivery jest osobnym wynikiem, a brak sygnału nie dowodzi rollbacku. Zachowaj osobno próby, unikalne zapisy i wynik dostarczenia.",
    evidenceArtifact: "rust-code",
  },
  {
    id: "capstone-release-evidence-contract",
    title: "Dowód wydania związany z artefaktem",
    prerequisites: ["capstone-incident-recovery-contract"],
    competencyIds: ["capstone-release-evidence-competency"],
    reviewPrompt:
      "Kiedy dossier może przejść z obserwacji do kandydata wydania?",
    reviewAnswer:
      "Digest musi zgadzać się z artefaktem, wymagane kontrole kompatybilności i odtwarzania muszą być kompletne, a obserwacja musi mieścić się w siedmiodniowym oknie i nie pochodzić z przyszłości. Nieznany status łańcucha dostaw utrzymuje Hold.",
    distinguish:
      "Świeżość i kompletność dowodu są częścią decyzji. Sam zielony test z innego ZIP-a albo timestamp z przyszłości nie jest dowodem dla bieżącego artefaktu.",
    evidenceArtifact: "rust-code",
  },
];

function choiceStep(
  id: string,
  title: string,
  prompt: string,
  correct: string,
  choices: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind: "predict",
    title,
    prompt,
    choices: choices.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct,
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    evidenceKind: "prediction",
  };
}

function contrastStep(id: string, title: string, prompt: string): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    explanation:
      "Porównaj dwa przypadki: granica domeny lub procesu jest jawna, a wynik nie jest dopowiadany na podstawie samego tekstu albo sygnału transportowego.",
    evaluator: {
      kind: "answer",
      accepted: ["kontrast", "różnica", "granica"],
      feedback:
        "Wskaż, który warunek chroni granicę i jaki dowód jest jeszcze potrzebny.",
    },
    evidenceKind: "exposure",
  };
}

function explainStep(
  id: string,
  title: string,
  prompt: string,
  accepted: string[],
  feedback: string,
): LessonStep {
  return {
    id,
    kind: "explain",
    title,
    prompt,
    evaluator: { kind: "answer", accepted, feedback },
    evidenceKind: "exposure",
  };
}

function codingStep(options: {
  id: string;
  kind: "modify" | "apply" | "recall";
  title: string;
  prompt: string;
  contractId: string;
  gate?: boolean;
}): LessonStep {
  const source = capstoneContracts[options.contractId];
  const hintsByContract: Record<string, [string, string]> = {
    "capstone-domain-validate": [
      "Wymuś ASCII `[A-Za-z0-9_]`, identyfikator 1–4 bajty i wiadomość 1–8 bajtów.",
      "Odrzuć tab, CR i LF w wiadomości, ale dopuść jej zwykły Unicode; tylko identifier musi pozostać ASCII.",
    ],
    "capstone-domain-errors": [
      "Zmapuj Invalid, Conflict, Busy i Unknown na cztery stabilne kody publiczne.",
      "Nie ujawniaj szczegółów wejścia i nie łącz Conflict z kodem Invalid.",
    ],
    "capstone-domain-recall": [
      "Reference musi być ASCII i mieć 1–6 bajtów; destination może być UTF-8 i ma limit 1–10 bajtów.",
      "Sprawdź `Łódź` jako poprawne destination oraz odrzuć ASCII reference ponad 6 i UTF-8 ponad 10 bajtów.",
    ],
    "capstone-commit-replay": [
      "Porównaj `(source, key, body)` i przy Duplicate zwróć dokładnie poprzedni sequence.",
      "Zmieniony body daje Conflict; nowy klucz daje Insert bez mutowania starego receipt.",
    ],
    "capstone-commit-atomicity": [
      "Policz rows, receipts i sequence przed przypisaniem któregokolwiek pola.",
      "Błąd commit lub overflow dowolnego licznika ma pozostawić cały State bez zmian.",
    ],
    "capstone-commit-recall": [
      "Dla starej i nowej treści rozróżnij New, Duplicate i Conflict.",
      "Identyczny payload po retry to Duplicate; zmiana payloadu nie może nim być.",
    ],
    "capstone-lifecycle-admit": [
      "Sprawdź niezależnie limit 8 active connections i limit 16 queued storage.",
      "Przy reject lub closing zwróć poprzedni accepted, a po admission zwiększ go raz.",
    ],
    "capstone-lifecycle-settle": [
      "Stopped wymaga `worker_joined` oraz `accepted == completed`.",
      "Nierozliczone accepted daje Pending; brak joinu nie może dać Stopped.",
    ],
    "capstone-lifecycle-recall": [
      "Zachowaj accepted po disconnect i rozlicz je dopiero z completed.",
      "Zwróć Done tylko po dołączeniu workera i równych licznikach.",
    ],
    "capstone-protocol-decode": [
      "Akceptuj wyłącznie V1 z 3 polami i V2 z 4 polami; sentinel `-` mapuj na None.",
      "Odrzuć wersję 3 i piąte pole bez częściowej normalizacji.",
    ],
    "capstone-protocol-migrate": [
      "Ustaw marker 2 dopiero po udanym ALTER; current==target daje Noop.",
      "Failed ALTER oraz current>target zwracają Reject i nie mutują markera.",
    ],
    "capstone-protocol-recall": [
      "V1 zawsze normalizuj do route `default`; V2 zachowuje route poza sentinelem `-`.",
      "Nieznana wersja musi dać None, bez domyślnego przejścia do V1.",
    ],
    "capstone-incident-correlate": [
      "Filtruj po request identity i zliczaj osobno attempt, committed oraz delivered.",
      "Sygnał innego requestu nie może zmieniać żadnego z trzech liczników.",
    ],
    "capstone-incident-decide": [
      "Brak dowolnego sygnału daje Unknown; committed+delivered i committed bez delivery są różne.",
      "Rejected wynika z braku admission, a RolledBack wymaga jawnego rollbacku.",
    ],
    "capstone-incident-recall": [
      "Rozdziel Unknown, Printed, CommittedUndelivered i NotCommitted z dwóch opcjonalnych sygnałów.",
      "`Some(true), Some(false)` musi pozostać osobnym wynikiem od braku commit evidence.",
    ],
    "capstone-release-bind": [
      "Powiąż actual digest z expected i wymagaj checks_complete przed akceptacją.",
      "Odrzuć timestamp przyszły oraz starszy niż 7 dni; sprawdź granicę wieku 7.",
    ],
    "capstone-release-decide": [
      "Candidate wymaga jednocześnie compatibility, recovery i supply_chain_known.",
      "Każdy brakujący warunek daje Hold; świeżość została zweryfikowana przez wcześniejszą bramkę.",
    ],
    "capstone-release-recall": [
      "Wymagaj niepustych checks i sprawdź wiek observed_at w zakresie 0–7 dni.",
      "Odrzuć pustą listę, niekompletny check, przyszłą obserwację i wiek 8 dni.",
    ],
  };
  const hints = hintsByContract[options.contractId];
  if (!hints)
    throw new Error(`Brak wskazówek dla kontraktu ${options.contractId}`);
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    code: starterFromSolution(source.solution),
    solution: source.solution,
    hints: hints as [string, string],
    evaluator: { kind: "tests", tests: source.tests },
    expectedStatus: "success",
    evidenceKind: options.kind === "recall" ? "recall" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

function starterFromSolution(solution: string): string {
  const functionStart = solution.indexOf("fn ");
  if (functionStart < 0) return `${solution}\nfn unfinished() { todo!() }`;
  const bodyStart = solution.indexOf("{", functionStart);
  let depth = 0;
  let bodyEnd = -1;
  for (let index = bodyStart; index < solution.length; index += 1) {
    if (solution[index] === "{") depth += 1;
    if (solution[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        bodyEnd = index;
        break;
      }
    }
  }
  if (bodyStart < 0 || bodyEnd < 0)
    return `${solution}\nfn unfinished() { todo!() }`;
  return `${solution.slice(0, bodyStart)}{ todo!() }${solution.slice(bodyEnd + 1)}`;
}

function blankStep(
  id: string,
  title: string,
  prompt: string,
  criteria: string[],
  solution: string,
): LessonStep {
  return {
    id,
    kind: "blank",
    title,
    prompt,
    solution,
    rubric: criteria,
    evaluator: { kind: "rubric", criteria },
    evidenceKind: "assessment",
  };
}

const lessonData = [
  {
    id: "capstone-domain-boundary",
    title: "Wartość przyjęta to nie dowolny tekst",
    subtitle:
      "Walidacja, bajty, alfabet i stabilne kody błędów tworzą pierwszą granicę serwisu.",
    outcomes: [
      "Zmierzysz limity w bajtach.",
      "Odrzucisz znaki sterujące i niepoprawny alfabet.",
      "Zmapujesz błędy do stabilnych kodów.",
    ],
    sources: ["capstone-rust-errors"],
    transfer:
      "Przenieś tę granicę do projektu trwałego dziennika, zanim wartość trafi do SQLite.",
    misconceptions: [
      "String sam gwarantuje poprawność domenową.",
      "Kod błędu może zawierać treść wejścia.",
      "Równość limitu jest błędem.",
    ],
    steps: [
      choiceStep(
        "capstone-domain-predict",
        "Najpierw granica",
        "Co powinno stać się przed utworzeniem Event?",
        "0",
        ["Walidacja pól i bajtów", "Zapis do SQLite", "Odesłanie OK"],
        [
          "Źródło/klucz używają dozwolonego alfabetu, a wiadomość mieści się w bajtach.",
          "SQLite nie powinno dostać wartości, która nie spełnia kontraktu.",
          "OK może oznaczać dopiero przyjęty i zatwierdzony zapis.",
        ],
      ),
      contrastStep(
        "capstone-domain-contrast",
        "UTF-8 to dopiero początek",
        "Porównaj źródło z alfabetu ASCII `[A-Za-z0-9_]` do 4 bajtów z wiadomością do 8 bajtów; Unicode może przekroczyć limit, a tab/CR/LF są zakazane.",
      ),
      codingStep({
        id: "capstone-domain-validate",
        kind: "modify",
        title: "Zbuduj walidację domeny",
        prompt:
          "Uzupełnij walidację źródła (1–4 bajty, ASCII litera/cyfra/_) i wiadomości (1–8 bajtów UTF-8 bez tab/CR/LF); równość limitu jest poprawna.",
        contractId: "capstone-domain-validate",
        gate: true,
      }),
      explainStep(
        "capstone-domain-explain",
        "Nazwij warunki",
        "Wyjaśnij, dlaczego limit znaków i limit bajtów nie są tym samym.",
        ["bajty", "UTF-8", "limit"],
        "Połącz koszt UTF-8 z limitem transportowym.",
      ),
      codingStep({
        id: "capstone-domain-errors",
        kind: "apply",
        title: "Ukryj szczegóły za kodem",
        prompt:
          "Zmapuj błędy domeny i storage do stałych kodów bez ujawniania SQL ani payloadu.",
        contractId: "capstone-domain-errors",
        gate: true,
      }),
      codingStep({
        id: "capstone-domain-recall",
        kind: "recall",
        title: "Przypomnij granicę wysyłki",
        prompt:
          "Odtwórz walidację ASCII reference (1–6 bajtów) i UTF-8 destination (1–10 bajtów), z odrzuceniem pustki i nadmiaru bajtów.",
        contractId: "capstone-domain-recall",
      }),
      blankStep(
        "capstone-domain-blank",
        "Blank page: rejestr czujników",
        "Zaprojektuj rejestr pomiarów czujników odporny na niepoprawne wartości. Opisz granicę danych, przypadki odrzucenia, stabilny wynik błędu i dowody testowe. Nie przepisuj API serwisu.",
        [
          "jawna granica poprawności i limitów",
          "co najmniej trzy kontrprzykłady",
          "stabilny wynik błędu bez wycieku danych",
          "plan testów i ograniczenie automatycznej oceny",
        ],
        "Najpierw spisałbym niezmienniki wartości, potem oddzielił walidację od zapisu i pokazał testy granicy wraz z przypadkiem Unicode.",
      ),
    ],
  },
  {
    id: "capstone-idempotent-commit",
    title: "Ponowienie bez podwójnego zapisu",
    subtitle:
      "Klucz złożony, kanoniczna treść i commit wyznaczają znaczenie receiptu.",
    outcomes: [
      "Rozróżnisz insert, duplicate i conflict.",
      "Zachowasz receipt po ponowieniu.",
      "Nie opublikujesz sukcesu przed commit.",
    ],
    sources: ["capstone-sqlite-transactions", "capstone-rusqlite-transactions"],
    transfer:
      "W projekcie użyj retry tego samego klucza i payloadu po utracie odpowiedzi.",
    misconceptions: [
      "Każdy retry powinien tworzyć nowy wiersz.",
      "Źródło nie należy do klucza.",
      "Receipt można zwrócić przed zatwierdzeniem.",
    ],
    steps: [
      choiceStep(
        "capstone-commit-predict",
        "Co znaczy retry?",
        "Jaki wynik ma ten sam klucz i ta sama treść?",
        "1",
        ["Nowy insert", "Stary receipt jako duplicate", "Zawsze Conflict"],
        [
          "Nowy INSERT utworzyłby drugi receipt dla tej samej tożsamości.",
          "Równy `(source, key, payload)` zwraca zachowany sequence.",
          "Conflict dotyczy zmienionej treści przy tym samym kluczu.",
        ],
      ),
      contrastStep(
        "capstone-commit-contrast",
        "Odpowiedź może zginąć",
        "Porównaj committed/no-reply, rollback/no-reply i retry po `(source,key)`; tylko ten sam kanoniczny payload może zwrócić zachowany sequence.",
      ),
      codingStep({
        id: "capstone-commit-replay",
        kind: "modify",
        title: "Rozpoznaj replay",
        prompt:
          "Zaimplementuj decyzję dla `(source,key)`: pusty magazyn daje Insert, równy payload zwraca poprzedni sequence, zmieniony payload daje Conflict.",
        contractId: "capstone-commit-replay",
        gate: true,
      }),
      explainStep(
        "capstone-commit-explain",
        "Powiąż receipt z commit",
        "Dlaczego sukces odpowiedzi nie może poprzedzać commit?",
        ["commit", "receipt", "retry"],
        "Wskaż moment, po którym klient może uznać zapis za potwierdzony.",
      ),
      codingStep({
        id: "capstone-commit-atomicity",
        kind: "apply",
        title: "Nie publikuj połowy transakcji",
        prompt:
          "Zastosuj rekord, licznik receipt i sequence tylko po udanym commit; błąd lub overflow bounded sequence ma zostawić wszystkie pola bez zmian.",
        contractId: "capstone-commit-atomicity",
        gate: true,
      }),
      codingStep({
        id: "capstone-commit-recall",
        kind: "recall",
        title: "Powtórka importu płatności",
        prompt:
          "Odtwórz decyzję dla `(account, external_id)` i zmienionej treści.",
        contractId: "capstone-commit-recall",
      }),
      blankStep(
        "capstone-commit-blank",
        "Blank page: rejestr rezerwacji",
        "Zaprojektuj rejestr rezerwacji odporny na ponowienie po utracie odpowiedzi. Opisz tożsamość, konflikt treści, kolejność mutacji i dowód awarii przed zapisem.",
        [
          "tożsamość obejmuje właściwy zakres",
          "retry zachowuje wynik pierwszego zapisu",
          "konflikt nie modyfikuje rekordu",
          "awaria przed commit nie publikuje sukcesu",
        ],
        "Rozdzieliłbym decyzję o istniejącym kluczu od transakcji, a receipt wydał dopiero po potwierdzonym commit.",
      ),
    ],
  },
  {
    id: "capstone-bounded-lifecycle",
    title: "Każde przyjęte żądanie ma właściciela",
    subtitle:
      "Admission, bounded queue, anulowanie klienta i drain muszą mieć rozliczalne przejścia.",
    outcomes: [
      "Ograniczysz aktywne i oczekujące prace.",
      "Nie cofniesz accepted po rozłączeniu klienta.",
      "Dołączysz workera przed Stopped.",
    ],
    sources: ["capstone-tokio-mpsc", "capstone-tokio-blocking"],
    transfer:
      "W serwisie sprawdź równanie accepted = inserted + duplicates + failed przed raportem końcowym.",
    misconceptions: [
      "Pełna kolejka może blokować bez limitu.",
      "Rozłączenie cofa przyjęte żądanie.",
      "Timeout jest dowodem anulowania pracy.",
    ],
    steps: [
      choiceStep(
        "capstone-lifecycle-predict",
        "Admission czy oczekiwanie?",
        "Co zrobić, gdy aktywne i oczekujące prace wypełniają limit?",
        "2",
        [
          "Przyjąć i czekać bez limitu",
          "Usunąć stare receipt",
          "Odrzucić jawnie jako Busy",
        ],
        [
          "Połączenie i kolejka mają osobne limity; ukryte oczekiwanie łamie bounded service.",
          "Receiptów nie wolno usuwać, bo osłabia to idempotency.",
          "Pełna pojemność ma jawnie zachować accepted i zwrócić Busy.",
        ],
      ),
      contrastStep(
        "capstone-lifecycle-contrast",
        "Kanał odpowiedzi nie jest właścicielem pracy",
        "Porównaj rozłączenie klienta po enqueue z odrzuceniem przy 8 połączeniach lub 16 poleceniach kolejki; accepted rośnie tylko po admission.",
      ),
      codingStep({
        id: "capstone-lifecycle-admit",
        kind: "modify",
        title: "Ogranicz admission",
        prompt:
          "Sprawdź osobno limit 8 aktywnych połączeń i limit 16 storage queue; przy Busy/closing zwróć accepted bez zmiany, a po admission zwiększ go raz.",
        contractId: "capstone-lifecycle-admit",
        gate: true,
      }),
      explainStep(
        "capstone-lifecycle-explain",
        "Rozdziel przyjęcie od odpowiedzi",
        "Który licznik pozostaje zobowiązaniem po rozłączeniu klienta?",
        ["accepted", "enqueue", "właściciel"],
        "Powiąż accepted z pracą workera, nie z życiem socketu.",
      ),
      codingStep({
        id: "capstone-lifecycle-settle",
        kind: "apply",
        title: "Zamknij dopiero po rozliczeniu",
        prompt:
          "Zwróć Stopped dopiero po `worker_joined=true` i `accepted == completed`; dropped subscriber nie cofa accepted, a overdue nie jest sukcesem.",
        contractId: "capstone-lifecycle-settle",
        gate: true,
      }),
      codingStep({
        id: "capstone-lifecycle-recall",
        kind: "recall",
        title: "Powtórka eksportu obrazów",
        prompt:
          "Odtwórz warunek zakończenia pracy przy dropped subscriberze i niedołączonym workerze.",
        contractId: "capstone-lifecycle-recall",
      }),
      blankStep(
        "capstone-lifecycle-blank",
        "Blank page: kolejka raportów",
        "Zaprojektuj kolejkę generowania raportów z pełnym limitem, rozłączeniem odbiorcy i zamknięciem. Opisz właściciela każdej przyjętej pracy, stany i rozliczenie.",
        [
          "osobne limity admission i kolejki",
          "dropped subscriber nie usuwa accepted",
          "jawny stan drain i warunek końca",
          "sposób wykrycia overdue bez fałszywego sukcesu",
        ],
        "Wprowadziłbym jawne liczniki i jednego właściciela pracy; raport końcowy wymaga zbilansowania oraz joinu.",
      ),
    ],
  },
  {
    id: "capstone-protocol-evolution",
    title: "Nowa wersja bez utraty starego klienta",
    subtitle:
      "Normalizacja V1/V2 i migracja schematu chronią stare dane i jawnie odrzucają niewiadome.",
    outcomes: [
      "Znormalizujesz V1 i V2 do jednego modelu.",
      "Odrzucisz unknown version i extra fields.",
      "Nie opublikujesz markera migracji przed sukcesem.",
    ],
    sources: ["capstone-sqlite-pragmas", "capstone-cargo-semver"],
    transfer:
      "W PROTOCOL.md opisz sentinel korelacji, wersję wire i plan migracji v1 → v2.",
    misconceptions: [
      "Nieznaną wersję można zignorować.",
      "Dodatkowe pola zawsze są bezpieczne.",
      "Marker schematu można ustawić przed ALTER.",
    ],
    steps: [
      choiceStep(
        "capstone-protocol-predict",
        "Co robi V1?",
        "Jak V1 ma trafić do kanonicznego modelu z opcjonalną korelacją?",
        "0",
        [
          "Ustawić correlation na None",
          "Dodać losową korelację",
          "Odrzucić każdego starego klienta",
        ],
        [
          "V1 ma mniej pól, więc brak korelacji normalizuje się do None.",
          "Losowa wartość zmienia znaczenie starego komunikatu.",
          "Kompatybilność V1 jest wymaganą częścią kontraktu.",
        ],
      ),
      contrastStep(
        "capstone-protocol-contrast",
        "Normalizacja to decyzja",
        "Porównaj V1 z trzema polami i V2 z czterema polami: sentinel `-` mapuje do None, extra fields i unknown version są odrzucane.",
      ),
      codingStep({
        id: "capstone-protocol-decode",
        kind: "modify",
        title: "Znormalizuj wire format",
        prompt:
          "Obsłuż dokładnie V1 `[source,key,message]` i V2 `[source,key,correlation,message]`; `-` normalizuj do None, a wersję 3 i piąte pole odrzuć.",
        contractId: "capstone-protocol-decode",
        gate: true,
      }),
      explainStep(
        "capstone-protocol-explain",
        "Zachowaj starą umowę",
        "Dlaczego V1 nie może przypadkiem stać się V2 z pustym tekstem?",
        ["None", "normalizacja", "stary"],
        "Opisz kanoniczną wartość braku pola.",
      ),
      codingStep({
        id: "capstone-protocol-migrate",
        kind: "apply",
        title: "Podejmij decyzję migracji",
        prompt:
          "Przy migracji v1→v2 ustaw marker 2 tylko po udanym ALTER; current==target to Noop, current>target oraz failed ALTER nie mutują markera.",
        contractId: "capstone-protocol-migrate",
        gate: true,
      }),
      codingStep({
        id: "capstone-protocol-recall",
        kind: "recall",
        title: "Powtórka biletu zadania",
        prompt:
          "Znormalizuj V1/V2 opcjonalnej etykiety routingu i odrzuć wersję 3.",
        contractId: "capstone-protocol-recall",
      }),
      blankStep(
        "capstone-protocol-blank",
        "Blank page: format dziennika magazynu",
        "Zaprojektuj ewolucję formatu dziennika magazynu. Opisz zgodność ze starym klientem, zachowanie starych danych, unknown version i rollback migracji.",
        [
          "jawna tabela wersji i normalizacji",
          "stary klient ma zachowane znaczenie",
          "unknown version nie zmienia danych",
          "marker schematu jest częścią transakcji",
        ],
        "Najpierw zdefiniowałbym kanoniczny model i wersje, a marker zmieniał dopiero razem z udaną migracją.",
      ),
    ],
  },
  {
    id: "capstone-incident-recovery",
    title: "Awaria, dowód i bezpieczne ponowienie",
    subtitle:
      "Korelacja sygnałów oddziela próbę, commit i dostarczenie odpowiedzi.",
    outcomes: [
      "Zachowasz osobne liczniki prób i insertów.",
      "Zwrócisz Unknown przy niepełnym dowodzie.",
      "Wybierzesz bezpieczny retry.",
    ],
    sources: ["capstone-rust-errors", "capstone-tokio-blocking"],
    transfer:
      "W runbooku opisz utratę połączenia po enqueue i sposób odtworzenia tej samej prośby.",
    misconceptions: [
      "Brak odpowiedzi oznacza rollback.",
      "Jeden globalny licznik wystarczy.",
      "Delivered dowodzi committed.",
    ],
    steps: [
      choiceStep(
        "capstone-incident-predict",
        "Jaki jest wynik bez commit evidence?",
        "Co raportujesz po utracie odpowiedzi bez sygnału commit?",
        "1",
        ["Committed", "Unknown", "Rollback"],
        [
          "Brak odpowiedzi nie jest dowodem commit.",
          "Bez potwierdzenia commit wynik pozostaje Unknown i retry zachowuje tę samą treść.",
          "Rollback wymaga osobnego sygnału storage.",
        ],
      ),
      contrastStep(
        "capstone-incident-contrast",
        "Transport i storage mają różne fakty",
        "Porównaj attempt, committed, delivered i retry dla jednego request identity; committed bez delivery jest osobnym wynikiem, a brak commit pozostaje Unknown.",
      ),
      codingStep({
        id: "capstone-incident-correlate",
        kind: "modify",
        title: "Skoreluj sygnały",
        prompt:
          "Zgrupuj sygnały po request identity i zachowaj osobno attempt, committed oraz delivered; nie łącz delivery z dowodem zapisu.",
        contractId: "capstone-incident-correlate",
        gate: true,
      }),
      explainStep(
        "capstone-incident-explain",
        "Nazwij niepewność",
        "Wyjaśnij, dlaczego Unknown jest bezpieczniejszy od zgadywania.",
        ["Unknown", "dowód", "commit"],
        "Wskaż brakujący sygnał i retry jako następny krok.",
      ),
      codingStep({
        id: "capstone-incident-decide",
        kind: "apply",
        title: "Podejmij decyzję z dowodu",
        prompt:
          "Rozróżnij rejected-before-admission, committed+delivered, committed+undelivered, rollback i Unknown z czterech opcjonalnych sygnałów.",
        contractId: "capstone-incident-decide",
        gate: true,
      }),
      codingStep({
        id: "capstone-incident-recall",
        kind: "recall",
        title: "Powtórka drukarki receiptów",
        prompt:
          "Zdiagnozuj osobno commit i dostarczenie odpowiedzi; committed bez delivery zwróć jako osobny wynik.",
        contractId: "capstone-incident-recall",
      }),
      blankStep(
        "capstone-incident-blank",
        "Blank page: odtworzenie importu",
        "Napisz plan odtworzenia importu po utracie połączenia. Wskaż znane fakty, brakujące sygnały, idempotency key, bezpieczny retry i moment eskalacji.",
        [
          "oddzielone fakty od hipotez",
          "jawny Unknown dla braku commit evidence",
          "retry zachowuje klucz i treść",
          "plan nie obiecuje anulowania już przyjętej pracy",
        ],
        "Zebrałbym sygnały po kluczu, oznaczył Unknown i ponowił dokładnie ten sam payload, a wynik porównał z receiptem.",
      ),
    ],
  },
  {
    id: "capstone-release-evidence",
    title: "Wydanie związane z konkretnym artefaktem",
    subtitle:
      "Kandydat wydania potrzebuje świeżego, kompletnego i identyfikowalnego dowodu.",
    outcomes: [
      "Powiążesz dowód z digestem ZIP-a.",
      "Odrzucisz niekompletne lub stare obserwacje.",
      "Zostawisz publiczny release w Hold przy nieznanym supply chain.",
    ],
    sources: ["capstone-cargo-semver", "capstone-rust-errors"],
    transfer:
      "W dossier projektu dołącz digest, toolchain, komendy, recovery i jawne ograniczenia dowodu.",
    misconceptions: [
      "Zielony test z innego artefaktu wystarczy.",
      "Brak advisory można pominąć.",
      "Świeżość obserwacji nie ma znaczenia.",
    ],
    steps: [
      choiceStep(
        "capstone-release-predict",
        "Czy ten dowód pasuje?",
        "Co zrobić z zielonym raportem dla innego digestu?",
        "2",
        [
          "Przepisać digest",
          "Uznać za równoważny bez sprawdzenia",
          "Odrzucić jako niepowiązany",
        ],
        [
          "Digest jest identyfikatorem artefaktu i nie wolno go przepisywać w raporcie.",
          "Zielony wynik starego ZIP-a nie dowodzi bieżącego wydania.",
          "Niepasujący digest oraz niepełne kontrole zatrzymują kandydata.",
        ],
      ),
      contrastStep(
        "capstone-release-contrast",
        "Raport jest artefaktem",
        "Porównaj kompletny raport bieżącego ZIP-a z obserwacją starego digestu: wymagaj zgodności digestu, pełnych kontroli i timestampu w oknie 7 dni, bez daty przyszłej.",
      ),
      codingStep({
        id: "capstone-release-bind",
        kind: "modify",
        title: "Podepnij dowód do artefaktu",
        prompt:
          "Zaakceptuj dossier tylko przy zgodnym digest, kompletnych kontrolach oraz `observed_at <= now` i wieku najwyżej 7 dni.",
        contractId: "capstone-release-bind",
        gate: true,
      }),
      explainStep(
        "capstone-release-explain",
        "Zachowaj ograniczenie",
        "Dlaczego nieznany status supply chain utrzymuje Hold?",
        ["Hold", "nieznany", "dowód"],
        "Brak aktualnego dowodu nie jest dowodem bezpieczeństwa.",
      ),
      codingStep({
        id: "capstone-release-decide",
        kind: "apply",
        title: "Podejmij decyzję release",
        prompt:
          "Wymagaj kompatybilności, recovery i znanego supply chain przed Candidate; świeżość obserwacji została rozstrzygnięta w poprzedniej bramce.",
        contractId: "capstone-release-decide",
        gate: true,
      }),
      codingStep({
        id: "capstone-release-recall",
        kind: "recall",
        title: "Powtórka dossier migracji",
        prompt:
          "Sprawdź kompletność kontroli i świeżość obserwacji w niezależnym raporcie.",
        contractId: "capstone-release-recall",
      }),
      blankStep(
        "capstone-release-blank",
        "Blank page: dossier eksportera",
        "Przygotuj dossier wydania eksportera archiwów. Udokumentuj zmianę niezgodną, plan powrotu, digest artefaktu, zakres dowodu i ograniczenia decyzji.",
        [
          "tożsamość artefaktu i okno obserwacji",
          "kompletne kontrole kompatybilności i recovery",
          "plan powrotu po niezgodności",
          "jawne pozostawienie Hold przy brakującym dowodzie",
        ],
        "Dossier związałbym z digestem i komendami, a nie z samym numerem wersji; brakujący advisory oznacza Hold.",
      ),
    ],
  },
];

export const capstoneIntegrationLessons: Lesson[] = lessonData.map(
  (data, index) => ({
    id: data.id,
    moduleId,
    conceptIds: [`${data.id}-contract`],
    competencyIds: [`${data.id}-competency`],
    prerequisites:
      index === 0 ? ["api-validated-construction"] : [lessonData[index - 1].id],
    title: data.title,
    subtitle: data.subtitle,
    minutes: 16,
    outcomes: [...data.outcomes],
    steps: [...data.steps],
    misconceptions: [...data.misconceptions],
    transferTask: data.transfer,
    evidenceGate:
      "Dwanaście bramek modeluje decyzje domeny, transakcji, lifecycle, normalizacji, korelacji i wydania; pakiet lokalny dostarcza osobny dowód Cargo/SQLite/TCP.",
    sourceIds: [...data.sources],
  }),
);

export const capstoneIntegrationReviewExercises: Record<string, LessonStep> =
  Object.fromEntries(
    capstoneIntegrationLessons.map((lesson, index) => {
      const conceptId = lesson.conceptIds[0];
      const contractId = [
        "review-capstone-domain",
        "review-capstone-commit",
        "review-capstone-lifecycle",
        "review-capstone-protocol",
        "review-capstone-incident",
        "review-capstone-release",
      ][index]!;
      const source = capstoneContracts[contractId];
      const reviewPrompt = (
        {
          "review-capstone-domain":
            "Sprawdź referencję przesyłki ASCII (1–6 bajtów) i UTF-8 destination (1–10 bajtów); pokaż pustkę, obie granice i akceptację `Łódź`.",
          "review-capstone-commit":
            "Zaimportuj Notice po `(account, external_id)`: ta sama kwota daje Duplicate, zmieniona kwota Conflict, a inne konto lub ID pozostaje niezależne.",
          "review-capstone-lifecycle":
            "Zwróć true tylko gdy accepted == completed i worker_joined; dropped subscriber nie zmniejsza accepted, a w przeciwnym razie zwróć false.",
          "review-capstone-protocol":
            "Znormalizuj routing job ticketu: V1 wybiera default, V2 mapuje `-` na default lub zachowuje route, a wersja 9 jest odrzucana.",
          "review-capstone-incident":
            "Zdiagnozuj receipt printera osobno dla committed i delivered; committed bez dostarczenia ma własny wynik.",
          "review-capstone-release":
            "Oceń migracyjny candidate po digest, komplecie kontroli i timestampie; obserwacja starsza niż 3 dni lub z przyszłości odrzuca release.",
        } as Record<string, string>
      )[contractId]!;
      const reviewHints = (
        {
          "review-capstone-domain": [
            "Użyj `is_ascii` dla reference (1–6 bajtów), a destination sprawdzaj jako niepuste UTF-8 do 10 bajtów.",
            "Przetestuj `Łódź` jako poprawne destination oraz odrzuć reference spoza ASCII i destination ponad 10 bajtów.",
          ],
          "review-capstone-commit": [
            "Najpierw wyszukaj rekord po parze `(account, external_id)`, potem porównaj cents.",
            "Ten sam klucz i kwota to Duplicate, zmieniona kwota Conflict, inne konto lub ID Inserted.",
          ],
          "review-capstone-lifecycle": [
            "Porównaj accepted z completed i wymagaj `worker_joined` przed wynikiem true.",
            "Zwróć false dla nierównych liczników lub braku joinu; accepted pozostaje zobowiązaniem po rozłączeniu.",
          ],
          "review-capstone-protocol": [
            "Dla V1 zwróć `default`, dla V2 zamień `-` na `default`, a inną trasę zachowaj.",
            "Wersja 9 musi zwrócić None; nie akceptuj nieznanej wersji jako V1 lub V2.",
          ],
          "review-capstone-incident": [
            "Najpierw rozdziel brak sygnału od wartości false dla committed i delivered.",
            "`Some(true), Some(false)` musi dać CommittedNoDelivery, a oba true Delivered.",
          ],
          "review-capstone-release": [
            "Wymagaj zgodnego digestu i kompletnych kontroli przed sprawdzeniem timestampu.",
            "Akceptuj wiek 0–3 dni, odrzuć wiek 4 dni oraz timestamp z przyszłości.",
          ],
        } as Record<string, [string, string]>
      )[contractId]!;
      return [
        conceptId,
        {
          id: contractId,
          kind: "recall",
          title: "Niezależna powtórka projektu",
          prompt: reviewPrompt,
          code: starterFromSolution(source.solution),
          solution: source.solution,
          hints: reviewHints,
          evaluator: { kind: "tests", tests: source.tests },
          expectedStatus: "success",
          evidenceKind: "recall",
        } satisfies LessonStep,
      ];
    }),
  );

export const capstoneIntegrationModule: CourseModule = {
  id: moduleId,
  title: "Capstone: trwały serwis logów",
  whyItMatters:
    "Integracja domeny, transakcji, bounded Tokio, protokołu i dowodu wydania wymaga rozdzielenia modelu, lokalnego artefaktu i niezależnej oceny.",
  capabilities: capstoneIntegrationCompetencies.map(
    (competency) => competency.title,
  ),
  prerequisites: [
    "public-api-workspaces",
    "tokio-network-service",
    "service-operations",
    "dependency-assurance",
    "property-contracts",
  ],
  lessonIds: capstoneIntegrationLessons.map((lesson) => lesson.id),
  exitGate: [
    "Dwanaście niezależnych bramek sprawdza zachowanie granic i decyzji systemu.",
    "Sześć blanków pozostaje otwartym zadaniem portfolio z rubryką; ich samoocena nie zastępuje niezależnego dowodu.",
    "Sześć osobnych retrieval reviews sprawdza przeniesienie decyzji na nowe domeny.",
  ],
  projectConnection:
    "Pobierany workspace `durable-log-service-workspace` uruchamia właściwe Cargo/SQLite/TCP lokalnie; browserowe bramki sprawdzają tylko jawne modele kontraktów.",
  assessmentId: "capstone-release-blank",
  gateCriteria: capstoneIntegrationLessons.flatMap((lesson) =>
    lesson.steps
      .filter((step) => step.evidenceGate)
      .map((step) => ({
        id: `${step.id}-criterion`,
        label: `${lesson.title}: ${step.title}`,
        taskRefs: [{ lessonId: lesson.id, stepId: step.id }],
      })),
  ),
};

export const capstoneIntegrationAssessmentFixtures = Object.values(
  capstoneContracts,
).map(({ id, equivalent, mutant }) => ({ id, equivalent, mutant }));
