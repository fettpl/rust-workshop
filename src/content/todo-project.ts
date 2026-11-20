import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  ProjectContract,
  Source,
} from "@/domain/types";

import { importTodoCommand, editTodoBoard, replayTodoSession } from "./todo-transfer";

const reviewedAt = "2026-09-12";

const parserContract =
  "Najpierw trim usuwa białe znaki na brzegach całej linii; pusta linia daje Empty. Pierwsza zwykła spacja rozdziela czasownik i argument. Czasowniki są małymi literami: add, done, list; pozostałe dają Unknown. Tabulator między czasownikiem i argumentem nie jest separatorem. add obcina brzegi argumentu, zachowuje jego wnętrze i zwraca Add z własnym String; pusty tytuł lub LF/CR w środku daje InvalidTitle. done przyjmuje wyłącznie dodatnią liczbę z cyfr ASCII mieszczącą się w usize, z opcjonalnymi zerami wiodącymi; pozostałe argumenty dają InvalidId. list przyjmuje wyłącznie pusty argument, inaczej daje Unknown. Wspólny CommandError ma też NotFound, ale ten błąd zwraca dopiero Todo.";

const stateContract =
  "Todo::new tworzy pustą listę. apply przyjmuje Command i zwraca Result<String, CommandError>. Add odrzuca tytuł pusty po trim oraz każdy LF/CR, także przy wywołaniu bez parsera; zwraca wtedy InvalidTitle bez zmiany stanu. Poprawny tytuł zapisuje dokładnie, bez obcinania, jako niewykonane zadanie i zwraca added N. Numery zaczynają się od 1 i odpowiadają kolejności dodania; duplikaty są dozwolone. Done(0) daje InvalidId, dodatni numer poza listą daje NotFound; oba błędy zachowują stan. Poprawne Done, także powtórzone, oznacza zadanie jako wykonane i zwraca done N. List zwraca pusty String albo kolejne wiersze N [ ] title\\n lub N [x] title\\n. Każdy wiersz kończy się znakiem nowej linii.";

const sessionContract =
  "Każde wywołanie zaczyna od nowego, pustego Todo. run_session daje dokładnie jeden Result dla każdej linii w tej samej kolejności, zachowuje rodzaj błędu i kontynuuje bez cofania poprzednich operacji. Puste wejście daje pusty Vec. run_strict_session zwraca pierwszy błąd parsera lub stanu, a przy braku błędów — wynik ostatniej operacji; puste wejście daje Ok z pustym String. Poprzednie operacje nie są cofane, lecz lokalny Todo znika po zakończeniu wywołania.";

export const todoSources: Source[] = [
  {
    id: "todo-rust-book-strings",
    title: "The Rust Programming Language: Strings",
    url: "https://doc.rust-lang.org/book/ch08-02-strings.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie kontraktu String i tekstu wejściowego.",
  },
  {
    id: "todo-rust-book-result",
    title: "The Rust Programming Language: Recoverable Errors with Result",
    url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj po zmianie przykładów Result i propagacji błędów.",
  },
  {
    id: "todo-std-string",
    title: "Rust standard library: String",
    url: "https://doc.rust-lang.org/std/string/struct.String.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie wspieranego API String.",
  },
  {
    id: "todo-std-vec",
    title: "Rust standard library: Vec",
    url: "https://doc.rust-lang.org/std/vec/struct.Vec.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie wspieranego API Vec.",
  },
];

export const todoCompetencies: Competency[] = [
  {
    id: "command-parsing",
    title: "Parsujesz tekstowe polecenie do jawnego wyniku albo błędu domeny.",
  },
  {
    id: "todo-invariants",
    title:
      "Utrzymujesz niezmienniki stanu zadań przy każdej poprawnej i błędnej operacji.",
  },
  {
    id: "session-orchestration",
    title:
      "Budujesz sesję, która jasno określa kontynuację po błędzie i świeżość stanu.",
  },
];

export const todoConcepts: Concept[] = [
  {
    id: "command-contracts",
    title: "Kontrakt parsera jako Result<Command, CommandError>",
    prerequisites: ["panic-boundaries"],
    competencyIds: ["command-parsing"],
    reviewPrompt:
      "Dlaczego parser Todo zwraca Result zamiast używać unwrap dla wejścia użytkownika?",
    reviewAnswer:
      "Result opisuje poprawne polecenie albo przewidywalny błąd i zostawia wywołującemu decyzję.",
    distinguish:
      "CommandError jest wspólnym enumem parsera i Todo: parser zwraca Empty, Unknown, InvalidTitle lub InvalidId, a NotFound powstaje dopiero przy operacji na stanie.",
  },
  {
    id: "todo-state-invariants",
    title: "Identyfikator zadania i niezmienniki Vec<Task>",
    prerequisites: ["command-contracts"],
    competencyIds: ["todo-invariants"],
    reviewPrompt: "Jakie dwa skutki ma wykonanie Done(1) w pustym Todo?",
    reviewAnswer:
      "Zwraca NotFound i nie zmienia wektora zadań; zero jest osobno niepoprawnym identyfikatorem.",
    distinguish:
      "Id użytkownika zaczyna się od 1, ale indeks Vec zaczyna się od 0; błąd nie może dopisać ani usunąć zadania.",
  },
  {
    id: "session-boundaries",
    title: "Tolerancyjna i ścisła granica sesji",
    prerequisites: ["todo-state-invariants"],
    competencyIds: ["session-orchestration"],
    reviewPrompt:
      "Czym różnią się run_session i run_strict_session po błędzie?",
    reviewAnswer:
      "run_session zwraca wynik dla każdej linii i idzie dalej, a run_strict_session zatrzymuje się na pierwszym błędzie.",
    distinguish:
      "Ścisłość określa przepływ wyników; żadna z funkcji nie cofa poprawnych zmian wykonanych przed błędem.",
  },
];

const parserSolution = `#[derive(Debug, PartialEq, Eq)]
enum Command {
    Add(String),
    Done(usize),
    List,
}

#[derive(Debug, PartialEq, Eq)]
enum CommandError {
    Empty,
    Unknown,
    InvalidTitle,
    InvalidId,
    NotFound,
}

fn parse_command(line: &str) -> Result<Command, CommandError> {
    let line = line.trim();
    if line.is_empty() {
        return Err(CommandError::Empty);
    }
    let (verb, argument) = match line.split_once(' ') {
        Some(parts) => parts,
        None => (line, ""),
    };
    match verb {
        "add" => {
            let title = argument.trim();
            if title.is_empty() || title.contains('\\n') || title.contains('\\r') {
                Err(CommandError::InvalidTitle)
            } else {
                Ok(Command::Add(String::from(title)))
            }
        }
        "done" => {
            let id = argument.trim();
            if id.is_empty() || id.starts_with('+') {
                return Err(CommandError::InvalidId);
            }
            for character in id.chars() {
                if !character.is_ascii_digit() {
                    return Err(CommandError::InvalidId);
                }
            }
            match id.parse::<usize>() {
                Ok(value) if value > 0 => Ok(Command::Done(value)),
                _ => Err(CommandError::InvalidId),
            }
        }
        "list" => {
            if argument.trim().is_empty() { Ok(Command::List) } else { Err(CommandError::Unknown) }
        }
        _ => Err(CommandError::Unknown),
    }
}`;

