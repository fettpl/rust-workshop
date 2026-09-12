import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-12";

export const channelsSources: Source[] = [
  {
    id: "channels-book-message-passing",
    title: "The Rust Programming Language: Message Passing",
    url: "https://doc.rust-lang.org/book/ch16-02-message-passing.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie opisu mpsc, send, recv, try_recv, klonowania nadawcy i własności przesyłanej wartości.",
  },
  {
    id: "channels-std-channel",
    title: "Rust standard library: mpsc::channel",
    url: "https://doc.rust-lang.org/std/sync/mpsc/fn.channel.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisu channel, buforowania, kolejności jednego nadawcy albo warunków rozłączenia.",
  },
  {
    id: "channels-std-receiver",
    title: "Rust standard library: mpsc::Receiver",
    url: "https://doc.rust-lang.org/std/sync/mpsc/struct.Receiver.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu recv, try_recv, iter lub zachowania bufora po zniknięciu nadawców.",
  },
  {
    id: "channels-std-sync-channel",
    title: "Rust standard library: mpsc::sync_channel",
    url: "https://doc.rust-lang.org/std/sync/mpsc/fn.sync_channel.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie podpisu sync_channel, pojemności bufora, blokowania send albo kanału rendezvous o pojemności zero.",
  },
  {
    id: "channels-std-try-send-error",
    title: "Rust standard library: mpsc::TrySendError",
    url: "https://doc.rust-lang.org/std/sync/mpsc/enum.TrySendError.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie wariantów Full i Disconnected oraz tego, czy oba warianty zwracają niesłaną wartość.",
  },
];

export const channelsCompetencies: Competency[] = [
  {
    id: "channel-ownership",
    title:
      "Przesyłasz własność przez mpsc, klonujesz nadawcę i zachowujesz wartość zwróconą przez błąd send.",
  },
  {
    id: "channel-lifecycle",
    title:
      "Kończysz odbiór po zniknięciu wszystkich nadawców, opróżniając wcześniej wysłany bufor.",
  },
  {
    id: "channel-backpressure",
    title:
      "Dobierasz sync_channel z jawną pojemnością i obsługujesz Full oraz Disconnected przez odzyskanie wartości.",
  },
];

export const channelsConcepts: Concept[] = [
  {
    id: "channel-ownership",
    title: "mpsc przekazuje własność wartości do jednego odbiorcy",
    prerequisites: ["scoped-threads"],
    competencyIds: ["channel-ownership"],
    reviewPrompt:
      "Co dzieje się z `String`, gdy wywołasz `sender.send(value)`, i jaki typ zwraca `receiver.recv()`? Dlaczego `Sender::clone` nie tworzy drugiego odbiorcy?",
    reviewAnswer:
      "send przyjmuje wartość przez własność i po udanym wysłaniu przekazuje ją do kanału; recv zwraca Result<T, RecvError>, więc udany odbiór daje własne T. Sender::clone tworzy kolejnego producenta tego samego kanału, a mpsc nadal ma tylko jeden Receiver.",
    distinguish:
      "Kanał przekazuje własność, więc po udanym send nadawca nie może używać wysłanej wartości. Clone dotyczy uchwytu Sendera, a nie danych; każdy Sender wysyła do tego samego pojedynczego Receivera.",
  },
  {
    id: "channel-lifecycle",
    title: "recv kończy się dopiero po zamknięciu wszystkich nadawców",
    prerequisites: ["channel-ownership"],
    competencyIds: ["channel-lifecycle"],
    reviewPrompt:
      "Dlaczego `for value in receiver` może czekać, gdy lokalny `Sender` został już użyty, ale jego klon nadal żyje? Co stanie się z wiadomościami wysłanymi przed drop ostatniego nadawcy?",
    reviewAnswer:
      "Iterator Receiver kończy się None dopiero, gdy nie ma już żadnego Sendera, także żadnego klona. Wiadomości umieszczone w buforze przed rozłączeniem pozostają dostępne i są zwracane przed końcowym None/RecvError.",
    distinguish:
      "Drop jednego uchwytu nie zamyka mpsc, jeśli żyje inny Sender. Zamknięcie nadawców nie usuwa bufora: odbiorca ma najpierw opróżnić wysłane wartości, a dopiero potem zobaczyć koniec strumienia.",
  },
  {
    id: "channel-backpressure",
    title: "sync_channel ogranicza bufor i sygnalizuje presję",
    prerequisites: ["channel-lifecycle"],
    competencyIds: ["channel-backpressure"],
    reviewPrompt:
      "Czym różnią się `TrySendError::Full(value)` i `TrySendError::Disconnected(value)`? Jak zachować `value`, gdy kanał nie może go przyjąć?",
    reviewAnswer:
      "Full oznacza, że ograniczony bufor jest chwilowo pełny; Disconnected oznacza, że Receiver zniknął. Oba warianty zawierają niesłaną wartość T, więc można ją dopisać do kolejki ponowień, zwrócić wyżej albo jawnie odrzucić.",
    distinguish:
      "sync_channel(bound) ma jawną pojemność: send może blokować po jej zapełnieniu, a try_send natychmiast daje Full(T). Disconnected(T) opisuje trwałe zamknięcie odbiorcy; w obu przypadkach własność T wraca do nadawcy.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: number,
  answers: [string, string, string],
  explanations: [string, string, string],
  code?: string,
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    ...(code === undefined
      ? {}
      : { code, solution: code, expectedStatus: "success" as const }),
    choices: answers.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct: String(correct),
      explanations: Object.fromEntries(
        explanations.map((explanation, index) => [String(index), explanation]),
      ),
    },
    evidenceKind:
      kind === "predict"
        ? "prediction"
        : kind === "recall"
          ? "recall"
          : "exposure",
  };
}

function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
  };
}

