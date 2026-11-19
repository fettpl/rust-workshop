import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const modelCode = String.raw`#[derive(Debug, PartialEq, Eq)]
enum Command { Add(String), Done(usize), List }
#[derive(Debug, PartialEq, Eq)]
enum CommandError { Empty, Unknown, InvalidTitle, InvalidId, NotFound }
#[derive(Debug, PartialEq, Eq)]
struct Task { title: String, done: bool }
#[derive(Debug, PartialEq, Eq)]
struct Todo { tasks: Vec<Task> }
impl Todo {
    fn new() -> Todo { Todo { tasks: Vec::new() } }
    fn apply(&mut self, command: Command) -> Result<String, CommandError> {
        match command {
            Command::Add(title) => {
                if title.trim().is_empty() || title.contains('\n') || title.contains('\r') {
                    return Err(CommandError::InvalidTitle);
                }
                self.tasks.push(Task { title, done: false });
                Ok(format!("added {}", self.tasks.len()))
            }
            Command::Done(id) => {
                if id == 0 { return Err(CommandError::InvalidId); }
                if id > self.tasks.len() { return Err(CommandError::NotFound); }
                self.tasks[id - 1].done = true;
                Ok(format!("done {}", id))
            }
            Command::List => {
                let mut output = String::new();
                let mut index = 0;
                while index < self.tasks.len() {
                    let task = &self.tasks[index];
                    let flag = if task.done { "x" } else { " " };
                    output.push_str(&format!("{} [{}] {}\n", index + 1, flag, task.title));
                    index += 1;
                }
                Ok(output)
            }
        }
    }
}
fn parse_command(line: &str) -> Result<Command, CommandError> {
    let line = line.trim();
    if line.is_empty() { return Err(CommandError::Empty); }
    let (verb, argument) = match line.split_once(' ') {
        Some(parts) => parts,
        None => (line, ""),
    };
    match verb {
        "add" => {
            let title = argument.trim();
            if title.is_empty() || title.contains('\n') || title.contains('\r') {
                Err(CommandError::InvalidTitle)
            } else { Ok(Command::Add(String::from(title))) }
        }
        "done" => {
            let id = argument.trim();
            if id.is_empty() { return Err(CommandError::InvalidId); }
            for character in id.chars() {
                if !character.is_ascii_digit() { return Err(CommandError::InvalidId); }
            }
            match id.parse::<usize>() {
                Ok(value) if value > 0 => Ok(Command::Done(value)),
                _ => Err(CommandError::InvalidId),
            }
        }
        "list" if argument.trim().is_empty() => Ok(Command::List),
        _ => Err(CommandError::Unknown),
    }
}`;

const formatTypes = String.raw`#[derive(Debug, PartialEq, Eq)]
enum FormatError {
    InvalidHeader,
    MissingFinalNewline,
    InvalidRow(usize),
    InvalidStatus(usize),
    InvalidTitle(usize),
}`;
const formatStarter =
  `${modelCode}\n${formatTypes}\n` +
  String.raw`
fn encode(_todo: &Todo) -> String { String::from("RUST_TODO_V1\n") }
fn decode(_text: &str) -> Result<Todo, FormatError> { Ok(Todo::new()) }
`;

function formatTests(first: string, second: string): string {
  return String.raw`
#[test]
fn roundtrip_preserves_exact_titles_flags_order_and_duplicates() {
    let mut todo = Todo::new();
    assert!(todo.apply(Command::Add(String::from("${first}"))).is_ok());
    assert!(todo.apply(Command::Add(String::from("${second}"))).is_ok());
    assert!(todo.apply(Command::Add(String::from("${first}"))).is_ok());
    assert!(todo.apply(Command::Done(2)).is_ok());
    let expected = "RUST_TODO_V1\n0\t${first}\n1\t${second}\n0\t${first}\n";
    assert_eq!(encode(&todo), expected);
    assert_eq!(decode(expected), Ok(todo));
    assert_eq!(encode(&Todo::new()), "RUST_TODO_V1\n");
    assert_eq!(decode("RUST_TODO_V1\n"), Ok(Todo::new()));
}
#[test]
fn malformed_format_is_rejected_without_partial_success() {
    for text in ["", "RUST_TODO_V1", "RUST_TODO_V2\n", "\u{feff}RUST_TODO_V1\n", "RUST_TODO_V1\r\n"] {
        assert_eq!(decode(text), Err(FormatError::InvalidHeader));
    }
    assert_eq!(decode("RUST_TODO_V1\n0\tx"), Err(FormatError::MissingFinalNewline));
    assert_eq!(decode("RUST_TODO_V1\n\n"), Err(FormatError::InvalidRow(2)));
    assert_eq!(decode("RUST_TODO_V1\n0\tok\nnot-a-row\n"), Err(FormatError::InvalidRow(3)));
    for flag in ["x", "2", "01", " 0", ""] {
        assert_eq!(decode(&format!("RUST_TODO_V1\n{}\tx\n", flag)), Err(FormatError::InvalidStatus(2)));
    }
    for title in ["", "  ", "\t", "x\r", "a\rb"] {
        assert_eq!(decode(&format!("RUST_TODO_V1\n0\t{}\n", title)), Err(FormatError::InvalidTitle(2)));
    }
    assert_eq!(decode("RUST_TODO_V1\n0\tx\n\n"), Err(FormatError::InvalidRow(3)));
}
`;
}

const fixtureHelpers = String.raw`
fn fixture_dir(label: &str) -> std::path::PathBuf {
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
    let dir = std::env::temp_dir().join(format!("rust-workshop-{}-{}-{}", label, std::process::id(), stamp));
    std::fs::create_dir(&dir).unwrap();
    dir
}
`;

function persistenceTests(label: string, title: string): string {
  return (
    fixtureHelpers +
    String.raw`
#[test]
fn files_roundtrip_and_only_not_found_means_empty() {
    let dir = fixture_dir("${label}-roundtrip");
    let path = dir.join("zadania.v1.txt");
    let path = path.to_str().unwrap();
    assert_eq!(load(path).unwrap(), Todo::new());
    assert!(!std::path::Path::new(path).exists());
    let mut todo = Todo::new();
    todo.apply(Command::Add(String::from("${title}"))).unwrap();
    todo.apply(Command::Add(String::from("drugi"))).unwrap();
    todo.apply(Command::Done(1)).unwrap();
    save(path, &todo).unwrap();
    assert_eq!(std::fs::read_to_string(path).unwrap(), "RUST_TODO_V1\n1\t${title}\n0\tdrugi\n");
    assert_eq!(load(path).unwrap(), todo);
    assert!(!std::path::Path::new(&format!("{}.tmp", path)).exists());
    save(path, &Todo::new()).unwrap();
    assert_eq!(std::fs::read_to_string(path).unwrap(), "RUST_TODO_V1\n");
    std::fs::write(path, "corrupt").unwrap();
    assert!(matches!(load(path), Err(StorageError::Format(FormatError::InvalidHeader))));
    assert_eq!(std::fs::read_to_string(path).unwrap(), "corrupt");
    std::fs::write(path, [255_u8]).unwrap();
    assert!(matches!(load(path), Err(StorageError::Io(_))));
    assert_eq!(std::fs::read(path).unwrap(), vec![255]);
    assert!(matches!(load(dir.to_str().unwrap()), Err(StorageError::Io(_))));
    std::fs::remove_dir_all(dir).unwrap();
}
#[test]
fn staging_collision_and_rename_error_preserve_previous_data() {
    let dir = fixture_dir("${label}-failure");
    let path = dir.join("tasks.data");
    let path = path.to_str().unwrap();
    std::fs::write(path, "RUST_TODO_V1\n0\told\n").unwrap();
    let temp = format!("{}.tmp", path);
    std::fs::write(&temp, "another writer").unwrap();
    assert!(matches!(save(path, &Todo::new()), Err(StorageError::Io(_))));
    assert_eq!(std::fs::read_to_string(path).unwrap(), "RUST_TODO_V1\n0\told\n");
    assert_eq!(std::fs::read_to_string(&temp).unwrap(), "another writer");
    std::fs::remove_file(&temp).unwrap();
    std::fs::create_dir(&temp).unwrap();
    assert!(matches!(save(path, &Todo::new()), Err(StorageError::Io(_))));
    assert!(std::path::Path::new(&temp).is_dir());
    std::fs::remove_dir(&temp).unwrap();
    let destination = dir.join("is-a-directory");
    std::fs::create_dir(&destination).unwrap();
    std::fs::write(destination.join("keep"), "safe").unwrap();
    assert!(matches!(save(destination.to_str().unwrap(), &Todo::new()), Err(StorageError::Io(_))));
    assert_eq!(std::fs::read_to_string(destination.join("keep")).unwrap(), "safe");
    let missing_parent = dir.join("absent").join("tasks");
    assert!(matches!(save(missing_parent.to_str().unwrap(), &Todo::new()), Err(StorageError::Io(_))));
    std::fs::remove_dir_all(dir).unwrap();
}
`
  );
}