const parserStarter = `#[derive(Debug, PartialEq, Eq)]
enum Command { Add(String), Done(usize), List }
#[derive(Debug, PartialEq, Eq)]
enum CommandError { Empty, Unknown, InvalidTitle, InvalidId, NotFound }
fn parse_command(line: &str) -> Result<Command, CommandError> {
    if line.trim() == "list" { Ok(Command::List) } else { Err(CommandError::Unknown) }
}`;

const parserGateTests = `#[test]
fn parses_real_boundary_cases() {
    assert_eq!(parse_command("  add  Zażółć   plan  "), Ok(Command::Add(String::from("Zażółć   plan"))));
    assert_eq!(parse_command("done 0007"), Ok(Command::Done(7)));
    assert_eq!(parse_command("list"), Ok(Command::List));
    assert_eq!(parse_command("list now"), Err(CommandError::Unknown));
    assert_eq!(parse_command("add"), Err(CommandError::InvalidTitle));
    assert_eq!(parse_command("add t\\nnext"), Err(CommandError::InvalidTitle));
    assert_eq!(parse_command("add\ttitle"), Err(CommandError::Unknown));
    for input in ["done 0", "done +1", "done -1", "done abc", "done 18446744073709551616"] {
        assert_eq!(parse_command(input), Err(CommandError::InvalidId));
    }
    assert_eq!(parse_command("   "), Err(CommandError::Empty));
    assert_eq!(parse_command("ADD title"), Err(CommandError::Unknown));
    assert_eq!(parse_command(&format!("done {}", usize::MAX)), Ok(Command::Done(usize::MAX)));
    assert_eq!(parse_command("done ١"), Err(CommandError::InvalidId));
    assert_eq!(parse_command("add a\\rb"), Err(CommandError::InvalidTitle));
    assert_eq!(parse_command("done"), Err(CommandError::InvalidId));
}
`;

const parserErrorTests = `#[test]
fn parses_another_complete_set_of_boundaries() {
    assert_eq!(parse_command("\t"), Err(CommandError::Empty));
    assert_eq!(parse_command(" add  tytuł  "), Ok(Command::Add(String::from("tytuł"))));
    assert_eq!(parse_command("done 00000000000000000001"), Ok(Command::Done(1)));
    assert_eq!(parse_command("list "), Ok(Command::List));
    assert_eq!(parse_command("list now"), Err(CommandError::Unknown));
    assert_eq!(parse_command("add title\\rnext"), Err(CommandError::InvalidTitle));
    for input in ["done 00", "done 1x", "done ++1", "done 999999999999999999999999999999"] {
        assert_eq!(parse_command(input), Err(CommandError::InvalidId));
    }
    assert_eq!(parse_command("ADD title"), Err(CommandError::Unknown));
    assert_eq!(parse_command("add "), Err(CommandError::InvalidTitle));
    assert_eq!(parse_command("add a\\nb"), Err(CommandError::InvalidTitle));
    assert_eq!(parse_command("add\tplan"), Err(CommandError::Unknown));
    assert_eq!(parse_command("done １"), Err(CommandError::InvalidId));
    assert_eq!(parse_command(&format!("done {}", usize::MAX)), Ok(Command::Done(usize::MAX)));
}
`;

const statePrelude = `#[derive(Debug, PartialEq, Eq)]
enum Command { Add(String), Done(usize), List }
#[derive(Debug, PartialEq, Eq)]
enum CommandError { Empty, Unknown, InvalidTitle, InvalidId, NotFound }
#[derive(Debug, PartialEq, Eq)]
struct Task { title: String, done: bool }
`;

const stateSolution = `${statePrelude}
struct Todo { tasks: Vec<Task> }

impl Todo {
    fn new() -> Todo { Todo { tasks: Vec::new() } }

    fn apply(&mut self, command: Command) -> Result<String, CommandError> {
        match command {
            Command::Add(title) => {
                if title.trim().is_empty() || title.contains('\\n') || title.contains('\\r') {
                    return Err(CommandError::InvalidTitle);
                }
                self.tasks.push(Task { title: title, done: false });
                Ok(format!("added {}", self.tasks.len()))
            }
            Command::Done(id) => {
                if id == 0 { return Err(CommandError::InvalidId); }
                let index = id - 1;
                if index >= self.tasks.len() { return Err(CommandError::NotFound); }
                self.tasks[index].done = true;
                Ok(format!("done {}", id))
            }
            Command::List => {
                let mut output = String::new();
                let mut index = 0;
                while index < self.tasks.len() {
                    let task = &self.tasks[index];
                    let mark = if task.done { "x" } else { " " };
                    output.push_str(&format!("{} [{}] {}\\n", index + 1, mark, task.title));
                    index += 1;
                }
                Ok(output)
            }
        }
    }
}`;

const stateTypes = `#[derive(Debug, PartialEq, Eq)]
struct Task { title: String, done: bool }
`;
const stateImplementation =
  stateTypes + stateSolution.slice(statePrelude.length);

const stateStarter = `${statePrelude}
struct Todo { tasks: Vec<Task> }
impl Todo {
    fn new() -> Todo { Todo { tasks: Vec::new() } }
    fn apply(&mut self, command: Command) -> Result<String, CommandError> {
        match command {
            Command::Add(title) => { self.tasks.push(Task { title: title, done: false }); Ok(String::from("added")) }
            Command::Done(_) => Ok(String::from("done")),
            Command::List => Ok(String::new()),
        }
    }
}`;

const stateTests = `#[test]
fn preserves_state_and_rejects_bad_direct_commands() {
    let mut todo = Todo::new();
    assert_eq!(todo.apply(Command::Add(String::from("żółć  🙂"))), Ok(String::from("added 1")));
    assert_eq!(todo.apply(Command::Add(String::from("   "))), Err(CommandError::InvalidTitle));
    assert_eq!(todo.apply(Command::Done(0)), Err(CommandError::InvalidId));
    assert_eq!(todo.apply(Command::Done(30)), Err(CommandError::NotFound));
    assert_eq!(todo.apply(Command::Done(usize::MAX)), Err(CommandError::NotFound));
    assert_eq!(todo.apply(Command::Add(String::from("a\\nb"))), Err(CommandError::InvalidTitle));
    assert_eq!(todo.apply(Command::Add(String::from("a\\rb"))), Err(CommandError::InvalidTitle));
    assert_eq!(todo.apply(Command::Done(1)), Ok(String::from("done 1")));
    assert_eq!(todo.apply(Command::Done(1)), Ok(String::from("done 1")));
    assert_eq!(todo.apply(Command::List), Ok(String::from("1 [x] żółć  🙂\\n")));
    assert_eq!(todo.apply(Command::Add(String::from("  exact  "))), Ok(String::from("added 2")));
    assert_eq!(todo.apply(Command::List), Ok(String::from("1 [x] żółć  🙂\\n2 [ ]   exact  \\n")));
}
`;

