import type { Lesson, LessonStep } from "@/domain/types";
import { ownershipFoundationDropSteps } from "./ownership-foundation-drop";
import { ownershipFoundationValueSteps } from "./ownership-foundation-values";

/**
 * A short exposure step that joins the three concrete ownership boundaries in
 * this checkpoint.  It deliberately names the supplied APIs without asking a
 * learner to implement the harness or any of the five primary functions.
 */
export const ownershipFoundationModel: LessonStep = {
  id: "foundation-contract-model",
  kind: "predict",
  title: "Przewiduj trzy obserwacje własności",
  prompt:
    "Zanim przejdziesz do kodu, przewidź wynik trzech granic, uwzględniając `Option::take`, dostarczone `support::DropLog` i `support::Marker` oraz typy `Copy`: co powinno pozostać w slocie po odrzuconej próbie, jakie zdarzenia zobaczysz po wyjściu z zakresu i co wolno zachować po zmianie wartości? Wybierz opis, który najlepiej pasuje do tych obserwacji; krótkie wyjaśnienie po odpowiedzi doprecyzuje kontrakt.",
  choices: [
    {
      id: "restore-observe-copy",
      label:
        "Błąd przywraca oryginał; log obserwuje drop; Copy pozwala zachować snapshot.",
    },
    {
      id: "discard-layout",
      label:
        "Błąd może wyrzucić String, a Copy mówi, gdzie wartość leży w pamięci.",
    },
    {
      id: "clone-everything",
      label:
        "Każda granica wymaga clone, aby wynik i historia drop były poprawne.",
    },
  ],
  evaluator: {
    kind: "choice",
    correct: "restore-observe-copy",
    explanations: {
      "restore-observe-copy":
        'Poprawnie. `Option::take` tymczasowo wyjmuje własny `String`; w tym wąskim kontrakcie odrzucona próba oddaje go do slotu i zwraca `Err("rejected")`, a przyjęta zwraca `Ok(())` oraz zapisuje prefiks `accepted:`. Dostarczone, nieprzezroczyste `support::DropLog` i `support::Marker` udostępniają tylko `count()` oraz snapshot `events()` z obserwacjami `inner` i `outer` — nie implementujesz `Drop`, `RefCell` ani generycznego mechanizmu. `u32` i `[bool; 3]` są `Copy`, więc snapshot jest osobną wartością do odczytu; `Copy` nie oznacza głębokiego klonowania ani obietnicy położenia w pamięci.',
      "discard-layout":
        'Nie: odrzucona próba musi zachować własność `String` i w tym kontrakcie zwrócić `Err("rejected")`; `Copy` nie opisuje fizycznego położenia wartości. Po poprawnej odpowiedzi sprawdź, co pokazują dostarczone `DropLog`/`Marker` przez `count()` i `events()`.',
      "clone-everything":
        "Nie: kontrakty dopuszczają równoważne implementacje i nie wymagają `clone` ani implementacji logu. Dostarczony `DropLog`/`Marker` służy wyłącznie do obserwacji, a typy `Copy` zachowują snapshot bez obietnicy głębokiego klonowania.",
    },
  },
  evidence: {
    version: 2,
    conceptIds: ["ownership-repair", "scope-drop", "copy-semantics"],
  },
  evidenceKind: "exposure",
};

export const ownershipFoundationTransferSteps: LessonStep[] = [
  ownershipFoundationModel,
  ownershipFoundationValueSteps[0],
  ...ownershipFoundationDropSteps,
  ...ownershipFoundationValueSteps.slice(1),
];

export const ownershipFoundationTransferLesson: Lesson = {
  id: "ownership-foundation-transfer",
  moduleId: "data-modeling",
  conceptIds: ["ownership-repair", "scope-drop", "copy-semantics"],
  competencyIds: [
    "repair-compiler-feedback",
    "predict-memory",
    "classify-copy-move",
  ],
  prerequisites: ["option-and-absence"],
  title: "Fundamenty własności: odtworzenie, drop i Copy",
  subtitle:
    "Przenieś rozumowanie o Option, zakresie i Copy do małych kontraktów obserwowalnych testami.",
  minutes: 22,
  outcomes: [
    "Odtworzysz własny String w Option po odrzuconej próbie.",
    "Przewidzisz kolejność zdarzeń drop z dostarczonego logu.",
    "Wykorzystasz Copy do zachowania snapshotu przed zmianą.",
  ],
  steps: ownershipFoundationTransferSteps,
  misconceptions: [
    "Option::take automatycznie usuwa odrzuconą wartość zamiast oddać ją właścicielowi.",
    "Snapshot events() oznacza, że uczeń implementuje własny Drop albo RefCell.",
    "Copy jest obietnicą fizycznego położenia danych lub głębokiego klonowania.",
  ],
  transferTask:
    "Przenieś te same obserwacje do nowego kontraktu: sprawdź stan po błędzie, zdarzenia po wyjściu z zakresu i niezmieniony snapshot typu Copy.",
  evidenceGate:
    "Pięć niezależnych zadań przechodzi własne testy kontraktowe; model jest wyłącznie ekspozycją.",
  sourceIds: ["rust-book-ownership", "rust-book-scope", "rust-copy-trait"],
  sessionStops: [
    {
      afterStepId: "ownership-restore-rejection-transfer",
      title: "Opcjonalna przerwa przed Drop i Copy",
      nextGoal:
        "Wróć do obserwacji logu i snapshotów Copy. Szacunek czasu lekcji jest orientacyjny; zachowaj zapisany postęp.",
    },
  ],
};