function commandTests(label: string, title: string): string {
  return (
    fixtureHelpers +
    String.raw`
#[test]
fn separate_calls_reload_persisted_state_and_list_never_writes() {
    let dir = fixture_dir("${label}-restart");
    let path = dir.join("tasks.txt");
    let path = path.to_str().unwrap();
    assert_eq!(execute(path, "list").unwrap(), "");
    assert!(!std::path::Path::new(path).exists());
    assert_eq!(execute(path, "add ${title}").unwrap(), "added 1");
    assert_eq!(execute(path, "add ${title}").unwrap(), "added 2");
    assert_eq!(execute(path, "done 2").unwrap(), "done 2");
    assert_eq!(execute(path, "done 2").unwrap(), "done 2");
    assert_eq!(execute(path, "list").unwrap(), "1 [ ] ${title}\n2 [x] ${title}\n");
    assert_eq!(std::fs::read_to_string(path).unwrap(), "RUST_TODO_V1\n0\t${title}\n1\t${title}\n");
    let temp = format!("{}.tmp", path);
    std::fs::write(&temp, "reserved").unwrap();
    assert_eq!(execute(path, "list").unwrap(), "1 [ ] ${title}\n2 [x] ${title}\n");
    assert_eq!(std::fs::read_to_string(&temp).unwrap(), "reserved");
    std::fs::remove_dir_all(dir).unwrap();
}
#[test]
fn domain_read_and_save_errors_do_not_report_success_or_overwrite_data() {
    let dir = fixture_dir("${label}-errors");
    let path = dir.join("tasks.txt");
    let path = path.to_str().unwrap();
    std::fs::write(path, "RUST_TODO_V1\n0\told\n").unwrap();
    for input in ["done 0", "done +1", "done １", "done 99999999999999999999999999999999"] {
        assert!(matches!(execute(path, input), Err(AppError::Command(CommandError::InvalidId))));
    }
    assert!(matches!(execute(path, "done 90"), Err(AppError::Command(CommandError::NotFound))));
    assert!(matches!(execute(path, "add a\nb"), Err(AppError::Command(CommandError::InvalidTitle))));
    assert!(matches!(execute(path, "unknown"), Err(AppError::Command(CommandError::Unknown))));
    assert!(matches!(execute(path, " "), Err(AppError::Command(CommandError::Empty))));
    assert_eq!(std::fs::read_to_string(path).unwrap(), "RUST_TODO_V1\n0\told\n");
    let temp = format!("{}.tmp", path);
    std::fs::write(&temp, "reserved").unwrap();
    assert!(matches!(execute(path, "add unsaved"), Err(AppError::Storage(StorageError::Io(_)))));
    assert!(matches!(execute(path, "done 1"), Err(AppError::Storage(StorageError::Io(_)))));
    assert_eq!(std::fs::read_to_string(path).unwrap(), "RUST_TODO_V1\n0\told\n");
    assert_eq!(std::fs::read_to_string(&temp).unwrap(), "reserved");
    std::fs::write(path, "corrupt").unwrap();
    assert!(matches!(execute(path, "unknown"), Err(AppError::Command(CommandError::Unknown))));
    assert!(matches!(execute(path, "add x"), Err(AppError::Storage(StorageError::Format(FormatError::InvalidHeader)))));
    assert_eq!(std::fs::read_to_string(path).unwrap(), "corrupt");
    assert!(matches!(execute(dir.to_str().unwrap(), "list"), Err(AppError::Storage(StorageError::Io(_)))));
    std::fs::remove_dir_all(dir).unwrap();
}
`
  );
}

const formatCode =
  `${formatTypes}\n` +
  String.raw`
fn encode(todo: &Todo) -> String {
    let mut text = String::from("RUST_TODO_V1\n");
    for task in &todo.tasks {
        let flag = if task.done { "1" } else { "0" };
        text.push_str(flag);
        text.push('\t');
        text.push_str(&task.title);
        text.push('\n');
    }
    text
}
fn decode(text: &str) -> Result<Todo, FormatError> {
    let (header, body) = match text.split_once('\n') {
        Some(parts) => parts,
        None => return Err(FormatError::InvalidHeader),
    };
    if header != "RUST_TODO_V1" { return Err(FormatError::InvalidHeader); }
    if !text.ends_with('\n') { return Err(FormatError::MissingFinalNewline); }
    let mut todo = Todo::new();
    let mut line_number = 2;
    for row in body.split_terminator('\n') {
        let (flag, title) = match row.split_once('\t') {
            Some(parts) => parts,
            None => return Err(FormatError::InvalidRow(line_number)),
        };
        let done = match flag {
            "0" => false,
            "1" => true,
            _ => return Err(FormatError::InvalidStatus(line_number)),
        };
        if title.trim().is_empty() || title.contains('\r') || title.contains('\n') {
            return Err(FormatError::InvalidTitle(line_number));
        }
        todo.tasks.push(Task { title: String::from(title), done });
        line_number += 1;
    }
    Ok(todo)
}`;
const formatSolution = `${modelCode}\n${formatCode}`;

const storageTypes = String.raw`#[derive(Debug)]
enum StorageError { Io(std::io::Error), Format(FormatError) }
`;
const storageStarter =
  `${formatSolution}\n${storageTypes}\n` +
  String.raw`
fn load(_path: &str) -> Result<Todo, StorageError> { Ok(Todo::new()) }
fn save(_path: &str, _todo: &Todo) -> Result<(), StorageError> { Ok(()) }
`;

const storageCode =
  `${storageTypes}\n` +
  String.raw`
use std::fs::{self, File};
use std::io::Write;

fn load(path: &str) -> Result<Todo, StorageError> {
    let text = match fs::read_to_string(path) {
        Ok(text) => text,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Todo::new()),
        Err(error) => return Err(StorageError::Io(error)),
    };
    match decode(&text) {
        Ok(todo) => Ok(todo),
        Err(error) => Err(StorageError::Format(error)),
    }
}
fn write_staged(file: &mut File, text: &str) -> Result<(), std::io::Error> {
    file.write_all(text.as_bytes())?;
    file.sync_all()?;
    Ok(())
}
fn save(path: &str, todo: &Todo) -> Result<(), StorageError> {
    let temp = format!("{}.tmp", path);
    let mut file = match File::create_new(&temp) {
        Ok(file) => file,
        Err(error) => return Err(StorageError::Io(error)),
    };
    let written = write_staged(&mut file, &encode(todo));
    drop(file);
    if let Err(error) = written {
        let _cleanup = fs::remove_file(&temp);
        return Err(StorageError::Io(error));
    }
    if let Err(error) = fs::rename(&temp, path) {
        let _cleanup = fs::remove_file(&temp);
        return Err(StorageError::Io(error));
    }
    Ok(())
}`;
const storageSolution = `${formatSolution}\n${storageCode}`;
const appTypes = String.raw`#[derive(Debug)]
enum AppError { Command(CommandError), Storage(StorageError) }
`;
const appStarter =
  `${storageSolution}\n${appTypes}\n` +
  String.raw`
fn execute(_path: &str, _line: &str) -> Result<String, AppError> {
    Ok(String::new())
}
`;
const appCode =
  `${appTypes}\n` +
  String.raw`
fn execute(path: &str, line: &str) -> Result<String, AppError> {
    let command = match parse_command(line) {
        Ok(command) => command,
        Err(error) => return Err(AppError::Command(error)),
    };
    let changes_state = match &command {
        Command::List => false,
        _ => true,
    };
    let mut todo = match load(path) {
        Ok(todo) => todo,
        Err(error) => return Err(AppError::Storage(error)),
    };
    let output = match todo.apply(command) {
        Ok(output) => output,
        Err(error) => return Err(AppError::Command(error)),
    };
    if changes_state {
        if let Err(error) = save(path, &todo) {
            return Err(AppError::Storage(error));
        }
    }
    Ok(output)
}`;
const appSolution = `${storageSolution}\n${appCode}`;