const stateDebugTests = `#[test]
fn direct_apply_rejects_newline_and_keeps_duplicate_order() {
    let mut todo = Todo::new();
    assert_eq!(todo.apply(Command::Add(String::from("a\\rb"))), Err(CommandError::InvalidTitle));
    assert_eq!(todo.apply(Command::Add(String::from("plan"))), Ok(String::from("added 1")));
    assert_eq!(todo.apply(Command::Add(String::from("plan"))), Ok(String::from("added 2")));
    assert_eq!(todo.apply(Command::Done(2)), Ok(String::from("done 2")));
    assert_eq!(todo.apply(Command::Done(3)), Err(CommandError::NotFound));
    assert_eq!(todo.apply(Command::List), Ok(String::from("1 [ ] plan\\n2 [x] plan\\n")));
}
`;

const stateListTests = `#[test]
fn lists_empty_order_duplicates_and_unicode_exactly() {
    let mut todo = Todo::new();
    assert_eq!(todo.apply(Command::List), Ok(String::new()));
    todo.apply(Command::Add(String::from("same"))).unwrap();
    todo.apply(Command::Add(String::from("same"))).unwrap();
    todo.apply(Command::Add(String::from("zażółć"))).unwrap();
    todo.apply(Command::Done(2)).unwrap();
    assert_eq!(todo.apply(Command::List), Ok(String::from("1 [ ] same\\n2 [x] same\\n3 [ ] zażółć\\n")));
}
`;

const sessionComponents = [
  ...["parser-debug", "parser-add-gate"].map((stepId) => ({ lessonId: "todo-command-parser", stepId })),
  ...["state-debug", "state-add-done-gate", "state-list-gate"].map((stepId) => ({ lessonId: "todo-state-invariants", stepId })),
];

const fullSessionSolution = `${parserSolution}

${stateImplementation}

fn run_session(lines: &[&str]) -> Vec<Result<String, CommandError>> {
    let mut todo = Todo::new();
    let mut results = Vec::new();
    for line in lines {
        let result = match parse_command(line) {
            Ok(command) => todo.apply(command),
            Err(error) => Err(error),
        };
        results.push(result);
    }
    results
}

fn run_strict_session(lines: &[&str]) -> Result<String, CommandError> {
    let mut todo = Todo::new();
    let mut last = String::new();
    for line in lines {
        let command = parse_command(line)?;
        last = todo.apply(command)?;
    }
    Ok(last)
}`;

const sessionStarter = `${parserSolution}

${stateImplementation}

fn run_session(lines: &[&str]) -> Vec<Result<String, CommandError>> {
    let mut results = Vec::new();
    let mut index = 0;
    while index < lines.len() {
        results.push(Ok(String::new()));
        index += 1;
    }
    results
}

fn run_strict_session(_lines: &[&str]) -> Result<String, CommandError> {
    Ok(String::new())
}`;

const sessionTests = `#[test]
fn tolerant_session_continues_and_preserves_previous_state() {
    let results = run_session(&["add pierwsze", "done 0", "add żółć🙂", "done 2", "list"]);
    assert_eq!(results.len(), 5);
    assert_eq!(results[0], Ok(String::from("added 1")));
    assert_eq!(results[1], Err(CommandError::InvalidId));
    assert_eq!(results[2], Ok(String::from("added 2")));
    assert_eq!(results[3], Ok(String::from("done 2")));
    assert_eq!(results[4], Ok(String::from("1 [ ] pierwsze\\n2 [x] żółć🙂\\n")));
}

#[test]
fn tolerant_sessions_are_fresh_and_do_not_mutate_after_errors() {
    assert!(run_session(&[]).is_empty());
    assert_eq!(run_session(&["", "unknown", "add ", "done 1", "list"]), vec![Err(CommandError::Empty), Err(CommandError::Unknown), Err(CommandError::InvalidTitle), Err(CommandError::NotFound), Ok(String::new())]);
    assert_eq!(run_session(&["add one", "done 30", "list"])[2], Ok(String::from("1 [ ] one\\n")));
    assert_eq!(run_session(&["list"]), vec![Ok(String::new())]);
    assert_eq!(run_session(&["add   exact  title", "list"])[1], Ok(String::from("1 [ ] exact  title\\n")));
}
`;

const sessionDebugTests = `#[test]
fn session_keeps_state_after_parser_and_state_errors() {
    let results = run_session(&["add one", "unknown", "add two", "done 0002", "list"]);
    assert_eq!(results[1], Err(CommandError::Unknown));
    assert_eq!(results[3], Ok(String::from("done 2")));
    assert_eq!(results[4], Ok(String::from("1 [ ] one\\n2 [x] two\\n")));
    assert_eq!(run_session(&["done 1", "list"])[1], Ok(String::new()));
}
`;

const strictTests = `#[test]
fn strict_session_returns_last_result_and_stops_first_error() {
    assert_eq!(run_strict_session(&["add a", "add b", "list"]), Ok(String::from("1 [ ] a\\n2 [ ] b\\n")));
    assert_eq!(run_strict_session(&["add a", "done 30", "add never"]), Err(CommandError::NotFound));
    assert_eq!(run_strict_session(&["add a", "done 30", "unknown"]), Err(CommandError::NotFound));
    assert_eq!(run_strict_session(&["add a", "unknown", "done 30"]), Err(CommandError::Unknown));
    assert_eq!(run_strict_session(&["", "add never"]), Err(CommandError::Empty));
    assert_eq!(run_strict_session(&["add a", "done 0", "add never"]), Err(CommandError::InvalidId));
    assert_eq!(run_strict_session(&[]), Ok(String::new()));
    assert_eq!(run_strict_session(&["add żółć", "done 0001", "list"]), Ok(String::from("1 [x] żółć\\n")));
}
`;

const projectTests = `${parserGateTests}\n${parserErrorTests}\n${stateTests}\n${stateListTests}\n${sessionTests}\n${strictTests}\n#[test]
fn project_handles_unicode_duplicate_titles_and_missing_ids() {
    let lines = ["add   plan  tygodnia", "add żółć🙂", "add   plan  tygodnia", "done 0002", "done 30", "list"];
    let results = run_session(&lines);
    assert_eq!(results.len(), lines.len());
    assert_eq!(results[0], Ok(String::from("added 1")));
    assert_eq!(results[1], Ok(String::from("added 2")));
    assert_eq!(results[2], Ok(String::from("added 3")));
    assert_eq!(results[3], Ok(String::from("done 2")));
    assert_eq!(results[4], Err(CommandError::NotFound));
    assert_eq!(results[5], Ok(String::from("1 [ ] plan  tygodnia\\n2 [x] żółć🙂\\n3 [ ] plan  tygodnia\\n")));
}

#[test]
fn project_strict_mode_is_fresh() {
    assert_eq!(run_strict_session(&["add first", "done 0", "list"]), Err(CommandError::InvalidId));
    assert_eq!(run_strict_session(&["list"]), Ok(String::new()));
}

#[test]
fn thirty_tasks_have_stable_ids_and_errors_preserve_state() {
    let mut todo = Todo::new();
    let mut expected = String::new();
    for id in 1..=30 {
        assert_eq!(todo.apply(Command::Add(format!("zadanie {}", id))), Ok(format!("added {}", id)));
        let mark = if id == 30 { "x" } else { " " };
        expected.push_str(&format!("{} [{}] zadanie {}\\n", id, mark, id));
    }
    assert_eq!(todo.apply(Command::Done(30)), Ok(String::from("done 30")));
    assert_eq!(todo.apply(Command::Done(31)), Err(CommandError::NotFound));
    assert_eq!(todo.apply(Command::Done(usize::MAX)), Err(CommandError::NotFound));
    assert_eq!(todo.apply(Command::List), Ok(expected));
}
`;