function compilerError(
  id: string,
  title: string,
  prompt: string,
  code: string,
  solution: string,
  error: string,
): LessonStep {
  return {
    id,
    kind: "observe",
    title,
    prompt,
    code,
    solution,
    evaluator: { kind: "expected-error", code: error },
    expectedStatus: "compile-error",
    expectedError: error,
    evidenceKind: "exposure",
  };
}

function coding(options: {
  id: string;
  kind: "modify" | "apply" | "debug" | "blank";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined ? {} : { code: options.code }),
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    ...(options.code === undefined
      ? {}
      : { expectedStatus: "success" as const }),
    evidenceKind: options.kind === "blank" ? "assessment" : "transfer",
    evidenceGate: options.gate ?? false,
  };
}

const ownershipRun = `use std::sync::mpsc::channel;
use std::thread;

fn main() {
    let (sender, receiver) = channel();
    let worker = thread::spawn(move || {
        let message = String::from("z wątku");
        sender.send(message).unwrap();
    });
    let received = receiver.recv().unwrap();
    worker.join().unwrap();
    println!("{received}");
}`;

const ownershipMoveError = `use std::sync::mpsc::channel;

fn main() {
    let (sender, _receiver) = channel();
    let message = String::from("własność");
    sender.send(message).unwrap();
    println!("{message}");
}`;

const ownershipMoveSolution = `use std::sync::mpsc::channel;

fn main() {
    let (sender, receiver) = channel();
    let message = String::from("własność");
    sender.send(message).unwrap();
    println!("{}", receiver.recv().unwrap());
}`;

const ownershipModifySolution = `use std::sync::mpsc::Sender;

fn send_to(sender: Sender<String>, message: String) -> Result<(), String> {
    sender.send(message).map_err(|error| error.0)
}`;

const ownershipModifyTests = `#[test]
fn transfers_owned_text_to_the_external_receiver() {
    let (sender, receiver) = std::sync::mpsc::channel();
    assert_eq!(send_to(sender, String::from("żółć")), Ok(()));
    assert_eq!(receiver.recv().unwrap(), "żółć");
}

#[test]
fn disconnected_receiver_returns_the_original_value() {
    let (sender, receiver) = std::sync::mpsc::channel();
    drop(receiver);
    assert_eq!(send_to(sender, String::from("kanał")), Err(String::from("kanał")));
}`;

const ownershipBlankSolution = `use std::sync::mpsc::Receiver;

fn drain_external(receiver: Receiver<String>) -> Vec<String> {
    receiver.into_iter().collect()
}`;

const ownershipBlankTests = `#[test]
fn drains_test_producers_and_keeps_per_producer_order() {
    let (sender, receiver) = std::sync::mpsc::channel();
    let left_sender = sender.clone();
    let left = std::thread::spawn(move || {
        for value in ["A1", "A2", "A3"] {
            left_sender.send(String::from(value)).unwrap();
        }
    });
    let right = std::thread::spawn(move || {
        for value in ["B1", "B2"] {
            sender.send(String::from(value)).unwrap();
        }
    });
    let values = drain_external(receiver);
    left.join().unwrap();
    right.join().unwrap();
    assert_eq!(values.len(), 5);
    let left: Vec<_> = values.iter().filter(|value| value.starts_with('A')).collect();
    let right: Vec<_> = values.iter().filter(|value| value.starts_with('B')).collect();
    assert_eq!(left, vec![&String::from("A1"), &String::from("A2"), &String::from("A3")]);
    assert_eq!(right, vec![&String::from("B1"), &String::from("B2")]);
}

#[test]
fn drains_a_single_external_producer() {
    let (sender, receiver) = std::sync::mpsc::channel();
    let worker = std::thread::spawn(move || sender.send(String::from("tylko")).unwrap());
    let values = drain_external(receiver);
    worker.join().unwrap();
    assert_eq!(values, vec![String::from("tylko")]);
}`;

const lifecycleRun = `use std::sync::mpsc::channel;

fn main() {
    let (sender, receiver) = channel();
    let clone = sender.clone();
    sender.send("pierwszy").unwrap();
    clone.send("drugi").unwrap();
    drop(clone);
    drop(sender);

    let mut values = Vec::new();
    while let Ok(value) = receiver.recv() {
        values.push(value);
    }
    println!("{}", values.join("|"));
}`;

const lifecycleModifySolution = `use std::sync::mpsc::Receiver;

fn drain_closed(receiver: Receiver<String>) -> Vec<String> {
    receiver.into_iter().collect()
}`;

const lifecycleModifyTests = `#[test]
fn drains_an_external_buffer_before_reporting_channel_end() {
    let (sender, receiver) = std::sync::mpsc::channel();
    sender.send(String::from("jeden")).unwrap();
    sender.send(String::from("dwa")).unwrap();
    drop(sender);
    assert_eq!(
        drain_closed(receiver),
        vec![String::from("jeden"), String::from("dwa")]
    );
}

#[test]
fn an_external_empty_channel_closes_cleanly() {
    let (sender, receiver) = std::sync::mpsc::channel();
    drop(sender);
    assert!(drain_closed(receiver).is_empty());
}`;

const lifecycleBlankSolution = `use std::sync::mpsc::Sender;

fn deliver_or_recover<F: FnOnce(String)>(sender: &Sender<String>, value: String, recover: F) -> bool {
    match sender.send(value) {
        Ok(()) => true,
        Err(error) => { recover(error.0); false }
    }
}`;