// Recovery exercises deliberately use a different data contract and public API.
// Shared construction keeps equivalent error coverage without teaching a second
// unrelated implementation style alongside the new Rust concepts.
function notebookNames(source: string): string {
  const names: Record<string, string> = {
    CommandError: "NoteError",
    Command: "NoteCommand",
    Task: "Note",
    Todo: "Notebook",
    Add: "Note",
    Done: "Archive",
    List: "Show",
    InvalidTitle: "InvalidBody",
    FormatError: "NotebookFormatError",
    StorageError: "NotebookStorageError",
    AppError: "NotebookError",
    tasks: "notes",
    task: "note",
    todo: "notebook",
    title: "body",
    done: "archived",
    parse_command: "parse_note",
    encode: "pack",
    decode: "unpack",
    load: "open_notebook",
    save: "save_notebook",
    execute: "execute_note",
    write_staged: "write_notebook_stage",
  };
  return source
    .replace(/\b[A-Za-z_][A-Za-z_0-9]*\b/g, (word) => names[word] ?? word)
    .replaceAll("RUST_TODO_V1", "NOTEBOOK_V2")
    .replaceAll("RUST_TODO_V2", "NOTEBOOK_V3")
    .replaceAll('"add"', '"note"')
    .replaceAll('"archived" => {', '"archive" => {')
    .replaceAll('"list"', '"show"')
    .replaceAll("added {}", "noted {}")
    .replaceAll("{}.tmp", "{}.pending");
}
const notebookModel = notebookNames(modelCode);
const notebookFormat = notebookNames(formatCode)
  .replace(
    'if note.archived { "1" } else { "0" }',
    'if note.archived { "archived" } else { "active" }',
  )
  .replace("text.push('\\t')", "text.push('|')")
  .replace("row.split_once('\\t')", "row.split_once('|')")
  .replace('"0" => false', '"active" => false')
  .replace('"1" => true', '"archived" => true');
const notebookFormatSolution = `${notebookModel}\n${notebookFormat}`;
const notebookFormatStarter =
  `${notebookModel}\n${notebookNames(formatTypes)}\n` +
  String.raw`
fn pack(_notebook: &Notebook) -> String { String::from("NOTEBOOK_V2\n") }
fn unpack(_text: &str) -> Result<Notebook, NotebookFormatError> { Ok(Notebook::new()) }
`;
const notebookStorageSolution = `${notebookFormatSolution}\n${notebookNames(storageCode)}`;
const notebookStorageStarter =
  `${notebookFormatSolution}\n${notebookNames(storageTypes)}\n` +
  String.raw`
fn open_notebook(_path: &str) -> Result<Notebook, NotebookStorageError> { Ok(Notebook::new()) }
fn save_notebook(_path: &str, _notebook: &Notebook) -> Result<(), NotebookStorageError> { Ok(()) }
`;
const notebookAppSolution = `${notebookStorageSolution}\n${notebookNames(appCode)}`;
const notebookAppStarter =
  `${notebookStorageSolution}\n${notebookNames(appTypes)}\n` +
  String.raw`
fn execute_note(_path: &str, _line: &str) -> Result<String, NotebookError> { Ok(String::new()) }
`;

function notebookTestFormat(tests: string): string {
  return notebookNames(tests)
    .replaceAll("0\\t", "active|")
    .replaceAll("1\\t", "archived|")
    .replaceAll("{}\\t", "{}|");
}
const notebookFormatTests = notebookTestFormat(
  formatTests("  wydanie|β  ", "備忘 / 🚀\\t1"),
);
const notebookPersistenceTests = notebookTestFormat(
  persistenceTests("notebook-gate", "備忘|🚀 / plan"),
);
const notebookCommandTests = notebookTestFormat(
  commandTests("notebook-gate", "備忘  🚀|plan"),
)
  .replaceAll('"add ', '"note ')
  .replaceAll('"added ', '"noted ')
  .replaceAll('"list"', '"show"')
  .replaceAll('execute_note(path, "archived ', 'execute_note(path, "archive ')
  .replace(
    'for input in ["archived 0", "archived +1", "archived １", "archived 99999999999999999999999999999999"]',
    'for input in ["archive 0", "archive +1", "archive １", "archive 99999999999999999999999999999999"]',
  );

const formatContract =
  "encode(&Todo) -> String i decode(&str) -> Result<Todo, FormatError> używają formatu UTF-8: dokładny nagłówek RUST_TODO_V1 oraz LF, potem zero lub więcej wierszy: 0, TAB, tytuł, LF dla niewykonanego zadania albo 1, TAB, tytuł, LF dla wykonanego. Każdy wiersz wymaga końcowego LF. Pierwszy TAB jest separatorem; kolejne należą do tytułu. Zachowaj dokładny tytuł, także spacje na brzegach, tabulatory i Unicode; trim służy tylko sprawdzeniu, czy tytuł nie jest pusty. LF i CR w tytule są zabronione. Identyfikatory wynikają z kolejności wierszy od 1; duplikaty zostają. Pusty Todo daje sam nagłówek z LF. Brak lub inny nagłówek (także BOM i CRLF) daje InvalidHeader. Po sprawdzeniu nagłówka brak końcowego LF daje MissingFinalNewline. Następnie pierwszy zły wiersz daje InvalidRow(n), jeśli nie ma TAB, InvalidStatus(n), jeśli flaga nie jest dokładnie 0 lub 1, albo InvalidTitle(n), jeśli tytuł jest niepoprawny. n to numer fizycznej linii, pierwszy rekord ma numer 2. Puste wiersze i CRLF są błędami. Błąd nie zwraca częściowo odczytanego Todo. FormatError i Todo muszą obsługiwać Debug, PartialEq i Eq.";

const persistenceContract =
  "load(path: &str) -> Result<Todo, StorageError> odczytuje UTF-8 i wywołuje decode. Tylko ErrorKind::NotFound oznacza nowy pusty Todo, bez tworzenia pliku; każdy inny błąd odczytu, w tym niepoprawne UTF-8, daje StorageError::Io, a błąd formatu daje StorageError::Format. save(path: &str, todo: &Todo) -> Result<(), StorageError> serializuje stan do pliku obok celu: do całej ścieżki dopisuje .tmp (tasks.txt → tasks.txt.tmp). File::create_new odmawia otwarcia istniejącego pliku lub katalogu tymczasowego. Po utworzeniu własnego pliku: write_all, sync_all, zamknięcie uchwytu przez drop, a na końcu rename na plik docelowy. Każdy błąd przed udanym rename pozostawia poprzedni cel; zwracaj StorageError::Io. Sprzątaj wyłącznie własny plik tymczasowy, nigdy ten zastany. Nieudane sprzątanie nie może ukryć pierwotnego błędu. Nie usuwaj celu przed rename. To ćwiczenie nie zapewnia pełnej trwałości po utracie zasilania ani ochrony przed równoczesnymi autorami zmian: rename nie jest transakcją całego odczytu i zapisu.";

const commandContract =
  "execute(path: &str, line: &str) -> Result<String, AppError> najpierw parsuje polecenie; błąd parsera daje AppError::Command bez odczytu pliku. Następnie każde wywołanie od nowa ładuje Todo z tej samej ścieżki, stosuje Command i zapisuje stan tylko po poprawnym Add lub Done (także powtórzonym Done). Błąd Todo daje AppError::Command bez zapisu; błąd load lub save daje AppError::Storage. Dopiero udany zapis pozwala zwrócić tekst sukcesu. List nie tworzy ani nie przepisuje pliku. Stary parser i Todo zachowują kontrakt: małe add/done/list, tylko spacja oddziela czasownik, add obcina brzegi argumentu i odrzuca pusty tytuł oraz LF/CR; done przyjmuje dodatnie cyfry ASCII mieszczące się w usize, z zerami wiodącymi, bez plusa; list nie przyjmuje argumentu. Done(0) to InvalidId, numer poza listą to NotFound. Add zwraca added N, Done zwraca done N, a List zwraca kolejne N [ ] title\\n lub N [x] title\\n. Każda linia listy ma końcowy LF. Identyfikatory i duplikaty są zachowane. AppError ma warianty Command(CommandError) i Storage(StorageError), oba błędy zewnętrzne obsługują Debug.";

const notebookFormatContract =
  "Nowa domena to Notebook z notes: Vec<Note>; Note posiada body: String i archived: bool. pack(&Notebook) -> String i unpack(&str) -> Result<Notebook, NotebookFormatError> używają dokładnego nagłówka NOTEBOOK_V2 oraz LF. Rekord ma postać active|body i LF albo archived|body i LF; tylko pierwszy znak | oddziela status od treści. Zachowaj całe body, łącznie z dodatkowymi |, tabulatorami, spacjami brzegowymi i Unicode. Treść musi być niepusta po trim i nie może zawierać CR ani LF. Kolejność i duplikaty zostają, numery są pozycyjne od 1. Pusty notes daje sam nagłówek. Każda linia wymaga końcowego LF, CRLF i BOM są odrzucane. Kolejność walidacji: błędny/brakujący nagłówek daje InvalidHeader; brak ostatniego LF daje MissingFinalNewline; potem pierwszy zły wiersz daje InvalidRow(n) przy braku |, InvalidStatus(n) przy statusie innym niż dokładnie active lub archived, InvalidBody(n) przy złej treści. n liczy fizyczne linie od 1, pierwszy rekord to 2. Puste wiersze są błędem. NotebookFormatError i Notebook obsługują Debug, PartialEq, Eq; błędny odczyt nie zwraca częściowego stanu.";