type Choice = { id: string; label: string };

function choiceStep(
  id: string,
  kind: LessonStep["kind"],
  title: string,
  prompt: string,
  choices: Choice[],
  correct: string,
  explanations: Record<string, string>,
  evidenceKind: LessonStep["evidenceKind"],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices,
    evaluator: { kind: "choice", correct, explanations },
    evidenceKind,
  };
}

function runStep(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
  evidenceKind: LessonStep["evidenceKind"],
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
    evidenceKind,
  };
}

function testStep(
  id: string,
  title: string,
  prompt: string,
  starter: string,
  solution: string,
  tests: string,
  evidenceKind: LessonStep["evidenceKind"],
  suppliedSolutions?: LessonStep["suppliedSolutions"],
): LessonStep {
  return {
    id,
    kind: "modify",
    title,
    prompt,
    code: starter,
    solution,
    ...(suppliedSolutions && { suppliedSolutions }),
    evaluator: {
      kind: "tests",
      tests,
      forbiddenPatterns: [".unwrap(", ".expect("],
    },
    expectedStatus: "success",
    evidenceKind,
    evidenceGate: true,
    hints: id.startsWith("parser")
      ? [
          "Porównaj miejsce podziału tekstu z regułą separatora i sprawdź osobno każdy czasownik.",
          "Waliduj argument przed zbudowaniem Command; parse zwraca Result także przy przekroczeniu zakresu usize.",
        ]
      : id.startsWith("state")
        ? [
            "Sprawdź, co zmienia się w Todo przed wykryciem błędnego argumentu.",
            "Zwaliduj tytuł lub numer przed mutacją. W List zachowaj kolejność i końcowe znaki nowej linii.",
          ]
        : [
            "Znajdź miejsce utworzenia Todo i miejsce, w którym przetwarzany jest błąd.",
            "Stan ma żyć przez całą sesję. match pozwala kontynuować po Err; ? propaguje Err z funkcji.",
          ],
  };
}

const parserExample = `fn split_request(line: &str) -> (&str, &str) {
    let clean = line.trim();
    match clean.split_once(' ') {
        Some((verb, argument)) => (verb, argument.trim()),
        None => (clean, ""),
    }
}

fn main() {
    for line in [" add  żółć  ", "done 0007", "list now"] {
        let (verb, argument) = split_request(line);
        println!("{verb} | {argument}");
    }
}`;

const stateExample = `struct Queue {
    titles: Vec<String>,
}

impl Queue {
    fn push(&mut self, title: String) -> Result<usize, &'static str> {
        if title.trim().is_empty() {
            return Err("pusty tytuł");
        }
        self.titles.push(title);
        Ok(self.titles.len())
    }
}

fn main() {
    let mut queue = Queue { titles: Vec::new() };
    println!("{:?}", queue.push(String::from("raport")));
    println!("{:?}", queue.push(String::from(" ")));
    println!("w kolejce: {}", queue.titles.len());
}`;

const sessionExample = `fn main() {
    let mut accepted = 0;
    let mut results = Vec::new();
    for line in ["7", "błąd", "12"] {
        let result = match line.parse::<u8>() {
            Ok(value) => { accepted += 1; Ok(value) }
            Err(_) => Err("liczba"),
        };
        results.push(result);
    }
    println!("{results:?}");
    println!("przyjęte: {accepted}");
}`;