const lifecycleBlankTests = `#[test]
fn success_delivers_without_recovery() {
    let (sender, receiver) = std::sync::mpsc::channel();
    assert!(deliver_or_recover(&sender, String::from("wysłane"), |_| panic!("nie odzyskuj sukcesu")));
    assert_eq!(receiver.try_recv().unwrap(), "wysłane");
}

#[test]
fn recovery_receives_the_exact_unsent_value_once() {
    for value in ["wróć", "", "drugie dane"] {
        let (sender, receiver) = std::sync::mpsc::channel();
        drop(receiver);
        let mut recovered = Vec::new();
        assert!(!deliver_or_recover(&sender, value.to_owned(), |text| recovered.push(text)));
        assert_eq!(recovered, vec![value]);
    }
}`;

const backpressureRun = `use std::sync::mpsc::{sync_channel, TrySendError};

fn main() {
    let (sender, receiver) = sync_channel(1);
    sender.send(String::from("pierwszy")).unwrap();
    let retained = match sender.try_send(String::from("drugi")) {
        Err(TrySendError::Full(value)) => value,
        _ => String::from("błąd"),
    };
    let first = receiver.recv().unwrap();
    println!("pełny: {retained}");
    sender.send(retained).unwrap();
    let second = receiver.recv().unwrap();
    println!("odebrane: {first}|{second}");

    let (sender, receiver) = sync_channel(1);
    drop(receiver);
    match sender.try_send(String::from("awaryjne")) {
        Err(TrySendError::Disconnected(value)) => println!("rozłączony: {value}"),
        _ => println!("nieoczekiwane"),
    }
}`;

const backpressureModifySolution = `use std::sync::mpsc::{SyncSender, TrySendError};

fn try_enqueue(sender: &SyncSender<String>, value: String) -> Result<(), TrySendError<String>> {
    sender.try_send(value)
}`;

const backpressureModifyTests = `#[test]
fn success_enqueues_the_original_value() {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    assert_eq!(try_enqueue(&sender, String::from("nowe")), Ok(()));
    assert_eq!(receiver.try_recv().unwrap(), "nowe");
}

#[test]
fn full_keeps_the_value_for_a_later_attempt() {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    sender.send(String::from("zajęte")).unwrap();
    let error = try_enqueue(&sender, String::from("oczekuje")).unwrap_err();
    assert_eq!(error, std::sync::mpsc::TrySendError::Full(String::from("oczekuje")));
    assert_eq!(receiver.recv().unwrap(), "zajęte");
}

#[test]
fn disconnected_also_returns_the_value() {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    drop(receiver);
    assert_eq!(
        try_enqueue(&sender, String::from("odrzucone")),
        Err(std::sync::mpsc::TrySendError::Disconnected(String::from("odrzucone")))
    );
}`;

const backpressureBlankSolution = `use std::sync::mpsc::{SyncSender, TrySendError};

enum BatchDelivery {
    Complete,
    Full(Vec<String>),
    Disconnected(Vec<String>),
}

fn send_batch(sender: &SyncSender<String>, values: Vec<String>) -> BatchDelivery {
    let mut remaining = values.into_iter();
    while let Some(value) = remaining.next() {
        match sender.try_send(value) {
            Ok(()) => {}
            Err(TrySendError::Full(value)) => {
                return BatchDelivery::Full(std::iter::once(value).chain(remaining).collect());
            }
            Err(TrySendError::Disconnected(value)) => {
                return BatchDelivery::Disconnected(std::iter::once(value).chain(remaining).collect());
            }
        }
    }
    BatchDelivery::Complete
}`;

const backpressureBlankTests = `#[test]
fn a_partial_batch_keeps_order_and_can_be_retried() {
    let (sender, receiver) = std::sync::mpsc::sync_channel(2);
    sender.send(String::from("seed")).unwrap();
    let pending = match send_batch(&sender, vec!["A".into(), "żółć".into(), "C".into()]) {
        BatchDelivery::Full(values) => values,
        _ => panic!("oczekiwano Full"),
    };
    assert_eq!(pending, vec!["żółć", "C"]);
    assert_eq!(receiver.try_recv().unwrap(), "seed");
    assert_eq!(receiver.try_recv().unwrap(), "A");
    assert!(matches!(send_batch(&sender, pending), BatchDelivery::Complete));
    assert_eq!(receiver.try_recv().unwrap(), "żółć");
    assert_eq!(receiver.try_recv().unwrap(), "C");
    assert!(receiver.try_recv().is_err());
}

#[test]
fn full_disconnected_and_empty_preserve_the_contract() {
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    sender.send("occupied".into()).unwrap();
    match send_batch(&sender, vec!["".into(), "B".into()]) {
        BatchDelivery::Full(values) => assert_eq!(values, vec!["", "B"]),
        _ => panic!("pełny bufor"),
    }
    assert_eq!(receiver.try_recv().unwrap(), "occupied");
    drop(receiver);
    match send_batch(&sender, vec!["oddaj".into(), "wszystko".into()]) {
        BatchDelivery::Disconnected(values) => assert_eq!(values, vec!["oddaj", "wszystko"]),
        _ => panic!("odbiorca zniknął"),
    }
    assert!(matches!(send_batch(&sender, Vec::new()), BatchDelivery::Complete));
}`;