const notebookStorageContract =
  "open_notebook(path: &str) -> Result<Notebook, NotebookStorageError> odczytuje UTF-8 i wywołuje unpack; tylko ErrorKind::NotFound daje pusty Notebook bez tworzenia pliku. Inne błędy odczytu, także wadliwe UTF-8, dają Io(io::Error); błąd formatu daje Format(NotebookFormatError). save_notebook(path: &str, notebook: &Notebook) -> Result<(), NotebookStorageError> zapisuje pack(notebook) przez własny plik obok celu, do całej ścieżki dopisując .pending. Użyj File::create_new, write_all, sync_all, drop i dopiero potem rename. Istniejący .pending, także katalog, powoduje Io i pozostaje nietknięty. Każdy błąd przed udanym rename zachowuje poprzedni cel. Sprzątaj tylko własny plik tymczasowy; błąd sprzątania nie ukrywa pierwotnego błędu. Nigdy nie usuwaj celu przed rename. Ten kontrakt również nie zapewnia pełnej trwałości po utracie zasilania ani bezpieczeństwa równoczesnych autorów zmian.";
const notebookCommandContract =
  "execute_note(path: &str, line: &str) -> Result<String, NotebookError> używa dostarczonych parse_note, Notebook::apply, open_notebook i save_notebook. Najpierw parser, potem świeży odczyt, zastosowanie polecenia, zapis tylko po Note lub Archive, a na końcu wynik. NoteCommand::Note(String), Archive(usize), Show odpowiadają poleceniom note, archive, show. note obcina brzegi argumentu, ale zachowuje wnętrze i odrzuca pustą treść oraz LF/CR; archive wymaga dodatnich cyfr ASCII mieszczących się w usize, bez plusa, z dozwolonymi zerami wiodącymi. Tylko zwykła spacja oddziela czasownik. Show nie ma argumentów i nie zapisuje pliku. Wyniki to noted N, archived N, albo wiersze N [ ] body\\n / N [x] body\\n; każda linia ma LF. Duplikaty i powtórne Archive są poprawne; powtórne Archive też zapisuje. NoteError ma Empty, Unknown, InvalidBody, InvalidId i NotFound. Błąd parsera lub stanu daje NotebookError::Command(NoteError); load/save dają NotebookError::Storage(NotebookStorageError). Parser poprzedza odczyt nawet przy uszkodzonym pliku. Nie zwracaj sukcesu przed udanym zapisem; Show nie tworzy ani nie przepisuje pliku.";

const sandboxNote =
  "W przeglądarce testy tworzą własne katalogi tymczasowe w izolowanym runnerze i wykonują prawdziwe std::fs. Pliki z tego uruchomienia nie są plikami twojego komputera i nie stanowią trwałego magazynu między kliknięciami Uruchom. Formularz kodu nie udostępnia interaktywnego stdin ani wieloplikowego Cargo. Działanie terminala sprawdzisz w pobranym pakiecie.";

const formatRun = String.raw`fn main() {
    let message = "label:  żółć:🙂  \n";
    if let Some((label, value)) = message.split_once(':') {
        let exact = format!("{}:{}", label, value);
        let trimmed = format!("{}:{}", label, value.trim());
        println!("{:?}", value);
        println!("dokładnie: {}", exact == message);
        println!("po trim: {}", trimmed == message);
    }
}`;

const fileRun = String.raw`use std::fs;
use std::path::Path;

fn main() -> Result<(), std::io::Error> {
    let dir = std::env::temp_dir().join(format!("rust-workshop-file-demo-{}", std::process::id()));
    // create_dir odmawia użycia zastanego katalogu: nie nadpisujemy cudzych plików.
    fs::create_dir(&dir)?;
    let file = dir.join(Path::new("sample.txt"));
    fs::write(&file, "zażółć\t🙂\n")?;
    let text = fs::read_to_string(&file)?;
    println!("{:?}", text);
    fs::remove_file(&file)?;
    fs::remove_dir(&dir)?;
    Ok(())
}`;

function choose(
  id: string,
  kind: LessonStep["kind"],
  title: string,
  prompt: string,
  answers: [string, string, string],
  correct: "a" | "b" | "c",
  explanations: [string, string, string],
  evidenceKind: LessonStep["evidenceKind"] = "exposure",
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: answers.map((label, index) => ({
      id: ["a", "b", "c"][index],
      label,
    })),
    evaluator: {
      kind: "choice",
      correct,
      explanations: {
        a: explanations[0],
        b: explanations[1],
        c: explanations[2],
      },
    },
    evidenceKind,
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

function tested(
  id: string,
  kind: LessonStep["kind"],
  title: string,
  prompt: string,
  code: string,
  solution: string,
  tests: string,
  evidenceKind: LessonStep["evidenceKind"],
  hints: [string, string],
  suppliedSolutions?: LessonStep["suppliedSolutions"],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    code,
    solution,
    evaluator: {
      kind: "tests",
      tests,
      forbiddenPatterns: [".unwrap(", ".expect("],
    },
    expectedStatus: "success",
    evidenceKind,
    evidenceGate: true,
    hints,
    ...(suppliedSolutions ? { suppliedSolutions } : {}),
  };
}

const todoModelRefs = [
  { lessonId: "todo-command-parser", stepId: "parser-debug" },
  { lessonId: "todo-command-parser", stepId: "parser-add-gate" },
  { lessonId: "todo-state-invariants", stepId: "state-debug" },
  { lessonId: "todo-state-invariants", stepId: "state-add-done-gate" },
  { lessonId: "todo-state-invariants", stepId: "state-list-gate" },
];
const todoCodecRefs = [
  ...todoModelRefs,
  { lessonId: "todo-storage-format", stepId: "format-debug" },
];
const notebookCodecRefs = [
  { lessonId: "todo-storage-format", stepId: "format-gate" },
];
const todoStorageRefs = [
  ...todoCodecRefs,
  { lessonId: "todo-file-persistence", stepId: "file-debug" },
];
const notebookStorageRefs = [
  ...notebookCodecRefs,
  { lessonId: "todo-file-persistence", stepId: "file-gate" },
];

const formatHints: [string, string] = [
  "Nie wywołuj trim na całym wierszu. Rozdziel pierwszy separator określony w kontrakcie, a jego prawą stronę zachowaj bez zmian.",
  "Sprawdź nagłówek i końcowy LF, potem użyj split_terminator('\\n'). Numer linii zwiększaj po każdym poprawnym rekordzie.",
];
const storageHints: [string, string] = [
  "Rozdziel brak pliku od innych błędów. Utworzenie pliku tymczasowego musi używać create_new, zanim pojawi się jakiekolwiek sprzątanie.",
  "write_all i sync_all operują na własnym File; zamknij go przed rename. Zachowaj pierwotny błąd, nawet jeśli sprzątanie też się nie uda.",
];
const appHints: [string, string] = [
  "Zapisz informację, czy Command zmienia stan, zanim przekażesz go przez move do apply.",
  "Kolejność to parse → load → apply → ewentualne save → Ok(output). Każda granica opakowuje błąd w odpowiedni wariant AppError.",
];

export const ioCompetencies: Competency[] = [
  {
    id: "io-format-contract",
    title: "Odtwarzasz stan bez utraty tekstu i odrzucasz uszkodzony format.",
  },
  {
    id: "io-file-persistence",
    title:
      "Odczytujesz i zapisujesz prawdziwe pliki, zachowując błędy i poprzednie dane.",
  },
  {
    id: "io-cli-orchestration",
    title:
      "Łączysz polecenie ze stanem na dysku i potwierdzasz tylko zapisany sukces.",
  },
];

export const ioConcepts: Concept[] = [
  {
    id: "io-format-roundtrip",
    title: "Wersjonowany format i pełny round trip",
    prerequisites: ["cargo-targets"],
    competencyIds: ["io-format-contract"],
    reviewPrompt:
      "Dlaczego przy odczycie pliku Todo rozdzielasz tylko pierwszy TAB i nie obcinasz tytułu?",
    reviewAnswer:
      "Pierwszy TAB oddziela flagę od tytułu, a reszta jest danymi; obcinanie lub dalszy podział zmieniłyby stan po round tripie.",
    distinguish:
      "Parser polecenia normalizuje argument zgodnie ze swoim kontraktem, ale dekoder zapisanego stanu musi odtworzyć dokładny tytuł.",
  },
  {
    id: "io-safe-persistence",
    title: "Błąd odczytu i etapowany zapis",
    prerequisites: ["io-format-roundtrip"],
    competencyIds: ["io-file-persistence"],
    reviewPrompt:
      "Kiedy save może zastąpić poprzedni plik i co robi, jeśli .tmp już istnieje?",
    reviewAnswer:
      "Dopiero po zapisaniu i synchronizacji własnego pliku tymczasowego; istniejący .tmp powoduje błąd bez nadpisania ani usunięcia go.",
    distinguish:
      "Etapowanie chroni poprzedni cel przed błędem zapisu, lecz samo rename nie zapewnia transakcji między dwoma autorami ani pełnej trwałości po awarii zasilania.",
  },
  {
    id: "io-terminal-boundary",
    title: "Potwierdzenie operacji po zapisie",
    prerequisites: ["io-safe-persistence"],
    competencyIds: ["io-cli-orchestration"],
    reviewPrompt:
      "Dlaczego execute nie zwraca added N natychmiast po Todo::apply?",
    reviewAnswer:
      "Zmiana w pamięci nie oznacza zapisu; execute najpierw zapisuje plik, a błąd zapisu przekazuje jako AppError::Storage.",
    distinguish:
      "Test kilku wywołań execute dowodzi ponownego odczytu pliku; interaktywny terminal, argv i zachowanie po EOF wymagają osobnej próby uruchomionego pakietu.",
  },
];

