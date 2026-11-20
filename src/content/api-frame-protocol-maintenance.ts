import type { Lesson, LessonStep } from "@/domain/types";

const choiceStep = (options: {
  id: string;
  kind: "predict" | "explain" | "recall";
  title: string;
  prompt: string;
  choices: { id: string; label: string }[];
  correct: string;
  explanations: Record<string, string>;
  evidenceKind: "prediction" | "exposure" | "recall";
}): LessonStep => ({
  id: options.id,
  kind: options.kind,
  title: options.title,
  prompt: options.prompt,
  choices: options.choices,
  evaluator: {
    kind: "choice",
    correct: options.correct,
    explanations: options.explanations,
  },
  evidenceKind: options.evidenceKind,
});

const maintenanceRun = `fn main() {
    let default_output = "frame-probe: payload=4 bytes";
    let diagnostics_output = "error code=io source_kind=UnexpectedEof";

    println!("default: {default_output}");
    println!("no-default: {default_output}");
    println!("diagnostics: {diagnostics_output}");
    println!("format: independent optional serde support");
}`;

const maintenanceChallengeCriteria = [
  "MAINTENANCE-CHALLENGE.md zapisuje zaobserwowane wyjście klienta i kontrakt niepowodzenia, zamiast twierdzić, że sam opis zastępuje uruchomienie.",
  "Plan obejmuje stare wskaźniki funkcji, ścieżki legacy, klienta dyn FrameReader oraz zachowanie implementera bez Clone i Debug.",
  "Plan wymaga typowanego FrameErrorCode i zachowania dokładnie tego samego oryginalnego źródła I/O.",
  "Macierz rozdziela default, --no-default-features, jawne diagnostics i niezależne format; nie włącza diagnostics domyślnie.",
  "Wpisano dokładny MSRV Rust 1.85.0 i kandydującą wersję 1.1.0 oraz linki do archiwum, dossier i hashy.",
  "Granica makr jest oznaczona jako N/A, a limity dowodu mówią, że pakiet, przegląd i uruchomienie w przeglądarce nie są dowodem Cargo ani kodowania.",
  "Osobny plan deterministycznie pokrywa BrokenPipe oraz odrzucenie payloadu ponad limit przed I/O zapisu.",
];

const maintenanceReviewCriteria = [
  "CHANGE-REVIEW.md porównuje co najmniej dwie alternatywy ADR i uzasadnia wybraną granicę bez dopisywania nowego API poza kontraktem.",
  "Zapisano własny wynik testu BrokenPipe i ścieżki over-limit, w tym kolejność odrzucenia przed I/O.",
  "Odpowiedź na własny przegląd odnosi się do starego klienta, legacy, dyn, boundów, źródła błędu oraz macierzy features.",
  "Jest osobny komentarz recenzenta i decyzja; samoocena, istnienie pliku i zaznaczone rubryki nie są dowodem Cargo, archiwum, features, MSRV ani niezależnego kodowania.",
];