export const channelsLessons: Lesson[] = [
  {
    id: "channel-ownership",
    moduleId: "channels",
    conceptIds: ["channel-ownership"],
    competencyIds: ["channel-ownership"],
    prerequisites: ["scoped-threads"],
    title: "Kanał przekazuje własność",
    subtitle:
      "Wyślij wartość do jednego odbiorcy, odbierz ją przez Result i dodaj kolejnego producenta.",
    minutes: 18,
    outcomes: [
      "Rozpoznasz Sender<T>, Receiver<T> i własność T w send oraz recv.",
      "Wyjaśnisz, dlaczego po udanym send nie wolno użyć wysłanej wartości.",
      "Użyjesz Sender::clone, zachowując kolejność wiadomości każdego producenta.",
    ],
    steps: [
      choose(
        "ownership-predict",
        "predict",
        "Przewidź przepływ własności",
        "Wątek tworzy String, wywołuje `sender.send(message)`, a odbiorca wywołuje `receiver.recv()`. Które zdanie najlepiej opisuje wykonanie?",
        1,
        [
          "send kopiuje String, więc wątek nadal ma niezależny egzemplarz",
          "send przekazuje własność, a recv oddaje własny String w `Result<String, RecvError>`",
          "recv może działać tylko z `&String`, bo kanał nie przechowuje własnych danych",
        ],
        [
          "String nie jest kopiowany implicitnie; udany send przenosi jego własność do kanału.",
          "To jest kontrakt mpsc: nadawca oddaje T, a odbiorca odzyskuje T po Ok.",
          "Kanał przechowuje przesłaną wartość, więc recv zwraca ją jako własność w Result.",
        ],
        ownershipRun,
      ),
      run(
        "ownership-run",
        "Uruchom pojedynczego producenta",
        "Uruchom kod i porównaj dokładny tekst. `join` porządkuje zakończenie wątku, a odbiorca drukuje wartość dopiero po recv.",
        ownershipRun,
        "z wątku\n",
      ),
      compilerError(
        "ownership-error",
        "Zobacz użycie po send",
        "Uruchom przykład. E0382 mówi, że `message` zostało przeniesione przez send. Naprawa drukuje wartość po stronie odbiorcy, po recv.",
        ownershipMoveError,
        ownershipMoveSolution,
        "E0382",
      ),
      choose(
        "ownership-explain",
        "explain",
        "Dobierz właściwy uchwyt",
        "Potrzebujesz dwóch producentów i jednego odbiorcy. Który układ jest zgodny z `std::sync::mpsc`?",
        0,
        [
          "Sklonuj `Sender<T>` i przenieś każdy uchwyt do własnego wątku; zachowaj jeden `Receiver<T>`",
          "Sklonuj `Receiver<T>` do każdego wątku, bo każdy producent powinien mieć własny odbiornik",
          "Sklonuj każdy String, a następnie użyj jednego Sendera bez przenoszenia do wątku",
        ],
        [
          "mpsc oznacza wielu producentów i jednego konsumenta; clone dotyczy Sendera.",
          "Receiver jest pojedynczym konsumentem i nie jest klonowany jako część tego kontraktu.",
          "Klonowanie danych nie rozwiązuje własności uchwytu Sendera ani bezpiecznego wejścia do wątku.",
        ],
      ),
      coding({
        id: "ownership-modify",
        kind: "modify",
        title: "Napraw przesłanie tekstu",
        prompt:
          "Uzupełnij `send_to`, która przyjmuje `Sender<String>` i `String`, a zwraca `Result<(), String>`. Wyślij własność tekstu do dostarczonego Sendera i zamień `SendError<String>` na odzyskany String. Testy odbiorą wartość z zewnętrznego Receivera, a w drugim przypadku wcześniej go drop; sprawdzą Unicode i własność po błędzie.",
        code: `use std::sync::mpsc::Sender;

fn send_to(sender: Sender<String>, message: String) -> Result<(), String> {
    Err(message)
}`,
        solution: ownershipModifySolution,
        tests: ownershipModifyTests,
        gate: true,
        hints: [
          "Obszar problemu: połącz dwa wyniki `Result` bez tworzenia kopii Stringa.",
          "Reguła: `send` przyjmuje T przez własność, a SendError<T> zawiera T po odmowie; zwróć Ok(()) po sukcesie i wyjmij error.0 po rozłączeniu.",
        ],
      }),
      coding({
        id: "ownership-blank",
        kind: "blank",
        title: "Od pustej strony: dwóch producentów",
        prompt:
          "Napisz własną funkcję `drain_external`, która przyjmuje jeden `std::sync::mpsc::Receiver<String>` i zwraca `Vec<String>`. Test dostarczy Receiver oraz dwóch producentów przez `std::thread::spawn` i `Sender::clone`; funkcja ma odebrać wszystkie wartości do końca kanału. Test może sprawdzać kolejność każdego producenta osobno, ale nie zakłada globalnej kolejności między producentami. Nie zostawiaj żywego nadawcy przed iteracją odbiornika; dołącz oba testowe wątki.",
        solution: ownershipBlankSolution,
        tests: ownershipBlankTests,
        gate: true,
        hints: [
          "Obszar problemu: rozdziel uchwyty Sendera i zakończ odbiór dopiero po danych od obu testowych producentów.",
          "Reguła: kolejność jest gwarantowana w obrębie pojedynczego producenta; koniec iteratora wymaga zniknięcia wszystkich uchwytów Sender.",
        ],
      }),
    ],
    misconceptions: [
      "send kopiuje String i pozwala użyć tej samej wartości po wysłaniu.",
      "mpsc oznacza wielu odbiorców, więc Receiver można klonować dla każdego wątku.",
      "Kolejność wiadomości dwóch producentów jest globalnie ustalona przez nazwę mpsc.",
    ],
    transferTask:
      "Zaprojektuj małą funkcję, która przenosi własny String z producenta do jednego konsumenta, a potem rozszerz ją o drugi Sender i test kolejności osobno dla każdego producenta.",
    evidenceGate:
      "Zadania ownership-modify i ownership-blank sprawdzają przekazanie własności, błędy Result, wszystkie wiadomości oraz kolejność w obrębie każdego producenta bez fałszywej gwarancji kolejności globalnej.",
    sourceIds: [
      "channels-book-message-passing",
      "channels-std-channel",
      "channels-std-receiver",
    ],
  },
  {
    id: "channel-lifecycle",
    moduleId: "channels",
    conceptIds: ["channel-lifecycle"],
    competencyIds: ["channel-lifecycle"],
    prerequisites: ["channel-ownership"],
    title: "Cykl życia kanału",
    subtitle:
      "Opróżnij bufor, zamknij wszystkich nadawców i jawnie obsłuż zniknięcie odbiorcy.",
    minutes: 18,
    outcomes: [
      "Przewidzisz, kiedy recv i iter Receiver kończą się błędem lub None.",
      "Wyjaśnisz, dlaczego każdy klon Sendera musi zniknąć przed końcem odbioru.",
      "Odzyskasz niesłaną wartość z `SendError<T>` po drop Receivera.",
    ],
    steps: [
      choose(
        "lifecycle-predict",
        "predict",
        "Przewidź koniec odbioru",
        "`sender` i `clone` wysyłają po jednej wartości. Następnie oba uchwyty są drop, a odbiorca wywołuje `recv` w pętli. Co pojawi się w wyniku?",
        2,
        [
          "Pętla kończy się od razu, bo drop pierwszego Sendera kasuje też wiadomość",
          "Pętla czeka bez końca, bo Receiver nie zna liczby producentów",
          "Najpierw oba wysłane teksty, potem błąd końca; bufor jest opróżniany przed rozłączeniem",
        ],
        [
          "Drop uchwytu nie usuwa już wysłanej wartości.",
          "Koniec jest wykrywalny, gdy znikną wszystkie Sendery; nie trzeba znać ich liczby z góry.",
          "recv oddaje buforowane wartości, a po drop ostatniego nadawcy sygnalizuje, że nic więcej nie nadejdzie.",
        ],
        lifecycleRun,
      ),
      run(
        "lifecycle-run",
        "Opróżnij bufor po drop",
        "Uruchom kod. Oba Sendery znikają przed pętlą, więc dokładny wynik ma dwie wartości w kolejności wysłania.",
        lifecycleRun,
        "pierwszy|drugi\n",
      ),
      choose(
        "lifecycle-explain",
        "explain",
        "Znajdź żywego nadawcę",
        "Odbiorca używa `for value in receiver`, ale pętla nie kończy się. Która przyczyna jest najbardziej prawdopodobna?",
        1,
        [
          "Receiver przechowuje wszystkie wiadomości wiecznie i nigdy nie zwraca None",
          "Jakiś Sender albo jego clone nadal żyje, więc odbiorca czeka na możliwą następną wiadomość",
          "Pętla for wymaga `try_recv`, a recv nie może wykryć końca kanału",
        ],
        [
          "Iterator Receiver kończy się po rozłączeniu, a nie po opróżnieniu samego bufora.",
          "Dopóki istnieje choć jeden Sender, recv może legalnie czekać na kolejną wartość.",
          "Receiver::into_iter używa tego samego kontraktu końca co recv: None pojawia się po rozłączeniu i opróżnieniu.",
        ],
      ),
      choose(
        "lifecycle-recall",
        "recall",
        "Wybierz API do nieblokującej kontroli",
        "Masz odebrać tylko już oczekujące wiadomości i natychmiast rozróżnić pusty kanał od rozłączonego. Które API pasuje?",
        0,
        [
          "`receiver.try_recv()` i dopasowanie do `TryRecvError::Empty` oraz `Disconnected`",
          "`receiver.recv()` w pętli, bo zawsze kończy się natychmiast",
          "`sender.clone()`, bo klonowanie nadawcy opróżnia bufor",
        ],
        [
          "try_recv nie czeka i ma dwa przypadki błędu: Empty oraz Disconnected.",
          "recv może blokować, gdy Sender nadal żyje i nie ma wiadomości.",
          "Clone dodaje producenta; nie pobiera żadnej wartości.",
        ],
      ),
      coding({
        id: "lifecycle-modify",
        kind: "modify",
        title: "Napraw opróżnianie do końca",
        prompt:
          "Uzupełnij `drain_closed`, która przyjmuje dostarczony `std::sync::mpsc::Receiver<String>` i zwraca `Vec<String>`. Test przed wywołaniem wypełni zewnętrzny kanał, zamknie ostatniego Sendera, a funkcja ma odebrać cały bufor przez iterator Receiver. Starter nie może pozostawić pętli czekającej; testy sprawdzą dwa teksty i pusty, już zamknięty kanał.",
        code: `use std::sync::mpsc::Receiver;

fn drain_closed(_receiver: Receiver<String>) -> Vec<String> {
    Vec::new()
}`,
        solution: lifecycleModifySolution,
        tests: lifecycleModifyTests,
        gate: true,
        hints: [
          "Obszar problemu: zakończenie producenta musi nastąpić przed oczekiwaniem na koniec iteratora.",
          "Reguła: receiver.into_iter() pobiera buforowane wartości i kończy się dopiero po zniknięciu wszystkich Senderów dostarczonych przez test.",
        ],
      }),
      coding({
        id: "lifecycle-blank",
        kind: "blank",
        title: "Od pustej strony: odzyskaj niesłane dane",
        prompt:
          "Napisz funkcję `deliver_or_recover`. Przyjmuje kolejno `&std::sync::mpsc::Sender<String>`, własny String oraz callback F, który przyjmuje String i nie zwraca wartości (`FnOnce(String)`). Wynikiem jest bool. Po udanym przesłaniu do dostarczonego kanału zwróć true, bez callbacku. Jeśli odbiorca zniknął, przekaż do callbacku dokładnie raz oryginalny niesłany tekst i zwróć false. Nie panikuj na błędzie wysłania; testy obejmują także pusty tekst.",
        solution: lifecycleBlankSolution,
        tests: lifecycleBlankTests,
        gate: true,
        hints: [
          "Obszar problemu: błąd nadawania ma własność niesłanej wartości i trzeba ją wyjąć bez paniki.",
          "SendError<T> zachowuje własność T. Polityka odzyskania należy do callbacku i ma działać wyłącznie po nieudanym wysłaniu.",
        ],
      }),
    ],
    misconceptions: [
      "Drop jednego Sendera usuwa wszystkie pozostałe klony.",
      "Iterator Receiver kończy się zaraz po opróżnieniu bufora, nawet gdy Sender żyje.",
      "SendError<T> niszczy wartość, której nie dało się wysłać.",
    ],
    transferTask:
      "Zaprojektuj skończony producent–konsument: wskaż moment drop ostatniego Sendera, pokaż opróżnienie bufora i opisz osobno scenariusz drop Receivera.",
    evidenceGate:
      "Zadania lifecycle-modify i lifecycle-blank niezależnie sprawdzają wyczerpanie zewnętrznego bufora po zamknięciu, koniec pustego kanału oraz odzyskanie dokładnej wartości z SendError.",
    sourceIds: [
      "channels-book-message-passing",
      "channels-std-receiver",
      "channels-std-channel",
    ],
  },
  {
    id: "channel-backpressure",
    moduleId: "channels",
    conceptIds: ["channel-backpressure"],
    competencyIds: ["channel-backpressure"],
    prerequisites: ["channel-lifecycle"],
    title: "Backpressure przez sync_channel",
    subtitle:
      "Ogranicz bufor, wybierz try_send i zachowaj wartość, gdy odbiorca nie przyjmuje wiadomości.",
    minutes: 20,
    outcomes: [
      "Rozróżnisz kanał asynchroniczny od ograniczonego `sync_channel(bound)`.",
      "Obsłużysz Full(T) bez utraty wiadomości i Disconnected(T) po drop Receivera.",
      "Zatrzymasz wysyłanie partii na pierwszej odmowie i zachowasz resztę do ponowienia.",
    ],
    steps: [
      choose(
        "backpressure-predict",
        "predict",
        "Przewidź try_send",
        "Dla `sync_channel(1)` pierwszy String zajmuje jedyne miejsce. Co zwróci `sender.try_send(drugi)` i gdzie jest własność `drugi`?",
        0,
        [
          "Err(TrySendError::Full(drugi)); wartość pozostaje w błędzie i można spróbować ponownie",
          "Ok(()) oraz automatyczna nieograniczona rozbudowa bufora",
          "Err(TrySendError::Disconnected(())); Full nie przenosi danych z powrotem",
        ],
        [
          "try_send nie czeka: Full(T) zawiera dokładnie niesłaną wartość T.",
          "sync_channel ma jawną pojemność; try_send nie powiększa jej automatycznie.",
          "Disconnected(T) opisuje zniknięcie odbiorcy, a Full(T) chwilowe zapełnienie bufora.",
        ],
        backpressureRun,
      ),
      run(
        "backpressure-run",
        "Zobacz Full i Disconnected",
        "Uruchom kod. Jedno miejsce bufora daje Full dla `drugi`, a po odebraniu pierwszej wartości retained może zostać wysłany ponownie. Drugi kanał pokazuje Disconnected po drop Receivera.",
        backpressureRun,
        "pełny: drugi\nodebrane: pierwszy|drugi\nrozłączony: awaryjne\n",
      ),
      choose(
        "backpressure-explain",
        "explain",
        "Po co ograniczać bufor?",
        "Producent może tworzyć dane szybciej niż konsument. Która polityka najlepiej opisuje backpressure z `sync_channel`?",
        2,
        [
          "Zawsze zwiększaj bufor, bo ograniczenie jest tylko optyczne",
          "Ignoruj Full, bo wiadomość zostanie później odtworzona z pamięci kanału",
          "Ustal małą pojemność i jawnie obsłuż pełny bufor: poczekaj, ponów albo zachowaj wartość",
        ],
        [
          "Automatyczne zwiększanie usuwa ograniczenie i może ukryć problem tempa producenta.",
          "Full(T) oddaje wartość kodowi; zignorowanie błędu może ją zniszczyć przez drop.",
          "Backpressure jest decyzją o tym, co zrobić z nadmiarem pracy, gdy odbiorca nie nadąża.",
        ],
      ),
      choose(
        "backpressure-recall",
        "recall",
        "Wybierz nieblokujący wariant",
        "Chcesz sprawdzić pojemność bez blokowania wątku i odzyskać własność elementu w razie odmowy. Które API pasuje?",
        1,
        [
          "`SyncSender::send(value)` bez obsługi wyniku, bo nigdy nie czeka",
          "`SyncSender::try_send(value)` i dopasowanie `TrySendError<T>`",
          "`Receiver::recv()` na nadawcy, bo odbiorca decyduje o pojemności",
        ],
        [
          "send może blokować po zapełnieniu ograniczonego bufora, więc nie daje takiej gwarancji.",
          "try_send wraca natychmiast, a Full(T) i Disconnected(T) zachowują własność T.",
          "recv jest metodą Receiver i pobiera dane; nie jest próbą wysłania.",
        ],
      ),
      coding({
        id: "backpressure-modify",
        kind: "modify",
        title: "Zwróć dokładny błąd try_send",
        prompt:
          "Uzupełnij `try_enqueue(sender: &SyncSender<String>, value: String) -> Result<(), TrySendError<String>>`. Podejmij jedną nieblokującą próbę przesłania do dostarczonego kanału. Sukces ma dostarczyć oryginalny tekst, a odmowa zachować dokładny wariant błędu oraz niesłaną własność. Nie twórz własnego kanału; testy obejmują wolny bufor, pełny bufor i zniknięcie odbiorcy.",
        code: `use std::sync::mpsc::{SyncSender, TrySendError};

fn try_enqueue(sender: &SyncSender<String>, value: String) -> Result<(), TrySendError<String>> {
    Err(TrySendError::Full(value))
}`,
        solution: backpressureModifySolution,
        tests: backpressureModifyTests,
        gate: true,
        hints: [
          "Obszar problemu: zachowaj typ błędu generyczny względem String zamiast zamieniać Full i Disconnected na jeden tekst.",
          "Reguła: `SyncSender::try_send` zwraca `Result<(), TrySendError<T>>` i przenosi T do właściwego wariantu odmowy.",
        ],
      }),
      coding({
        id: "backpressure-blank",
        kind: "blank",
        title: "Od pustej strony: wyślij część partii",
        prompt:
          "Zaprojektuj nieblokujące wysyłanie partii. Zdefiniuj enum `BatchDelivery`: wariant bez danych `Complete` oraz warianty `Full` i `Disconnected`, każdy z jednym Vec<String>. Funkcja `send_batch` przyjmuje kolejno `&std::sync::mpsc::SyncSender<String>` i własny Vec<String>, zwraca BatchDelivery. Przesyłaj w kolejności wejścia do dostarczonego kanału. Po pierwszej odmowie zakończ próbę; wynik ma zachować powód oraz wszystkie niesłane teksty, od odrzuconego po ostatni, w tej samej kolejności. Complete oznacza wysłanie całej partii; pusta partia także jest Complete. Zachowaj wiadomości już obecne w buforze. Nie blokuj i nie odbieraj z kanału — odbiorcą zarządza wywołujący.",
        solution: backpressureBlankSolution,
        tests: backpressureBlankTests,
        gate: true,
        hints: [
          "Rozdziel część już wysłaną od reszty partii; odmowa nadal niesie odrzucony element.",
          "Po pierwszym błędzie pozostałe elementy nie były jeszcze wysłane. Wynik musi zachować je razem z elementem zwróconym w błędzie.",
        ],
      }),
    ],
    misconceptions: [
      "sync_channel zawsze buforuje bez ograniczenia jak channel.",
      "Full i Disconnected nie zawierają wartości, więc można bezpiecznie zignorować błąd.",
      "Kolejność obsługi backpressure można dowodzić przez sleep i czas wykonania.",
    ],
    transferTask:
      "Zaprojektuj małą kolejkę producenta z pojemnością 1..=3: opisz zachowanie przy Full, politykę ponowienia oraz osobną reakcję na Disconnected.",
    evidenceGate:
      "Zadania backpressure-modify i backpressure-blank sprawdzają oba warianty TrySendError, zachowanie niesłanej własności i częściowe wysłanie, ponowienie i resztę partii w oryginalnej kolejności.",
    sourceIds: [
      "channels-std-sync-channel",
      "channels-std-try-send-error",
      "channels-std-receiver",
    ],
  },
];