export const ioSources: Source[] = [
  {
    id: "io-std-str",
    title: "Rust standard library: str, split_once and split_terminator",
    url: "https://doc.rust-lang.org/std/primitive.str.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu separatorów i końców linii.",
  },
  {
    id: "io-std-read",
    title: "Rust standard library: fs::read_to_string",
    url: "https://doc.rust-lang.org/std/fs/fn.read_to_string.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy: "Sprawdzaj przy zmianie obsługi UTF-8 lub błędów odczytu.",
  },
  {
    id: "io-std-file",
    title: "Rust standard library: File::create_new and sync_all",
    url: "https://doc.rust-lang.org/std/fs/struct.File.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj stabilność API i ograniczenia trwałości przy zmianie zapisu.",
  },
  {
    id: "io-std-write",
    title: "Rust standard library: Write::write_all",
    url: "https://doc.rust-lang.org/std/io/trait.Write.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy: "Sprawdzaj po zmianie obsługi częściowego zapisu.",
  },
  {
    id: "io-std-rename",
    title: "Rust standard library: fs::rename",
    url: "https://doc.rust-lang.org/std/fs/fn.rename.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj zachowanie na platformach i systemach plików przy zmianie eksportu.",
  },
  {
    id: "io-std-path",
    title: "Rust standard library: Path",
    url: "https://doc.rust-lang.org/std/path/struct.Path.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy: "Sprawdzaj po zmianie reprezentacji ścieżki.",
  },
  {
    id: "io-std-stdin",
    title: "Rust standard library: Stdin::read_line",
    url: "https://doc.rust-lang.org/std/io/struct.Stdin.html",
    classification: "versioned",
    reviewedAt: "2026-09-12",
    recheckPolicy: "Sprawdzaj przy zmianie pętli wejścia i obsługi EOF.",
  },
  {
    id: "io-rust-stderr",
    title: "Rust Book: Redirecting Errors to Standard Error",
    url: "https://doc.rust-lang.org/book/ch12-06-writing-to-stderr-instead-of-stdout.html",
    classification: "stable",
    reviewedAt: "2026-09-12",
    recheckPolicy: "Sprawdzaj przy zmianie kontraktu wyjścia CLI.",
  },
  {
    id: "io-playground-boundary",
    title: "Official Rust Playground: architecture and resource limits",
    url: "https://github.com/rust-lang/rust-playground",
    classification: "dynamic",
    reviewedAt: "2026-09-12",
    recheckPolicy:
      "Sprawdzaj przed zmianą runnera lub obietnic o trwałości plików.",
  },
];