export const apiFrameProtocolMaintenanceLesson: Lesson = {
  id: "api-frame-protocol-maintenance",
  practiceOnly: true,
  moduleId: "public-api-workspaces",
  conceptIds: ["api-compatible-surface", "api-error-source-chain"],
  competencyIds: [
    "preserve-public-call-surface",
    "public-api-preserved-error-causes",
  ],
  prerequisites: ["api-compatible-surface"],
  title: "Utrzymanie kontraktu Frame Protocol",
  subtitle:
    "Zaplanujesz małą zmianę biblioteki tak, aby stary klient, przyczyna błędu i granice features pozostały obserwowalne.",
  minutes: 22,
  outcomes: [
    "Przewidzisz obowiązki starego klienta przed dodaniem typowanego kodu błędu.",
    "Rozdzielisz ekspozycję przykładu przygotowanego przez autorów od dowodu Cargo wykonywanego we własnym workspace.",
    "Opiszesz test BrokenPipe i limit payloadu jako plan własnej regresji, bez traktowania dossier jako samodzielnego zaliczenia kodowego.",
    "Zachowasz źródło I/O, dawną powierzchnię wywołań, macierz funkcji Cargo oraz dokładny MSRV w zmianie 1.1.0.",
  ],
  steps: [
    choiceStep({
      id: "api-frame-protocol-maintenance-predict",
      kind: "predict",
      title: "Przewidź obowiązki starego klienta",
      prompt:
        "Biblioteka Frame Protocol ma dodać publiczny, niewyczerpujący FrameErrorCode oraz accessor code(), zachowując istniejące warianty FrameError. Co musi pozostać prawdą dla starego klienta?",
      choices: [
        {
          id: "surface",
          label:
            "Dawne ścieżki, wskaźniki funkcji, legacy, dyn FrameReader, boundy implementera i obserwowalne wyjście nadal działają.",
        },
        {
          id: "rewrite",
          label:
            "Stary klient może zostać przepisany, bo każda nowa wersja API unieważnia jego sygnatury.",
        },
        {
          id: "display",
          label:
            "Wystarczy zachować tekst Display; typ źródła i konfiguracja feature są szczegółami implementacji.",
        },
      ],
      correct: "surface",
      explanations: {
        surface:
          "Zmiana jest addytywna: publiczne ścieżki i zachowanie pozostają, a nowy accessor nie zastępuje źródła ani starych boundów.",
        rewrite:
          "Kontrakt utrzymania właśnie wymaga, aby dawny klient nadal był używalny bez przepisywania.",
        display:
          "Display nie jest maszynowym protokołem, a features i źródło są częścią obserwowalnej granicy klienta.",
      },
      evidenceKind: "prediction",
    }),
    choiceStep({
      id: "api-frame-protocol-maintenance-model",
      kind: "explain",
      title: "Model dodatku bez utraty przyczyny",
      prompt:
        "Który model najlepiej opisuje wersję 1.1.0? Wybierz odpowiedź, która pozostawia wewnętrzną architekturę wolną, lecz nazywa publiczny kontrakt i granicę dowodu.",
      choices: [
        {
          id: "typed",
          label:
            "Dodaj FrameErrorCode::{PayloadTooLarge, Io}, code() i diagnostykę tylko za diagnostics; zachowaj oryginalny io::Error, format niezależny, a run Cargo zostaw workspace klienta.",
        },
        {
          id: "text",
          label:
            "Parsuj Display, aby odtworzyć kod; włącz diagnostics domyślnie i zastąp źródło nowym io::Error.",
        },
        {
          id: "trait",
          label:
            "Dodaj wymaganą metodę do FrameReader oraz Clone i Debug, aby każdy klient miał jednolity model błędu.",
        },
      ],
      correct: "typed",
      explanations: {
        typed:
          "Accessor daje kod maszynowy, Error::source zachowuje tożsamość I/O, a niezależne features i zewnętrzny klient wyznaczają osobne dowody.",
        text: "Tekst i odtworzony błąd gubią stabilny typ oraz pierwotne źródło.",
        trait:
          "Nowy wymagany element lub bound łamie dawnych implementerów i może zerwać dyn compatibility.",
      },
      evidenceKind: "exposure",
    }),
    {
      id: "api-frame-protocol-maintenance-run",
      kind: "run",
      title: "Zobacz rozdzielone konfiguracje",
      prompt:
        "Uruchom przygotowany przez autorów model zapisu wyników, korzystający wyłącznie ze standardowej biblioteki. Dwa pierwsze wiersze zachowują stare wyjście, diagnostics dodaje jawny kod i rodzaj źródła, a format pozostaje niezależną opcją. To ekspozycja treści, nie uruchomienie Cargo ani kodu z pobranego workspace.",
      code: maintenanceRun,
      solution: maintenanceRun,
      evaluator: {
        kind: "exact-output",
        expected:
          "default: frame-probe: payload=4 bytes\nno-default: frame-probe: payload=4 bytes\ndiagnostics: error code=io source_kind=UnexpectedEof\nformat: independent optional serde support\n",
      },
      expectedStatus: "success",
      evidenceKind: "exposure",
    },
    {
      id: "api-frame-protocol-maintenance-challenge",
      kind: "assessment",
      title: "Zaplanuj własną regresję utrzymaniową",
      prompt: [
        "W swoim pobranym workspace przygotuj jeszcze nieuzupełniony plik `MAINTENANCE-CHALLENGE.md`. Nie uruchamiaj ani nie importuj tego workspace w aplikacji; pracujesz w swoim środowisku.",
        "",
        "Plik ma wymagać: obserwowanego wyjścia klienta i kontraktu niepowodzenia; zachowania starych wskaźników funkcji, ścieżek `legacy`, `dyn FrameReader` oraz implementera bez `Clone` i `Debug`; typowanego `FrameErrorCode` z zachowaniem oryginalnego źródła; macierzy `default`/`--no-default-features`/`diagnostics`/`format`; dokładnego MSRV Rust 1.85.0 i kandydującej wersji 1.1.0; linków do archiwum, dossier i hashy; granicy makr oznaczonej N/A; oraz jawnych limitów dowodu.",
        "",
        "Dodaj własny, deterministyczny plan regresji: writer zwracający `BrokenPipe` ma zachować kategorię `Io` i pierwotne źródło, a payload ponad limit ma zostać odrzucony przed I/O zapisu. Zaznacz, które obserwacje wykonasz w swoim środowisku. Ta rubryka ocenia strukturę i rozumowanie; plik, checklista ani opis nie są samodzielnym zaliczeniem kodowym ani dowodem Cargo.",
      ].join("\n"),
      evaluator: { kind: "rubric", criteria: maintenanceChallengeCriteria },
      rubric: maintenanceChallengeCriteria,
      evidenceKind: "transfer",
    },
    {
      id: "api-frame-protocol-maintenance-review",
      kind: "assessment",
      title: "Wypełnij przegląd zmiany",
      prompt: [
        "W swoim workspace przygotuj `CHANGE-REVIEW.md`. Zostaw w nim alternatywy ADR i uzasadnienie wybranej granicy, własny wynik testu `BrokenPipe` oraz ścieżki over-limit, odpowiedź na własny przegląd i osobny komentarz recenzenta z decyzją.",
        "",
        "Odnotuj testy i ich rzeczywiste wyniki, ale nie utożsamiaj samooceny, istnienia pliku, zaznaczenia rubryki ani struktury przeglądarki z dowodem Cargo, archiwum, features, MSRV, zewnętrznego crate ani niezależnego kodowania. Utrzymuj dokładną granicę: pobrany pakiet uruchamiasz tylko we własnym środowisku.",
      ].join("\n"),
      evaluator: { kind: "rubric", criteria: maintenanceReviewCriteria },
      rubric: maintenanceReviewCriteria,
      evidenceKind: "self-rating",
      evidenceGate: false,
    },
    choiceStep({
      id: "api-frame-protocol-maintenance-recall",
      kind: "recall",
      title: "Odtwórz granice dowodu",
      prompt:
        "W tej samej sesji przypomnij sobie, co rozstrzyga o poprawności zmiany Frame Protocol, a co pozostaje tylko ekspozycją lub samooceną. Które zdanie jest poprawne?",
      choices: [
        {
          id: "matrix",
          label:
            "Stary klient, tożsamość źródła, features, 1.85.0, pakiet i hash wymagają własnych obserwacji; przykład autorów, pakiet i samoocena nie tworzą samodzielnego zaliczenia kodowego.",
        },
        {
          id: "packet",
          label:
            "Wypełniony CHANGE-REVIEW.md zastępuje Cargo, a zaznaczona rubryka daje niezależne zaliczenie kodowe.",
        },
        {
          id: "delay",
          label:
            "Samo ukończenie tego kroku dowodzi opóźnionego utrwalenia, więc należy utworzyć nową powtórkę z odroczeniem.",
        },
      ],
      correct: "matrix",
      explanations: {
        matrix:
          "Każdy wymiar ma własną granicę dowodu; pakiet i samoocena porządkują pracę, ale nie są dowodem uruchomienia ani niezależnego kodowania.",
        packet:
          "Dokument opisuje decyzje i wyniki, lecz nie uruchamia Cargo i nie może sam przyznać samodzielnego zaliczenia kodowego.",
        delay:
          "To zwykłe przypomnienie w tej samej sesji, nie dowód opóźnionej retencji i nie nowa timed review.",
      },
      evidenceKind: "recall",
    }),
  ],
  misconceptions: [
    "Tekst Display albo nowy ErrorKind wystarcza zamiast zachowania oryginalnego źródła.",
    "Przykład autorów w przeglądarce i wypełniony pakiet są dowodem wykonania Cargo w zewnętrznym crate.",
    "Dodanie boundu Clone, Debug albo wymaganej metody jest neutralne dla starych implementerów i dyn.",
    "Samoocena ADR nie może zwiększyć niezależnego zaliczenia kodowego, a przypomnienie w tej samej sesji nie jest opóźnionym utrwaleniem.",
  ],
  transferTask:
    "W swoim workspace opisz zmianę publicznego błędu: zachowaj stare wywołania, typowany kod, Error::source, macierz features i dokładny MSRV. Zapisz osobno, które wyniki pochodzą z własnego Cargo.",
  evidenceGate:
    "Ten punkt kontrolny jest opcjonalną praktyką utrzymania. Jego przykład autorów, plan BrokenPipe/over-limit, CHANGE-REVIEW.md i samoocena nie zmieniają czterech kryteriów modułu ani nie dają samodzielnego zaliczenia kodowego; jedynym twardym warunkiem wstępnym pozostaje api-compatible-surface.",
  sourceIds: [
    "api-evolution-cargo-semver-compatibility",
    "api-evolution-reference-visibility",
    "api-evolution-cargo-features",
    "api-evolution-cargo-rust-version",
    "api-evolution-cargo-workspaces",
    "api-release-workspaces-reference",
  ],
};