const reviewOwnershipSolution = `use std::sync::mpsc::Sender;

fn send_review(sender: Sender<String>, value: String) -> Result<(), String> {
    sender.send(value).map_err(|error| error.0)
}`;

const reviewOwnershipTests = `#[test]
fn review_sends_to_an_external_receiver() {
    let (sender, receiver) = std::sync::mpsc::channel();
    assert_eq!(send_review(sender, String::from("Łódź")), Ok(()));
    assert_eq!(receiver.recv().unwrap(), "Łódź");
}

#[test]
fn review_returns_value_after_external_drop() {
    let (sender, receiver) = std::sync::mpsc::channel();
    drop(receiver);
    assert_eq!(send_review(sender, String::from("kanał")), Err(String::from("kanał")));
}`;

const reviewLifecycleSolution = `use std::sync::mpsc::Receiver;

fn drain_review(receiver: Receiver<i32>) -> Vec<i32> {
    receiver.into_iter().collect()
}`;

const reviewLifecycleTests = `#[test]
fn review_drains_external_values_before_end() {
    let (sender, receiver) = std::sync::mpsc::channel();
    sender.send(2).unwrap();
    sender.send(4).unwrap();
    sender.send(6).unwrap();
    drop(sender);
    assert_eq!(drain_review(receiver), vec![2, 4, 6]);
}

#[test]
fn review_closes_an_external_empty_channel() {
    let (sender, receiver) = std::sync::mpsc::channel();
    drop(sender);
    assert!(drain_review(receiver).is_empty());
}`;