export const ioLessons: Lesson[] = [
  {
    id: "todo-storage-format",
    moduleId: "todo-io",
    conceptIds: ["io-format-roundtrip"],
    competencyIds: ["io-format-contract"],
    prerequisites: ["cargo-package-integration"],
    title: "Format Todo: zapisz dokładnie to, co odtworzysz",
    subtitle:
      "Dostajesz FormatError::{InvalidHeader, MissingFinalNewline, InvalidRow(usize), InvalidStatus(usize), InvalidTitle(usize)}, encode(&Todo) -> String i decode(&str) -> Result<Todo, FormatError>; FormatError i Todo mają Debug, PartialEq i Eq, a zmieniasz decyzję na zachowanie tytułu dokładnie i odrzucanie całego wejścia od pierwszego wadliwego wiersza.",
    minutes: 40,
    outcomes: [
      "Zapiszesz i odtworzysz flagi, kolejność, duplikaty i dokładne tytuły.",
      "Odrzucisz zły nagłówek, uszkodzony rekord i niepełny ostatni wiersz.",
      "Wyjaśnisz, dlaczego format pliku nie używa trim do normalizacji danych.",
    ],
    steps: [
      choose(
        "format-predict",
        "predict",
        "Przewidź tytuł po odczycie",
        "Plik zawiera rekord `1\\t  plan\\t🙂  \\n`. Jaki tytuł musi wrócić po decode?",
        [
          "Dokładnie: dwie spacje, plan, TAB, 🙂 i dwie spacje",
          "plan 🙂 bez tabulatora i spacji na brzegach",
          "Tylko plan; drugi TAB zaczyna kolejne pole",
        ],
        "a",
        [
          "W tym formacie tylko pierwszy TAB rozdziela pola; cały pozostały tytuł jest danymi.",
          "To byłaby utrata danych. trim może jedynie sprawdzić, czy tytuł nie jest pusty.",
          "Kontrakt określa dwa pola. Kolejne tabulatory są częścią drugiego pola.",
        ],
        "prediction",
      ),
      run(
        "format-run",
        "Rozdziel i złóż pojedynczy komunikat",
        "W tym małym eksperymencie komunikat ma etykietę i wartość oddzielone pierwszym dwukropkiem. str::split_once zwraca dwie pożyczone części; drugi dwukropek, polskie znaki, emoji, spacje i LF pozostają w wartości. Porównaj ponowne złożenie dokładnych części ze złożeniem po trim: tylko pierwsze odtwarza cały komunikat. Zmień wartość i przewidź, czy te porównania nadal będą prawdziwe. Serializacja zamienia stan w umówiony tekst, a deserializacja go odtwarza; round trip oznacza powrót do tego samego stanu. W następnym zadaniu zastosujesz tę zasadę do osobnego formatu Todo. Do rekordów przyda się split_terminator('\\n'): dzieli po LF bez dodatkowego pustego rekordu wyłącznie z powodu końcowego LF i, w przeciwieństwie do lines(), nie usuwa CR z CRLF. " +
          formatContract,
        formatRun,
        '"  żółć:🙂  \\n"\ndokładnie: true\npo trim: false\n',
      ),
      choose(
        "format-explain",
        "explain",
        "Nie używaj formatu ekranu jako pliku",
        "Dlaczego `1 [x] tytuł` z Command::List nie jest automatycznie dobrym formatem trwałym?",
        [
          "Rust nie pozwala zapisać nawiasów do pliku",
          "Wygląd listy jest kontraktem prezentacji; plik ma własny nagłówek, separatory i walidację",
          "Każdy format tekstowy wymaga serde",
        ],
        "b",
        [
          "Nawiasy można zapisać. Problem dotyczy znaczenia i stabilności formatu.",
          "Wersja formatu pozwala odrzucić nieznane dane, a oddzielny kontrakt chroni przed zmianami widoku.",
          "Ten prosty, ograniczony format można zrealizować standardową biblioteką; nie potrzebuje serde.",
        ],
      ),
      tested(
        "format-debug",
        "debug",
        "Napraw utratę stanu",
        "Starter zawsze zapisuje sam nagłówek i zawsze odczytuje pustą listę. Zastąp obie funkcje pełnym kodowaniem i dekodowaniem. Parser i model Todo są już kompletnymi rozwiązaniami wcześniejszych zadań parsera oraz stanu. Po obejrzeniu startera ich ponowne użycie jest praktyką z dostarczonym rozwiązaniem; samodzielnie budujesz kodek. W tym jednoplikowym ćwiczeniu pola Task i Todo są dostępne lokalnie; eksport Cargo używa modułów i pub(crate). Bez unwrap i expect. " +
          formatContract,
        formatStarter,
        formatSolution,
        formatTests("  żółć\\t🙂  ", "e\\u{301} / 1\\t| x"),
        "fix",
        formatHints,
        { code: todoModelRefs, solution: todoModelRefs },
      ),
      tested(
        "format-gate",
        "modify",
        "Przenieś format do notatnika",
        "Nowy klient przechowuje notatki i status archiwizacji. Zmień rozumowanie z Todo na inny nagłówek, separator, statusy, błędy i publiczne funkcje; wklejenie gotowego kodeka Todo nie spełni tego kontraktu. " +
          notebookFormatContract,
        notebookFormatStarter,
        notebookFormatSolution,
        notebookFormatTests,
        "transfer",
        [
          "Separator to pierwszy |, a statusy są słowami. Nie dziel treści po kolejnych |.",
          "Zaimplementuj pack i unpack dla Notebook; waliduj wersję i zakończenia linii, zanim zwrócisz cały stan.",
        ],
      ),
      choose(
        "format-observe",
        "observe",
        "Nie zamieniaj błędu w częściowy sukces",
        "Pierwszy rekord jest poprawny, drugi ma flagę `x`. Co powinno zwrócić decode?",
        [
          "Ok z pierwszym zadaniem",
          "Ok z dwoma niewykonanymi zadaniami",
          "Err(InvalidStatus(3))",
        ],
        "c",
        [
          "Częściowy sukces ukryłby utratę rekordu przy kolejnym zapisie.",
          "Zastępowanie nieznanej flagi zmienia znaczenie danych.",
          "Numer 3 oznacza drugi rekord po nagłówku. Cały odczyt jest odrzucony.",
        ],
      ),
      choose(
        "format-recall",
        "recall",
        "Przywołaj dwie granice tekstu",
        "Która para reguł pasuje do parsera polecenia i dekodera pliku?",
        [
          "Oba normalizują cały tytuł przez trim",
          "Parser add obcina brzegi argumentu; dekoder zachowuje poprawny tytuł dokładnie",
          "Dekoder dzieli tytuł po wszystkich białych znakach",
        ],
        "b",
        [
          "To nie są te same granice: odtworzenie zapisanego stanu nie może go normalizować.",
          "Parser tworzy nową wartość według kontraktu wejścia; dekoder odtwarza istniejącą wartość.",
          "Białe znaki wewnątrz tytułu są danymi, nie separatorami rekordu.",
        ],
        "recall",
      ),
    ],
    misconceptions: [
      "Do zapisu można bez zastanowienia wykorzystać wynik List.",
      "trim zawsze poprawia jakość zapisanych danych.",
      "Uszkodzony rekord można pominąć i zwrócić sukces.",
    ],
    transferTask:
      "Zaprojektuj round trip notatnika z inną wersją, separatorem i słownymi statusami archiwizacji.",
    evidenceGate:
      "Obie funkcje przechodzą pełne testy poprawnych i niepoprawnych rekordów; dwa warianty zadania sprawdzają tę samą kompetencję.",
    sessionStops: [
      {
        afterStepId: "format-explain",
        title: "Zatrzymaj się po wyjaśnieniu formatu",
        nextGoal: "Sprawdź bramkę kodowania i dekodowania.",
      },
      {
        afterStepId: "format-gate",
        title: "Zatrzymaj się po bramce formatu",
        nextGoal: "Obserwuj zachowanie przy uszkodzonym wierszu.",
      },
    ],
    sourceIds: ["io-std-str"],
  },
  {
    id: "todo-file-persistence",
    moduleId: "todo-io",
    conceptIds: ["io-safe-persistence"],
    competencyIds: ["io-file-persistence"],
    prerequisites: ["todo-storage-format"],
    title: "Prawdziwe pliki: błędy i etapowany zapis",
    subtitle:
      "Dostajesz StorageError::{Io(std::io::Error), Format(FormatError)} oraz puste szkielety load(&str) -> Result<Todo, StorageError> i save(&str, &Todo) -> Result<(), StorageError>; poprawiasz load tak, aby tylko NotFound oznaczał pusty stan, a save tak, aby używał etapów create_new, write_all, sync_all, drop i rename.",
    minutes: 45,
    outcomes: [
      "Rozróżnisz brak pliku, wadliwe UTF-8, zły format i błąd systemu plików.",
      "Zapiszesz własny plik tymczasowy i zastąpisz cel dopiero po powodzeniu.",
      "Przetestujesz odczyt i zapis w prawdziwym katalogu tymczasowym.",
    ],
    steps: [
      choose(
        "file-predict",
        "predict",
        "Co oznacza błąd odczytu?",
        "Plik istnieje, lecz zawiera niepoprawne UTF-8. Czy load powinno utworzyć pusty Todo?",
        [
          "Tak, każdy błąd oznacza pierwsze uruchomienie",
          "Nie; zwraca StorageError::Io i nie zmienia pliku",
          "Tak, jeśli decode też zwraca błąd",
        ],
        "b",
        [
          "To zamaskowałoby problem i pozwoliło później nadpisać istniejące dane.",
          "read_to_string wymaga UTF-8. Jedynie NotFound oznacza brak dotychczasowego stanu.",
          "Dekoder nie otrzyma String, jeśli odczyt UTF-8 nie powiedzie się.",
        ],
        "prediction",
      ),
      run(
        "file-run",
        "Dotknij systemu plików",
        "Path jest pożyczonym widokiem ścieżki; Path::new nie otwiera ani nie tworzy pliku. PathBuf posiada ścieżkę, a join składa ją z nazwą. &file pożycza ścieżkę. fs::read_to_string zwraca Result<String, io::Error>, a fs::write tworzy lub zastępuje cały plik. Tutaj zapis jest bezpieczny dla przykładu, ponieważ create_dir najpierw tworzy nowy prywatny katalog ćwiczenia; ten wzorzec nie usprawiedliwia fs::write na istniejącym pliku z zadaniami. main zwraca Result<(), io::Error>, więc ? może propagować ten sam typ błędu; () oznacza brak wartości użytkowej. " +
          sandboxNote,
        fileRun,
        '"zażółć\\t🙂\\n"\n',
      ),
      choose(
        "file-explain",
        "explain",
        "Przeczytaj kolejność zapisu",
        "File::create_new tworzy nowy uchwyt albo zwraca błąd, jeśli ścieżka istnieje. `use std::io::Write` wprowadza standardowy trait udostępniający metodę write_all — nie piszemy własnego traitu ani funkcji generycznej. text.as_bytes() pożycza bajty UTF-8. write_all zapisuje wszystkie bajty lub zgłasza błąd, a sync_all próbuje zsynchronizować dane i metadane. Która kolejność chroni poprzedni plik?",
        [
          "Usuń cel → utwórz .tmp → zapisuj",
          "Otwórz cel przez File::create → zapisuj → sprawdź wynik",
          "Utwórz własny .tmp → write_all → sync_all → drop → rename",
        ],
        "c",
        [
          "Usunięcie celu tworzy moment, w którym nie istnieje żadna poprawna kopia.",
          "File::create ucina istniejący plik, zanim znasz wynik całego zapisu.",
          "Dopiero ostatni krok zastępuje cel. sync_all i rename mają ograniczenia zależne od platformy.",
        ],
      ),
      tested(
        "file-debug",
        "debug",
        "Przywróć prawdziwy odczyt i zapis",
        "Starter zgłasza sukces, choć nie dotyka systemu plików. Zaimplementuj load i save. Dostarczony kodek jest pełnym rozwiązaniem wcześniejszego zadania formatu Todo; pozostaw go bez zmian. Po obejrzeniu tego startera ponowne użycie kodeka jest praktyką z dostarczonym rozwiązaniem. std::fs::{self, File} skraca ścieżki nazw; do write_all potrzebujesz use std::io::Write. Opakowuj błędy za pomocą match, bez własnego From, unwrap, expect i closures. " +
          persistenceContract +
          " " +
          sandboxNote,
        storageStarter,
        storageSolution,
        persistenceTests("debug", "  żółć\\t🙂  "),
        "fix",
        storageHints,
        { code: todoCodecRefs, solution: todoCodecRefs },
      ),
      tested(
        "file-gate",
        "modify",
        "Zapisz notatnik z innym kontraktem",
        "Połącz gotowy kodek notatnika z plikami. Starter zawiera pełne rozwiązanie wcześniejszego zadania formatu notatnika; powrót do tego kodeka po obejrzeniu startera jest praktyką z dostarczonym rozwiązaniem. Publiczne funkcje i błędy są inne, a własny plik roboczy ma przyrostek .pending. Testy wymagają pełnego odczytu i zapisu, zachowania danych oraz wszystkich ścieżek błędów opisanych niżej. " +
          notebookStorageContract +
          " " +
          sandboxNote,
        notebookStorageStarter,
        notebookStorageSolution,
        notebookPersistenceTests,
        "transfer",
        [
          "Użyj open_notebook i save_notebook z NotebookStorageError; sam kod load/save dla Todo ma niewłaściwy kontrakt.",
          "Dopisz .pending do całej ścieżki. Zastany plik należy zachować, a cel zamieniać dopiero po write_all, sync_all i drop.",
        ],
        { code: notebookCodecRefs, solution: notebookCodecRefs },
      ),
      choose(
        "file-observe",
        "observe",
        "Zastany .tmp nie należy do ciebie",
        "Po przerwanym uruchomieniu przy celu leży plik .tmp. Nowe create_new odmawia utworzenia go. Co powinno zrobić save?",
        [
          "Zwrócić błąd i zachować oba zastane pliki",
          "Usunąć .tmp w dowolnej gałęzi Err i powtórzyć zapis",
          "Użyć File::create, aby ominąć konflikt",
        ],
        "a",
        [
          "Nie wiadomo, czy ten plik należy do innego procesu albo zawiera dane do odzyskania.",
          "Sprzątanie jest dozwolone tylko po udanym utworzeniu własnego pliku.",
          "File::create zniszczyłoby istniejącą zawartość tymczasową.",
        ],
      ),
      choose(
        "file-recall",
        "recall",
        "Oddziel gwarancję od ograniczenia",
        "Co wynika z tego kontraktu save?",
        [
          "Pełna odporność na odcięcie zasilania i jednoczesne edycje",
          "Brak błędów po sync_all",
          "Błąd zapisu przed udanym rename zachowuje poprzedni cel; współbieżność i pełna trwałość wymagają dalszego projektu",
        ],
        "c",
        [
          "Synchronizacja pliku nie jest pełnym protokołem trwałości całego katalogu ani blokadą cyklu odczyt–modyfikacja–zapis.",
          "Zamiana nazwy nadal może się nie udać, np. z powodu uprawnień lub złego celu.",
          "To jest dokładna granica obietnicy. Nie ogłaszamy bezpieczeństwa, którego nie przetestowaliśmy i nie zaprojektowaliśmy.",
        ],
        "recall",
      ),
    ],
    misconceptions: [
      "Każdy błąd load oznacza pustą listę.",
      "fs::write na celu zachowuje starą zawartość przy błędzie.",
      "Każdy plik .tmp można bezpiecznie usunąć.",
      "rename zapewnia transakcję dla dwóch autorów zmian.",
    ],
    transferTask:
      "Przenieś zapis do innego katalogu i odtwórz przypadek konfliktu z istniejącym plikiem tymczasowym.",
    evidenceGate:
      "Dwa pełne zestawy testów używają rzeczywistych plików i potwierdzają round trip oraz zachowanie danych na ścieżkach błędów.",
    sessionStops: [
      {
        afterStepId: "file-explain",
        title: "Zatrzymaj się po wyjaśnieniu pliku",
        nextGoal: "Sprawdź bramkę zapisu i odczytu.",
      },
      {
        afterStepId: "file-gate",
        title: "Zatrzymaj się po bramce pliku",
        nextGoal: "Obserwuj bezpieczne zastępowanie pliku.",
      },
    ],
    sourceIds: [
      "io-std-read",
      "io-std-file",
      "io-std-write",
      "io-std-rename",
      "io-std-path",
      "io-playground-boundary",
    ],
  },
  {
    id: "todo-terminal-cli",
    moduleId: "todo-io",
    conceptIds: ["io-terminal-boundary"],
    competencyIds: ["io-cli-orchestration"],
    prerequisites: ["todo-file-persistence"],
    title: "Todo CLI: od polecenia do potwierdzonego zapisu",
    subtitle:
      "Dostajesz parse_command, load, Todo::apply, save, AppError::{Command(CommandError), Storage(StorageError)} oraz execute(&str, &str) -> Result<String, AppError>; zmieniasz decyzję na parse przed I/O, reload przy każdym wywołaniu, zapis tylko po zmianie stanu i sukces dopiero po save.",
    minutes: 45,
    outcomes: [
      "Odtworzysz stan przy każdym poleceniu i potwierdzisz sukces dopiero po zapisie.",
      "Zachowasz rozróżnienie błędów domeny i magazynu bez ukrywania ich w pustym wyniku.",
      "Uruchomisz pobrany pakiet Cargo ze stdin, stdout, stderr i ponownym odczytem po restarcie.",
    ],
    steps: [
      choose(
        "cli-predict",
        "predict",
        "Pamięć zmieniona, zapis odrzucony",
        "Todo::apply zwróciło added 1, ale save zwraca błąd. Co zwraca execute?",
        [
          "Ok(added 1), bo zadanie istniało w pamięci",
          "Err(AppError::Storage(...))",
          "Ok z pustym String",
        ],
        "b",
        [
          "Wywołujący uznałby zmianę za zapisaną, choć następne uruchomienie jej nie zobaczy.",
          "Błąd trwałego zapisu jest wynikiem całego polecenia.",
          "Pusty sukces maskuje utratę operacji tak samo jak added 1.",
        ],
        "prediction",
      ),
      run(
        "cli-streams-run",
        "Rozdziel stdout i stderr",
        "Ten krótki przykład demonstruje wyłącznie dwa strumienie wyjściowe. println! kieruje wynik do stdout, a eprintln! kieruje diagnostykę do stderr. To nie jest wykonanie polecenia Todo ani dowód zapisu pliku. W docelowym CLI tekst sukcesu trafi do stdout dopiero po execute; błąd do stderr.",
        'fn main() {\n    println!("added 1");\n    eprintln!("error: InvalidId");\n}',
        "added 1\n",
      ),
      choose(
        "cli-explain",
        "explain",
        "Kto posiada stan między wywołaniami?",
        "execute kończy działanie i jego lokalny Todo znika. Skąd drugie wywołanie pozna wcześniejsze zadanie?",
        [
          "Z pliku ponownie odczytanego przez load",
          "Ze statycznego globalnego Vec w przeglądarce",
          "Z poprzedniego tekstu stdout",
        ],
        "a",
        [
          "Stan ma teraz wyraźną granicę trwałości: jest w pliku, więc każde wywołanie ładuje go od nowa.",
          "Globalny Vec nie stanowi trwałego magazynu i ominąłby test odczytu.",
          "stdout jest wynikiem dla użytkownika, a nie ukrytą bazą danych.",
        ],
      ),
      tested(
        "cli-debug",
        "debug",
        "Połącz granice bez fałszywych sukcesów",
        "Starter execute zawsze zwraca pusty sukces. Parser, Todo, kodek i pliki są już dostarczone; połącz je w odpowiedniej kolejności. Kodek oraz load/save są pełnymi rozwiązaniami wcześniejszych zadań formatu i plików Todo. Po obejrzeniu startera ponowne użycie tych komponentów jest praktyką z dostarczonym rozwiązaniem; samodzielne pozostaje połączenie granic w execute. Dopasowanie match &command pożycza polecenie, więc później nadal można przekazać je przez move do apply. Użyj konkretnych wariantów AppError, bez unwrap i expect. " +
          commandContract +
          " " +
          sandboxNote,
        appStarter,
        appSolution,
        commandTests("debug", "żółć\\t🙂"),
        "fix",
        appHints,
        { code: todoStorageRefs, solution: todoStorageRefs },
      ),
      tested(
        "cli-gate",
        "assessment",
        "Zbuduj granicę programu notatnika",
        "Klient zmienił domenę na notatki: note/archive/show, inne wyniki, format i przyrostek pliku roboczego. Zaimplementuj execute_note; dostarczone funkcje dziedzinowe i plikowe są poprawne. Kodek oraz open_notebook/save_notebook są pełnymi rozwiązaniami wcześniejszych zadań formatu i plików notatnika. Po obejrzeniu startera ponowne użycie tych komponentów jest praktyką z dostarczonym rozwiązaniem; samodzielne pozostaje execute_note. Testy obejmują ponowny odczyt, duplikaty, powtórne archiwizowanie, odczyt przy zajętym .pending oraz błędy przed i po zmianie pamięci. " +
          notebookCommandContract +
          " " +
          sandboxNote,
        notebookAppStarter,
        notebookAppSolution,
        notebookCommandTests,
        "assessment",
        [
          "Rozpoznaj Note i Archive jako operacje zapisujące; Show jest tylko odczytem.",
          "Zachowaj kolejność parser → open_notebook → apply → save_notebook → sukces, opakowując błędy w NotebookError.",
        ],
        { code: notebookStorageRefs, solution: notebookStorageRefs },
      ),
      choose(
        "cli-recall",
        "recall",
        "Co już udowodniły testy?",
        "Test dwukrotnie wywołał execute z tą samą ścieżką i zobaczył wcześniejsze zadanie. Co udowodnił?",
        [
          "Że przeglądarka obsługuje interaktywny terminal i trwałe pliki użytkownika",
          "Że wszystkie możliwe awarie dysku są obsłużone",
          "Że ta granica programu ponownie odczytuje zapisany stan w tym systemie plików",
        ],
        "c",
        [
          "Runner przyjmuje pojedynczy kod, bez interaktywnego stdin i trwałego workspace użytkownika.",
          "Test pokrywa konkretne ścieżki, nie wszystkie awarie sprzętu i systemu.",
          "To mocny, ale ograniczony dowód. Interfejs terminala wymaga próby rzeczywistego pakietu.",
        ],
        "recall",
      ),
      choose(
        "cli-input-boundary",
        "observe",
        "Przeczytaj pętlę stdin",
        "W pobranym CLI std::io::stdin().read_line(&mut line) dopisuje znaki do String i zachowuje końcową nową linię. Przed następną próbą trzeba wywołać line.clear(); Ok(0) oznacza EOF. Jaka jest poprawna decyzja po błędzie?",
        [
          "Błąd Command wypisz do stderr i kontynuuj; błąd odczytu lub Storage wypisz i zakończ niepowodzeniem",
          "Każdy błąd zastąp pustym String i zapisz plik",
          "Po EOF bez końca ponawiaj read_line",
        ],
        "a",
        [
          "Domena pozwala użytkownikowi poprawić polecenie. Awaria wejścia lub magazynu przerywa sesję, aby nie udawać sukcesu.",
          "To zgubi informację o problemie i może nadpisać stan.",
          "EOF kończy wejście; ponawianie bez końca tworzy pustą pętlę.",
        ],
      ),
      {
        id: "cli-local-practice",
        kind: "apply",
        title: "Uruchom pobrany pakiet Cargo",
        prompt:
          "Pobierz projekt Todo CLI z karty projektu i rozpakuj go. W jego katalogu uruchom cargo test, potem cargo run -- tasks.txt. Pakiet przyjmuje dokładnie jedną ścieżkę pliku jako argument, a następnie czyta polecenia ze stdin. Wpisz add żółć, done 1, list i quit. quit po trim oraz EOF kończą sesję sukcesem. Uruchom ponownie cargo run -- tasks.txt i sprawdź list. Błędna liczba argumentów lub ścieżka niebędąca UTF-8 daje błąd użycia. read_line dopisuje do bufora, dlatego pętla czyści String przed kolejną linią. Pomyłka w poleceniu wypisuje błąd do stderr i pozwala kontynuować; błąd odczytu lub magazynu kończy program niepowodzeniem. Czytaj README o zastanym .tmp, pojedynczym autorze zmian i ograniczeniu trwałości po awarii. Ten krok jest własnym sprawdzeniem uruchomionego pakietu; zaznaczenie listy nie jest automatycznym dowodem z przeglądarki.",
        evaluator: {
          kind: "rubric",
          criteria: [
            "cargo test kończy się powodzeniem w rozpakowanym pakiecie.",
            "Po zamknięciu i ponownym uruchomieniu list widzi wykonane zadanie.",
            "Błędne done 0 pokazuje diagnostykę; następne list nadal działa.",
            "Rozumiem, że wynik tego lokalnego uruchomienia nie jest weryfikowany przez runner przeglądarki.",
          ],
        },
        evidenceKind: "exposure",
      },
    ],
    misconceptions: [
      "Sukces apply oznacza już sukces zapisu.",
      "List powinno za każdym razem przepisywać plik.",
      "Test execute automatycznie dowodzi poprawności pętli stdin.",
      "Każdy błąd powinien być pokazany na stdout.",
    ],
    transferTask:
      "Uruchom pobrany pakiet w terminalu, przerwij sesję i sprawdź stan po restarcie; oddziel ten dowód od testów granicy execute.",
    evidenceGate:
      "Dwie alternatywy sprawdzają pełny kontrakt execute z rzeczywistymi plikami; lokalna lista kontrolna nie zastępuje tych testów.",
    sessionStops: [
      {
        afterStepId: "cli-explain",
        title: "Zatrzymaj się po wyjaśnieniu CLI",
        nextGoal: "Sprawdź bramkę wykonania komendy.",
      },
      {
        afterStepId: "cli-gate",
        title: "Zatrzymaj się po bramce CLI",
        nextGoal: "Przejdź do odczytu wejścia i lokalnej praktyki.",
      },
    ],
    sourceIds: ["io-std-stdin", "io-rust-stderr", "io-playground-boundary"],
  },
];