export const todoLessons: Lesson[] = [
  {
    id: "todo-command-parser",
    moduleId: "todo-project",
    conceptIds: ["command-contracts"],
    competencyIds: ["command-parsing"],
    prerequisites: ["panic-and-contracts"],
    title: "Parser poleceń: tekst staje się kontraktem",
    subtitle:
      "Dostajesz Command::{Add(String), Done(usize), List}, CommandError::{Empty, Unknown, InvalidTitle, InvalidId, NotFound} oraz parse_command(&str) -> Result<Command, CommandError>; enumy mają Debug, PartialEq i Eq, a parse_command zmieniasz według reguły pierwszej zwykłej spacji.",
    minutes: 35,
    outcomes: [
      "Zbudujesz parse_command zwracający Command albo CommandError.",
      "Rozpoznasz ograniczenie pierwszej spacji ASCII i odrzucisz nieobsługiwane tabulatory.",
      "Przetestujesz Unicode, zera wiodące i zbyt duży identyfikator bez panic.",
    ],
    steps: [
      choiceStep(
        "parser-predict",
        "predict",
        "Przewidź granicę parsera",
        "Który wynik najlepiej opisuje `add\\ttytuł` i `done 0007` przy gramatyce z pierwszą spacją ASCII?",
        [
          { id: "a", label: "Unknown, potem Done(7)" },
          { id: "b", label: "InvalidTitle, potem Done(7)" },
          { id: "c", label: "Oba są poprawnym Add" },
        ],
        "a",
        {
          a: "Tabulator nie jest separatorem; zera wiodące są dozwolone dla dodatniego ASCII id.",
          b: "Pusty tytuł daje InvalidTitle, ale tabulator nie uruchamia ścieżki add.",
          c: "Parser rozpoznaje tylko słowo add po ASCII spacji.",
        },
        "prediction",
      ),
      runStep(
        "parser-run",
        "Uruchom kontrakt",
        "Uruchom podział linii na czasownik i argument. Porównaj pierwszą zwykłą spację z tabulatorem, zmieniając wejście. W następnym zadaniu zdecydujesz jeszcze, które polecenia są poprawne, kiedy zwrócić błąd i jak zbudować Command. " +
          parserContract,
        parserExample,
        "add | żółć\ndone | 0007\nlist | now\n",
        "exposure",
      ),
      choiceStep(
        "parser-explain",
        "explain",
        "Wyjaśnij rozdział odpowiedzialności",
        "Dlaczego `list now` i `add\\ttytuł` kończą się Unknown, a `add  tytuł` może zachować wewnętrzną spację?",
        [
          {
            id: "a",
            label: "Gramatyka obsługuje tylko pierwszy ASCII separator",
          },
          { id: "b", label: "Rust usuwa wszystkie spacje i tabulatory" },
          { id: "c", label: "Każdy tekst po czasowniku jest ignorowany" },
        ],
        "a",
        {
          a: "Pierwsza ASCII spacja rozdziela czasownik i argument; tab między nimi jest jawnie poza tą wersją gramatyki.",
          b: "trim usuwa brzegi, ale nie zmienia reguły separatora ani nie ignoruje argumentów list.",
          c: "Argument add jest znaczący, a list nie przyjmuje argumentu.",
        },
        "exposure",
      ),
      testStep(
        "parser-debug",
        "Napraw parser błędów",
        "Starter rozpoznaje tylko list. Napraw obsługę wejścia bez unwrap i expect. " +
          parserContract,
        parserStarter,
        parserSolution,
        parserErrorTests,
        "fix",
      ),
      testStep(
        "parser-add-gate",
        "Bramka parsera",
        "Zaimplementuj parser dla kolejnego zestawu danych granicznych, bez unwrap i expect. " +
          parserContract,
        parserStarter,
        parserSolution,
        parserGateTests,
        "transfer",
      ),
      choiceStep(
        "parser-transfer",
        "apply",
        "Przenieś granicę do domeny",
        "Który kontrakt pozwala późniejszemu Todo zdecydować, co zrobić z błędem parsera?",
        [
          { id: "a", label: "Result<Command, CommandError>" },
          { id: "b", label: "String z pustym tekstem przy błędzie" },
          { id: "c", label: "panic! dla każdego nieznanego słowa" },
        ],
        "a",
        {
          a: "Jawny Result pozwala sesji kontynuować albo zatrzymać się bez ukrytej mutacji.",
          b: "Pusty String gubi informację, czy wejście było puste, nieznane czy niepoprawne.",
          c: "Wejście użytkownika jest przewidywalnym błędem, więc nie wymaga panic.",
        },
        "transfer",
      ),
      choiceStep(
        "parser-recall",
        "recall",
        "Przypomnij mapę błędów",
        "Wybierz poprawne przypisanie: pusta linia, zły czasownik, pusty tytuł, złe id.",
        [
          { id: "a", label: "Empty, Unknown, InvalidTitle, InvalidId" },
          { id: "b", label: "Unknown, Empty, InvalidId, InvalidTitle" },
          { id: "c", label: "InvalidId, Unknown, Empty, InvalidTitle" },
        ],
        "a",
        {
          a: "Każdy wariant opisuje inną obserwowalną granicę parsera.",
          b: "Pusta linia ma własny wariant Empty, a tytuł i id mają różne walidacje.",
          c: "Kolejność odpowiada kontraktowi, nie tej odpowiedzi.",
        },
        "recall",
      ),
      importTodoCommand,
    ],
    misconceptions: [
      "Tabulator jest separatorem tylko dlatego, że wygląda jak odstęp.",
      "parse powinien panikować, gdy liczba nie mieści się w usize.",
      "trim argumentu usuwa również spacje, które są częścią tytułu.",
    ],
    transferTask:
      "Zaprojektuj dwa kolejne czasowniki, ale najpierw zapisz ich błędy jako warianty kontraktu.",
    evidenceGate:
      "Parser poprawnie rozróżnia sukces i każdą kategorię błędu na przypadkach Unicode, tab i granicy usize.",
    sessionStops: [
      {
        afterStepId: "parser-explain",
        title: "Zatrzymaj się po wyjaśnieniu parsera",
        nextGoal: "Przenieś reguły parsera do kolejnego zadania.",
      },
      {
        afterStepId: "parser-add-gate",
        title: "Zatrzymaj się po bramce Add",
        nextGoal: "Sprawdź transfer parsera na innych komendach.",
      },
    ],
    sourceIds: ["todo-rust-book-result", "todo-std-string"],
  },
  {
    id: "todo-state-invariants",
    moduleId: "todo-project",
    conceptIds: ["todo-state-invariants"],
    competencyIds: ["todo-invariants"],
    prerequisites: ["todo-command-parser"],
    title: "Stan Todo: niezmienniki przed wygodą",
    subtitle:
      "Dostajesz Task { title: String, done: bool }, Todo { tasks: Vec<Task> }, Todo::new() -> Todo i Todo::apply(&mut self, Command) -> Result<String, CommandError>; zmieniasz apply, walidując przed mutacją i mapując id 1-based na indeks Vec 0-based.",
    minutes: 40,
    outcomes: [
      "Zaimplementujesz Task z owned String i flagą done.",
      "Rozróżnisz InvalidId od NotFound i zachowasz stan po błędzie.",
      "Wygenerujesz stabilny, pusty albo wielowierszowy wynik List.",
    ],
    steps: [
      choiceStep(
        "state-predict",
        "predict",
        "Przewidź mutację",
        "Co powinno pozostać prawdą po `Done(30)` w Todo z jednym zadaniem?",
        [
          {
            id: "a",
            label: "NotFound, zadanie nadal istnieje i jest niewykonane",
          },
          { id: "b", label: "InvalidId i usunięcie zadania" },
          { id: "c", label: "Ok i dopisanie pustego zadania" },
        ],
        "a",
        {
          a: "Poza zakresem to NotFound; błąd nie może zmienić wektora.",
          b: "Zero jest InvalidId, lecz 30 jest dodatnie i poza zakresem.",
          c: "Udane Done nie tworzy zadania.",
        },
        "prediction",
      ),
      runStep(
        "state-run",
        "Uruchom operacje na stanie",
        "Obserwuj kolejkę: po udanym dodaniu zapisuje tytuł, a po odrzuceniu pustego tytułu zachowuje długość. Porównaj to z wymaganiami Todo, gdzie dochodzą identyfikatory, oznaczanie wykonania i format listy. " +
          stateContract,
        stateExample,
        'Ok(1)\nErr("pusty tytuł")\nw kolejce: 1\n',
        "exposure",
      ),
      choiceStep(
        "state-explain",
        "explain",
        "Połącz id z indeksem",
        "Dlaczego implementacja sprawdza `id == 0`, a dopiero potem oblicza `id - 1`?",
        [
          {
            id: "a",
            label: "Id użytkownika jest 1-based, Vec ma indeks 0-based",
          },
          { id: "b", label: "usize nie może przechowywać zera" },
          { id: "c", label: "Done zawsze wymaga dwóch zadań" },
        ],
        "a",
        {
          a: "Jawne sprawdzenie zera chroni niezmiennik i dopiero potem tłumaczy numer na indeks.",
          b: "usize może przechowywać zero; problemem jest znaczenie id, nie typ.",
          c: "Done(1) jest poprawne również dla jednego zadania.",
        },
        "exposure",
      ),
      testStep(
        "state-debug",
        "Napraw walidację mutacji",
        "Starter dopisuje nawet pusty tytuł i udaje sukces dla każdego Done. Przywróć walidację oraz ochronę stanu bez unwrap i expect. " +
          stateContract,
        stateStarter,
        stateSolution,
        stateDebugTests,
        "fix",
      ),
      testStep(
        "state-add-done-gate",
        "Bramka Add i Done",
        "Zaimplementuj bezpieczne Add i Done oraz listę pozwalającą sprawdzić skutki. Nie używaj unwrap ani expect. " +
          stateContract,
        stateStarter,
        stateSolution,
        stateTests,
        "transfer",
      ),
      testStep(
        "state-list-gate",
        "Bramka List",
        "Odtwórz dokładny format List dla pustej kolekcji, duplikatów i zadań wykonanych. Nie używaj unwrap ani expect. " +
          stateContract,
        stateStarter,
        stateSolution,
        stateListTests,
        "transfer",
      ),
      choiceStep(
        "state-transfer",
        "apply",
        "Przenieś niezmiennik",
        "Który warunek chroni stan po niepoprawnym Add?",
        [
          { id: "a", label: "Waliduj przed push i zwróć InvalidTitle" },
          { id: "b", label: "push, a potem usuń ostatni element" },
          { id: "c", label: "Zamień pusty tytuł na placeholder" },
        ],
        "a",
        {
          a: "Walidacja przed mutacją sprawia, że błąd nie ma częściowego skutku.",
          b: "Usuwanie po fakcie komplikuje kontrakt i może pomylić obserwowalny stan.",
          c: "Kontrakt wymaga odrzucenia tytułu, nie jego cichej zmiany.",
        },
        "transfer",
      ),
      choiceStep(
        "state-recall",
        "recall",
        "Przypomnij format List",
        "Wybierz format jednego niewykonanego zadania o id 2 i tytule `plan`.",
        [
          { id: "a", label: "2 [ ] plan\\n" },
          { id: "b", label: "2 [] plan" },
          { id: "c", label: "[ ] 2 plan\\n" },
        ],
        "a",
        {
          a: "Każdy wiersz ma id, spację w nawiasach, tytuł i newline.",
          b: "Nawiasy zawierają dokładnie spację albo x.",
          c: "Id jest pierwszym elementem wiersza.",
        },
        "recall",
      ),
      editTodoBoard,
    ],
    misconceptions: [
      "NotFound i InvalidId są tym samym, bo oba kończą się Err.",
      "Błąd Done może najpierw zmienić stan, a potem zwrócić Err.",
      "Duplikaty tytułów trzeba usuwać, aby lista była poprawna.",
    ],
    transferTask:
      "Dodaj do modelu drugi stan zadania dopiero po opisaniu, jak zachowuje się List dla pustego Vec.",
    evidenceGate:
      "Operacje Add, Done i List zachowują identyfikatory, kolejność, Unicode, duplikaty i brak mutacji po błędzie.",
    sessionStops: [
      {
        afterStepId: "state-explain",
        title: "Zatrzymaj się po wyjaśnieniu stanu",
        nextGoal: "Przejdź do bramki poprawnej operacji Add i Done.",
      },
      {
        afterStepId: "state-add-done-gate",
        title: "Zatrzymaj się po bramce Add i Done",
        nextGoal: "Sprawdź bramkę listowania i transfer.",
      },
    ],
    sourceIds: ["todo-rust-book-strings", "todo-std-vec"],
  },
  {
    id: "todo-session-project",
    moduleId: "todo-project",
    conceptIds: ["session-boundaries"],
    competencyIds: ["session-orchestration"],
    prerequisites: ["todo-state-invariants"],
    title: "Sesja projektu: tolerancyjna albo ścisła",
    subtitle:
      "Łączysz dostarczone parse_command, Todo::new i Todo::apply z run_session(&[&str]) -> Vec<Result<String, CommandError>> oraz run_strict_session(&[&str]) -> Result<String, CommandError>; zmieniasz decyzję: zwykła sesja idzie dalej po błędzie, ścisła zatrzymuje się, a każde wywołanie ma świeży Todo.",
    minutes: 45,
    outcomes: [
      "Zaimplementujesz run_session z wynikiem dla każdej linii.",
      "Zaimplementujesz run_strict_session zatrzymujące się na pierwszym błędzie bez rollbacku.",
      "Sprawdzisz świeżość stanu, Unicode, duplikaty i granice wysokich identyfikatorów.",
    ],
    steps: [
      choiceStep(
        "session-predict",
        "predict",
        "Przewidź sesję",
        "Po `add a`, `done 30`, `list` w trybie tolerancyjnym: czy trzecia linia nadal widzi zadanie?",
        [
          { id: "a", label: "Tak, wyniki to sukces, NotFound, lista a" },
          { id: "b", label: "Nie, błąd cofa również add" },
          { id: "c", label: "Nie, sesja kończy się na drugiej linii" },
        ],
        "a",
        {
          a: "run_session zwraca błąd dla tej linii, kontynuuje i nie robi rollbacku.",
          b: "Kontrakt nie wymaga rollbacku; poprawne wcześniejsze mutacje zostają.",
          c: "Zatrzymanie jest zachowaniem run_strict_session.",
        },
        "prediction",
      ),
      runStep(
        "session-run",
        "Uruchom tolerancyjną sesję",
        "W serii odczytów jedna błędna liczba trafia do wektora jako Err. Sprawdź, co dzieje się z następnym odczytem i licznikiem sukcesów. W sesji Todo samodzielnie połączysz parser z mutacją stanu oraz wybierzesz, kiedy przerwać przetwarzanie. " +
          sessionContract,
        sessionExample,
        '[Ok(7), Err("liczba"), Ok(12)]\nprzyjęte: 2\n',
        "exposure",
      ),
      choiceStep(
        "session-explain",
        "explain",
        "Rozdziel dwa tryby",
        "Który opis ścisłej sesji jest zgodny z kontraktem?",
        [
          {
            id: "a",
            label: "Zatrzymuje pierwszy Err i nie cofa wcześniejszych sukcesów",
          },
          { id: "b", label: "Ignoruje wszystkie Err i zwraca pusty String" },
          { id: "c", label: "Cofa stan, ale zwraca ostatni sukces" },
        ],
        "a",
        {
          a: "Ścisłość dotyczy przepływu sterowania; Todo nadal zachowuje wcześniejsze mutacje.",
          b: "Ignorowanie błędu łamałoby cel trybu strict.",
          c: "Rollback nie jest częścią kontraktu.",
        },
        "exposure",
      ),
      testStep(
        "session-debug",
        "Napraw składanie sesji",
        "Starter zawiera rozwiązania wcześniejszych ćwiczeń parsera i stanu. Po otwarciu kodu te ćwiczenia będą oznaczone jako odsłonięte. Funkcje sesji zwracają na razie puste sukcesy. Napraw run_session: przekaż każdą linię do parsera, a poprawne polecenie do Todo. Nie używaj unwrap ani expect. " +
          sessionContract,
        sessionStarter,
        fullSessionSolution,
        sessionDebugTests,
        "fix",
        { code: sessionComponents, solution: sessionComponents },
      ),
      testStep(
        "session-run-gate",
        "Bramka run_session",
        "Zaimplementuj run_session dla nowych danych, zachowując błędy i dokładne tytuły. Nie używaj unwrap ani expect. " +
          sessionContract,
        sessionStarter,
        fullSessionSolution,
        sessionTests,
        "transfer",
        { code: sessionComponents, solution: sessionComponents },
      ),
      testStep(
        "session-strict-gate",
        "Bramka run_strict_session",
        "Zmiana wymagań: dodaj run_strict_session. Klient wymaga teraz przerwania po pierwszym błędzie zamiast kontynuacji. Użyj propagacji błędów bez unwrap i expect. " +
          sessionContract,
        sessionStarter,
        fullSessionSolution,
        strictTests,
        "transfer",
        { code: sessionComponents, solution: sessionComponents },
      ),
      choiceStep(
        "session-recall",
        "recall",
        "Przypomnij świeżość",
        "Dlaczego każde wywołanie run_session tworzy nowy Todo?",
        [
          {
            id: "a",
            label: "Aby kolejne sesje nie dziedziczyły zadań poprzedniej",
          },
          { id: "b", label: "Aby parser nie mógł zwracać Err" },
          { id: "c", label: "Aby Vec zawsze miał jeden element" },
        ],
        "a",
        {
          a: "Stan sesji jest lokalny; niezależne wywołania zaczynają od pustego Todo.",
          b: "Parser nadal może zwracać każdy przewidziany błąd.",
          c: "Nowy Vec jest pusty, dopóki Add nie doda zadania.",
        },
        "recall",
      ),
      {
        id: "session-blank",
        kind: "blank",
        title: "Zbuduj Todo CLI w pamięci",
        prompt:
          "Zbuduj rdzeń Todo działający w pamięci, bez startera. Testy wywołują parse_command, Todo::new, Todo::apply, run_session i run_strict_session. Zachowaj nazwy enumów Command (Add z własnym String, Done z usize, List) i CommandError (Empty, Unknown, InvalidTitle, InvalidId, NotFound); oba muszą dać się porównywać i wypisywać przez Debug. Wewnętrzną reprezentację zadań dobierz samodzielnie.\n\nParser przyjmuje pożyczony tekst i zwraca Result z poleceniem lub błędem. " +
          parserContract +
          "\n\n" +
          stateContract +
          "\n\nObie funkcje sesji przyjmują wycinek pożyczonych linii tekstu. run_session zwraca wektor wyników operacji, a run_strict_session pojedynczy wynik. " +
          sessionContract +
          " Nie używaj unwrap ani expect do obsługi wejścia. Terminal i pliki dołączymy w kolejnym etapie.",
        suppliedSolutions: { solution: sessionComponents },
        solution: fullSessionSolution,
        evaluator: {
          kind: "tests",
          tests: projectTests,
          forbiddenPatterns: [".unwrap(", ".expect("],
        },
        expectedStatus: "success",
        evidenceKind: "assessment",
        evidenceGate: true,
      },
      replayTodoSession,
    ],
    misconceptions: [
      "Ścisła sesja musi cofnąć stan, bo zatrzymała się na błędzie.",
      "Wynik sesji może pomijać Err i zwracać tylko sukcesy.",
      "Nowa sesja może współdzielić Vec z poprzednią, jeśli parser jest czysty.",
    ],
    transferTask:
      "Zapisz pamięciową sesję Todo przed podłączeniem wejścia terminalowego lub pliku; decyzja o kontynuacji ma być widoczna w typie wyniku.",
    evidenceGate:
      "Pełna sesja przechodzi niezależne testy tolerancyjnego i ścisłego przebiegu, w tym błędy po mutacji i świeże wywołania.",
    sessionStops: [
      {
        afterStepId: "session-explain",
        title: "Zatrzymaj się po wyjaśnieniu sesji",
        nextGoal: "Uruchom bramkę sesji z błędem pośrodku.",
      },
      {
        afterStepId: "session-run-gate",
        title: "Zatrzymaj się po bramce sesji",
        nextGoal: "Porównaj sesję zwykłą ze ścisłą.",
      },
    ],
    sourceIds: ["todo-rust-book-result", "todo-std-string", "todo-std-vec"],
  },
];