const reviewBackpressureSolution = `use std::sync::mpsc::{sync_channel, TrySendError};

fn offer(sender: &std::sync::mpsc::SyncSender<String>, value: String) -> Result<(), String> {
    match sender.try_send(value) {
        Ok(()) => Ok(()),
        Err(TrySendError::Full(value)) => Err(format!("pełny:{value}")),
        Err(TrySendError::Disconnected(value)) => Err(format!("rozłączony:{value}")),
    }
}`;

const reviewBackpressureTests = `#[test]
fn review_sends_when_capacity_is_available() {
    let (sender, receiver) = sync_channel(1);
    assert_eq!(offer(&sender, String::from("wolne")), Ok(()));
    assert_eq!(receiver.recv().unwrap(), "wolne");
}

#[test]
fn review_reports_full_and_keeps_value_in_message() {
    let (sender, receiver) = sync_channel(1);
    sender.send(String::from("zajęte")).unwrap();
    assert_eq!(offer(&sender, String::from("drugie")), Err(String::from("pełny:drugie")));
    assert_eq!(receiver.recv().unwrap(), "zajęte");
}

#[test]
fn review_reports_disconnected_with_value() {
    let (sender, receiver) = sync_channel(1);
    drop(receiver);
    assert_eq!(offer(&sender, String::from("wraca")), Err(String::from("rozłączony:wraca")));
}`;