export const ioReviewExercises: Record<string, LessonStep> = {
  "io-format-roundtrip": {
    ...tested(
      "review-io-format",
      "modify",
      "Odtwórz format notatnika po przerwie",
      "Bez zerkania na wcześniejsze rozwiązanie przywróć pack i unpack. " +
        notebookFormatContract,
      notebookFormatStarter,
      notebookFormatSolution,
      notebookTestFormat(formatTests("  analiza|λ  ", "e\\u{301} / 🙂")),
      "transfer",
      formatHints,
      { solution: notebookCodecRefs },
    ),
    evidenceGate: false,
    evidence: { version: 1, conceptIds: ["io-format-roundtrip"] },
    evidenceKind: "recall",
  },
  "io-safe-persistence": {
    ...tested(
      "review-io-files",
      "modify",
      "Przywróć zapis notatnika",
      "Odtwórz odczyt i zapis na podstawie ich kontraktu. Starter dostarcza pełny kodek wcześniejszego zadania notatnika; powrót do tego kodeka po obejrzeniu startera jest praktyką z dostarczonym rozwiązaniem. " +
        notebookStorageContract +
        " " +
        sandboxNote,
      notebookStorageStarter,
      notebookStorageSolution,
      notebookTestFormat(persistenceTests("notebook-review", "  powtórka|Ω  ")),
      "transfer",
      storageHints,
      { code: notebookCodecRefs, solution: notebookStorageRefs },
    ),
    evidenceGate: false,
    evidence: { version: 1, conceptIds: ["io-safe-persistence"] },
    evidenceKind: "recall",
  },
  "io-terminal-boundary": {
    ...tested(
      "review-io-command",
      "modify",
      "Kiedy można potwierdzić notatkę?",
      "Odtwórz execute_note i granicę potwierdzenia zapisu. Starter dostarcza pełny kodek oraz odczyt/zapis wcześniejszych zadań notatnika; ich ponowne użycie po obejrzeniu startera jest praktyką z dostarczonym rozwiązaniem. " +
        notebookCommandContract +
        " " +
        sandboxNote,
      notebookAppStarter,
      notebookAppSolution,
      notebookCommandTests,
      "transfer",
      [
        "Pożycz NoteCommand, aby rozpoznać operację zapisującą przed przekazaniem jej do apply.",
        "Kolejność to parse_note → open_notebook → apply → ewentualne save_notebook → sukces; błędy opakuj w NotebookError.",
      ],
      {
        code: notebookStorageRefs,
        solution: [
          ...notebookStorageRefs,
          { lessonId: "todo-terminal-cli", stepId: "cli-gate" },
        ],
      },
    ),
    evidenceGate: false,
    evidence: { version: 1, conceptIds: ["io-terminal-boundary"] },
    evidenceKind: "recall",
  },
};