export const todoReviewExercises: Record<string, LessonStep> = {
  "command-contracts": {
    id: "review-command-contracts",
    kind: "debug",
    title: "Powtórka: nowa granica parsera",
    prompt:
      "Napraw parse_priority: po trim przyjmuje dokładnie jedną cyfrę ASCII od 0 do 3 i zwraca Ok z tą liczbą jako u8. Każdy inny tekst, także 03, +1, pusty i cyfra spoza ASCII, daje Err z tekstem invalid. Nie używaj unwrap ani expect.",
    code: `fn parse_priority(text: &str) -> Result<u8, &'static str> {
    match text.trim().parse::<u8>() {
        Ok(value) => Ok(value),
        Err(_) => Err("invalid"),
    }
}`,
    solution: `fn parse_priority(text: &str) -> Result<u8, &'static str> {
    match text.trim() {
        "0" => Ok(0),
        "1" => Ok(1),
        "2" => Ok(2),
        "3" => Ok(3),
        _ => Err("invalid"),
    }
}`,
    evaluator: {
      kind: "tests",
      forbiddenPatterns: [".unwrap(", ".expect("],
      tests: `#[test]
fn new_input_contract() {
    for (text, value) in [("0", 0), (" 1 ", 1), ("2", 2), ("3", 3)] {
        assert_eq!(parse_priority(text), Ok(value));
    }
    for text in ["", "03", "+1", "4", "255", "١", "a"] {
        assert_eq!(parse_priority(text), Err("invalid"));
    }
}`,
    },
    expectedStatus: "success",
    evidenceKind: "fix",
  },
  "todo-state-invariants": {
    id: "review-todo-state",
    kind: "debug",
    title: "Powtórka: numer i bezpieczna zmiana",
    prompt:
      "Napraw finish: numery zadań zaczynają się od 1. Istniejący numer ustawia odpowiednią flagę na true i zwraca true, także przy powtórzeniu. Zero i numer poza listą zwracają false bez zmiany żadnej flagi. Zachowaj długość wektora.",
    code: `fn finish(flags: &mut Vec<bool>, id: usize) -> bool {
    if id >= flags.len() { return false; }
    flags[id] = true;
    true
}`,
    solution: `fn finish(flags: &mut Vec<bool>, id: usize) -> bool {
    if id == 0 || id > flags.len() { return false; }
    flags[id - 1] = true;
    true
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn translates_numbers_and_preserves_other_flags() {
    let mut flags = vec![false, false, false];
    assert_eq!(finish(&mut flags, 0), false);
    assert_eq!(finish(&mut flags, usize::MAX), false);
    assert_eq!(flags, vec![false, false, false]);
    assert_eq!(finish(&mut flags, 3), true);
    assert_eq!(finish(&mut flags, 3), true);
    assert_eq!(flags, vec![false, false, true]);
    assert_eq!(finish(&mut flags, 1), true);
    assert_eq!(flags, vec![true, false, true]);
    assert_eq!(finish(&mut Vec::new(), 1), false);
}`,
    },
    expectedStatus: "success",
    evidenceKind: "fix",
  },
  "session-boundaries": {
    id: "review-session-boundaries",
    kind: "modify",
    title: "Powtórka: błąd nie kończy przetwarzania",
    prompt:
      "Zmień accepted: zbierz wszystkie wartości Ok z pożyczonej listy wyników, w tej samej kolejności. Każdy Err pomiń i kontynuuj. Puste wejście daje pusty wektor; kolejne wywołania nie współdzielą wyników.",
    code: `fn accepted(input: &[Result<i32, &str>]) -> Vec<i32> {
    let mut values = Vec::new();
    for item in input {
        match item {
            Ok(value) => values.push(*value),
            Err(_) => return values,
        }
    }
    values
}`,
    solution: `fn accepted(input: &[Result<i32, &str>]) -> Vec<i32> {
    let mut values = Vec::new();
    for item in input {
        match item {
            Ok(value) => values.push(*value),
            Err(_) => {},
        }
    }
    values
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test]
fn keeps_successes_after_errors() {
    assert_eq!(accepted(&[Err("a"), Ok(4), Err("b"), Ok(-2), Ok(0)]), vec![4, -2, 0]);
    assert_eq!(accepted(&[Ok(7), Ok(7)]), vec![7, 7]);
    assert!(accepted(&[Err("only")]).is_empty());
    assert!(accepted(&[]).is_empty());
}`,
    },
    expectedStatus: "success",
    evidenceKind: "transfer",
  },
};