export const channelsReviewExercises: Record<string, LessonStep> = {
  "channel-ownership": coding({
    id: "review-channel-ownership",
    kind: "apply",
    title: "Powtórka: własny round trip",
    prompt:
      "Uzupełnij `send_review`, która przyjmuje `Sender<String>` i `String`, a zwraca `Result<(), String>`. Wyślij do zewnętrznego Receivera i zachowaj String w błędzie po jego drop; testy obejmują sukces oraz rozłączenie.",
    code: `use std::sync::mpsc::Sender;

fn send_review(_sender: Sender<String>, value: String) -> Result<(), String> {
    Err(value)
}`,
    solution: reviewOwnershipSolution,
    tests: reviewOwnershipTests,
    hints: [
      "Obszar problemu: zewnętrzny Receiver ma faktycznie dostać String albo zwrócić go przy rozłączeniu.",
      "Reguła: send zwraca Ok(()) po dostarczeniu, a SendError<String> udostępnia odzyskane error.0.",
    ],
  }),
  "channel-lifecycle": coding({
    id: "review-channel-lifecycle",
    kind: "apply",
    title: "Powtórka: zamknij producenta",
    prompt:
      "Uzupełnij `drain_review`, która przyjmuje zewnętrzny `Receiver<i32>` i zwraca `Vec<i32>`. Test wypełni kanał, dropnie ostatni Sender i sprawdzi kolejność oraz pusty kanał.",
    code: `use std::sync::mpsc::Receiver;

fn drain_review(_receiver: Receiver<i32>) -> Vec<i32> {
    Vec::new()
}`,
    solution: reviewLifecycleSolution,
    tests: reviewLifecycleTests,
    hints: [
      "Obszar problemu: iterator musi zobaczyć zarówno wszystkie wysłane i32, jak i sygnał końca.",
      "Iterator odbiornika kończy się po opróżnieniu bufora i zniknięciu ostatniego nadawcy. Tutaj zamknięcie zapewnia wywołujący.",
    ],
  }),
  "channel-backpressure": coding({
    id: "review-channel-backpressure",
    kind: "apply",
    title: "Powtórka: opisz odmowę",
    prompt:
      "Uzupełnij `offer`: wykonaj jedną nieblokującą próbę wysłania. Po sukcesie zwróć Ok(()). Błędy zamień na dokładny tekst: `pełny:` lub `rozłączony:` bez spacji, a następnie oryginalną niesłaną wartość. Testy sprawdzą wolny bufor, pełny bufor i zniknięcie odbiorcy.",
    code: `use std::sync::mpsc::{sync_channel, TrySendError};

fn offer(sender: &std::sync::mpsc::SyncSender<String>, value: String) -> Result<(), String> {
    Err(String::from("brak implementacji"))
}`,
    solution: reviewBackpressureSolution,
    tests: reviewBackpressureTests,
    hints: [
      "Obszar problemu: oba warianty błędu mają własny String, który trzeba przenieść do format!.",
      "Reguła: dopasuj `TrySendError::Full(value)` i `Disconnected(value)` osobno, zachowując value w komunikacie.",
    ],
  }),
};