export const ioModule: CourseModule = {
  id: "todo-io",
  title: "Todo CLI: format, pliki i terminal",
  whyItMatters:
    "Stan projektu staje się danymi na dysku, a wynik polecenia musi uczciwie uwzględniać możliwy błąd zapisu.",
  capabilities: [
    "Odtwarzasz dokładny stan z wersjonowanego formatu.",
    "Zapisujesz prawdziwe pliki przez własny plik tymczasowy.",
    "Potwierdzasz sukces dopiero po zapisie i uruchamiasz pakiet w terminalu.",
  ],
  prerequisites: ["modules-cargo"],
  lessonIds: ioLessons.map((lesson) => lesson.id),
  exitGate: [
    "Format zachowuje tekst, status, kolejność i duplikaty oraz odrzuca uszkodzenie.",
    "Operacje plikowe odróżniają NotFound od awarii i zachowują zastane dane na błędach.",
    "Kolejne polecenia odczytują zapisany stan; błędy i List nie wywołują nieuprawnionego zapisu.",
  ],
  projectConnection:
    "Wieloplikowy pakiet Cargo dodaje do rdzenia Todo stdin, stdout, stderr i plik zachowany po zamknięciu procesu.",
  assessmentId: "todo-terminal-cli/cli-gate",
  gateCriteria: [
    {
      id: "io-format-gate",
      label: "Pełny round trip i odrzucenie niepoprawnego formatu.",
      taskRefs: [
        { lessonId: "todo-storage-format", stepId: "format-debug" },
        { lessonId: "todo-storage-format", stepId: "format-gate" },
      ],
    },
    {
      id: "io-persistence-gate",
      label:
        "Prawdziwy odczyt i zapis zachowujący poprzednie dane przy błędzie.",
      taskRefs: [
        { lessonId: "todo-file-persistence", stepId: "file-debug" },
        { lessonId: "todo-file-persistence", stepId: "file-gate" },
      ],
    },
    {
      id: "io-command-gate",
      label: "Powtórny odczyt stanu i sukces dopiero po zapisie.",
      taskRefs: [
        { lessonId: "todo-terminal-cli", stepId: "cli-debug" },
        { lessonId: "todo-terminal-cli", stepId: "cli-gate" },
      ],
    },
  ],
};