export const todoModule: CourseModule = {
  id: "todo-project",
  title: "Todo CLI: polecenia i sesje",
  whyItMatters:
    "Mały model domeny łączy parser, własność String, Vec<Task>, Result i decyzję o przepływie sesji.",
  capabilities: [
    "Parsujesz linię do jawnego Command albo CommandError.",
    "Utrzymujesz niezmienniki identyfikatorów, kolejności i braku mutacji po błędzie.",
    "Wybierasz tolerancyjny albo strict przebieg sesji bez ukrytego rollbacku.",
  ],
  prerequisites: ["error-handling"],
  lessonIds: todoLessons.map((lesson) => lesson.id),
  exitGate: [
    "Parser przechodzi testy Unicode, tab, CR/LF, plus, zera wiodące i overflow usize.",
    "Todo przechodzi testy pustej listy, duplikatów, Done(0), NotFound i powtórzonego Done.",
    "Obie sesje zachowują kontrakt świeżego stanu i różnego zachowania po Err.",
  ],
  projectConnection:
    "Projekt jest rdzeniem Todo CLI działającego w pamięci; wejście terminalowe i pliki dochodzą w następnym etapie.",
  assessmentId: "todo-session-project/session-blank",
  gateCriteria: [
    {
      id: "parser-contract-gate",
      label: "Parser rozpoznaje pełny kontrakt sukcesów i błędów.",
      taskRefs: [
        { lessonId: "todo-command-parser", stepId: "parser-debug" },
        { lessonId: "todo-command-parser", stepId: "parser-add-gate" },
        { lessonId: "todo-command-parser", stepId: importTodoCommand.id },
      ],
    },
    {
      id: "state-invariant-gate",
      label:
        "Add i Done zachowują walidację, identyfikatory i stan po błędzie.",
      taskRefs: [
        { lessonId: "todo-state-invariants", stepId: "state-add-done-gate" },
        { lessonId: "todo-session-project", stepId: "session-blank" },
        { lessonId: "todo-state-invariants", stepId: editTodoBoard.id },
      ],
    },
    {
      id: "state-list-gate",
      label:
        "List zachowuje format, kolejność, duplikaty i znaczniki wykonania.",
      taskRefs: [
        { lessonId: "todo-state-invariants", stepId: "state-list-gate" },
        { lessonId: "todo-session-project", stepId: "session-blank" },
        { lessonId: "todo-state-invariants", stepId: editTodoBoard.id },
      ],
    },
    {
      id: "session-behavior-gate",
      label: "Sesja daje wynik każdej linii i kontynuuje po błędzie.",
      taskRefs: [
        { lessonId: "todo-session-project", stepId: "session-run-gate" },
        { lessonId: "todo-session-project", stepId: "session-blank" },
        { lessonId: "todo-session-project", stepId: replayTodoSession.id },
      ],
    },
    {
      id: "strict-session-gate",
      label:
        "Ścisła sesja zachowuje pierwszy błąd i zwraca ostatni sukces przy jego braku.",
      taskRefs: [
        { lessonId: "todo-session-project", stepId: "session-strict-gate" },
        { lessonId: "todo-session-project", stepId: "session-blank" },
        { lessonId: "todo-session-project", stepId: replayTodoSession.id },
      ],
    },
  ],
};