export const channelsModule: CourseModule = {
  id: "channels",
  title: "Kanały: własność, koniec i backpressure",
  whyItMatters:
    "Kanał daje wątkom prosty kontrakt przekazywania własnych wartości. Jasny cykl życia zapobiega czekaniu na wiecznie żywego nadawcę, a ograniczony bufor pozwala świadomie reagować, gdy producent wyprzedza konsumenta.",
  capabilities: [
    "Przekazujesz String przez mpsc i tworzysz wielu producentów przez Sender::clone.",
    "Opróżniasz bufor po wysłaniu i zamykasz kanał przez drop wszystkich Senderów.",
    "Dobierasz sync_channel i obsługujesz Full(T) oraz Disconnected(T) bez utraty własności.",
  ],
  prerequisites: ["threads"],
  lessonIds: channelsLessons.map((lesson) => lesson.id),
  exitGate: [
    "send przekazuje własność T, jeden Receiver odbiera przez Result, a clone dotyczy Sendera i nie gwarantuje globalnej kolejności producentów.",
    "Iteracja odbiornika kończy się po drop wszystkich Senderów, lecz wcześniej opróżnia wszystkie wartości z bufora; gdy producentów użyto w wątkach, wszystkie join kończą się także po ścieżce błędu.",
    "sync_channel ma jawną pojemność, try_send rozróżnia Full i Disconnected, a niesłana wartość pozostaje dostępna do ponowienia lub polityki odrzucenia.",
  ],
  projectConnection:
    "W rozszerzeniu istniejącego analizatora logów kanały pozwolą przesyłać gotowe rekordy z kilku skanerów do jednego agregatora. Ten moduł ustala własność, koniec strumienia i ograniczenie kolejki przed dodaniem Arc<Mutex<T>>.",
  assessmentId: "channel-backpressure/backpressure-blank",
  gateCriteria: [
    {
      id: "channels-ownership-gate",
      label:
        "mpsc przekazuje własność, obsługuje pojedynczego odbiorcę i zachowuje kolejność w obrębie producenta.",
      taskRefs: [
        { lessonId: "channel-ownership", stepId: "ownership-modify" },
        { lessonId: "channel-ownership", stepId: "ownership-blank" },
      ],
    },
    {
      id: "channels-lifecycle-gate",
      label:
        "Wszyscy nadawcy znikają przed zakończeniem iteracji odbiornika, bufor zostaje opróżniony, a SendError zwraca niesłaną wartość.",
      taskRefs: [
        { lessonId: "channel-lifecycle", stepId: "lifecycle-modify" },
        { lessonId: "channel-lifecycle", stepId: "lifecycle-blank" },
      ],
    },
    {
      id: "channels-backpressure-gate",
      label:
        "sync_channel ogranicza bufor, a Full(T) i Disconnected(T) są obsłużone bez utraty T.",
      taskRefs: [
        { lessonId: "channel-backpressure", stepId: "backpressure-modify" },
        { lessonId: "channel-backpressure", stepId: "backpressure-blank" },
      ],
    },
  ],
};