export const todoProject: ProjectContract = {
  id: "todo-command-session",
  lessonIds: todoLessons.map((lesson) => lesson.id),
  reviewConceptIds: Object.keys(todoReviewExercises),
  title: "Todo CLI: polecenia i stan",
  objective:
    "Zbuduj w pamięci mały rdzeń Todo CLI, który przyjmuje linie, zwraca jawne wyniki i zachowuje niezmienniki stanu.",
  requiredBehaviors: [
    "Parser rozpoznaje Add, Done, List i błędy Empty, Unknown, InvalidTitle, InvalidId; operacje Todo dodają NotFound.",
    "Todo zachowuje dokładny tytuł, kolejność, duplikaty i numery od 1.",
    "run_session kontynuuje po błędzie, a run_strict_session zatrzymuje się na pierwszym błędzie.",
  ],
  requiredEvidence: [
    "Testy obejmują Unicode, puste i powtarzane tytuły, id 30, usize::MAX/overflow i błędy CR/LF.",
    "Testy sprawdzają brak złej mutacji po InvalidTitle, InvalidId i NotFound.",
    "Testy sprawdzają świeże wywołania obu sesji, stan po błędzie w run_session i pierwszeństwo błędu w run_strict_session.",
  ],
  constraints: [
    "Nie używaj unwrap ani expect do obsługi wejścia użytkownika.",
    "Nie dziel tekstu w środku znaku UTF-8; parser ma zachować wnętrze tytułu.",
    "Projekt na tym etapie działa w pamięci, z poznanymi typami standardowymi. Terminal i pliki dodamy w kolejnych modułach.",
  ],
  lessonId: "todo-command-parser",
  adversarialLessonId: "todo-session-project",
  adversarialInject:
    "Zmiana wymagań klienta: oprócz sesji kontynuującej po błędach dodaj tryb ścisły, który zwraca pierwszy błąd. Sprawdź oba porządki błędów parsera i stanu oraz niezależność kolejnych wywołań.",
  retrospective: [
    "Który niezmiennik parsera najłatwiej złamać przez zbyt szerokie trimowanie?",
    "Jak rozpoznałeś różnicę między błędem wejścia a NotFound stanu?",
    "Który typ wyniku ujawnia decyzję kontynuacja/zatrzymanie bez globalnej flagi?",
  ],
};
