import type { LessonStep } from "@/domain/types";

export const importTodoCommand: LessonStep = {
  id: "todo-import-command",
  kind: "blank",
  title: "Zaimportuj rekord polecenia Todo",
  prompt:
    "Drugi klient zapisuje polecenia w rekordach rozdzielonych pierwszym tabulatorem. Zdefiniuj porównywalne przez PartialEq i wypisywalne przez Debug enumy ImportOp { Add(String), Done(usize), List } oraz ImportError { Empty, Unknown, Title, Id }. Napisz fn decode_record(line: &str) -> Result<ImportOp, ImportError>. Linia złożona z białych znaków daje Empty. Bez przycinania znacznika rozpoznaj +, ! oraz ?. Zwykła spacja nie rozdziela pól. Brak tabulatora oznacza pusty argument. Dla + przytnij brzegi argumentu, zachowaj wnętrze i zwróć własny tytuł. Pusty tytuł lub CR/LF po przycięciu daje Title. Dla ! akceptuj po przycięciu tylko dodatnie usize z cyfr ASCII, włącznie z zerami wiodącymi. Każdy inny argument daje Id. ? bez argumentu albo z samymi białymi znakami daje List, w pozostałych przypadkach Unknown. Nieznany znacznik także daje Unknown.",
  solution: `#[derive(Debug, PartialEq)]
enum ImportOp {
    Add(String),
    Done(usize),
    List,
}
#[derive(Debug, PartialEq)]
enum ImportError {
    Empty,
    Unknown,
    Title,
    Id,
}

fn decode_record(line: &str) -> Result<ImportOp, ImportError> {
    if line.trim().is_empty() {
        return Err(ImportError::Empty);
    }
    let (tag, field) = line.split_once('\\t').unwrap_or((line, ""));
    let value = field.trim();
    match tag {
        "+" if !value.is_empty() && !value.contains(['\\r', '\\n']) => {
            Ok(ImportOp::Add(value.to_owned()))
        }
        "+" => Err(ImportError::Title),
        "!" if value.bytes().all(|b| b.is_ascii_digit()) => value
            .parse::<usize>()
            .ok()
            .filter(|id| *id > 0)
            .map(ImportOp::Done)
            .ok_or(ImportError::Id),
        "!" => Err(ImportError::Id),
        "?" if value.is_empty() => Ok(ImportOp::List),
        _ => Err(ImportError::Unknown),
    }
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn preserves_owned_text_and_distinguishes_record_boundaries() {
    let op = {
        let text = String::from("+\\t  żółć  x\\ty  ");
        decode_record(&text)
    };
    assert_eq!(op, Ok(ImportOp::Add(String::from("żółć  x\\ty"))));
    for line in ["+", "+\\t ", "+\\tx\\ny", "+\\tx\\ry"] {
        assert_eq!(decode_record(line), Err(ImportError::Title));
    }
    for line in ["?", "?\\t  "] {
        assert_eq!(decode_record(line), Ok(ImportOp::List));
    }
    for line in ["?\\tx", "+ title", " +\\tx", "x"] {
        assert_eq!(decode_record(line), Err(ImportError::Unknown));
    }
    for line in ["", "  \\t "] {
        assert_eq!(decode_record(line), Err(ImportError::Empty));
    }
}
#[test]
fn checks_the_entire_numeric_field() {
    assert_eq!(decode_record("!\\t 003 "), Ok(ImportOp::Done(3)));
    assert_eq!(
        decode_record(&format!("!\\t{}", usize::MAX)),
        Ok(ImportOp::Done(usize::MAX))
    );
    for line in ["!", "!\\t0", "!\\t+3", "!\\t-2", "!\\t٣", "!\\t3x"] {
        assert_eq!(decode_record(line), Err(ImportError::Id));
    }
    assert_eq!(
        decode_record(&format!("!\\t{}0", usize::MAX)),
        Err(ImportError::Id)
    );
}`,
  },
  hints: [
    "Oddziel pierwsze pole przed przycięciem argumentu.",
    "Sprawdź cyfry, zakres usize i zero jako trzy osobne warunki.",
  ],
  evidenceKind: "assessment",
  evidenceGate: true,
};

export const editTodoBoard: LessonStep = {
  id: "todo-board-edits",
  kind: "blank",
  title: "Zastosuj grupową edycję tablicy",
  prompt:
    "Klient przekazuje tablicę jako &mut Vec<(String, bool)> w kolejności dodania. Napisz enum Edit<'a> { Add(&'a str), Finish(&'a [usize]), List } oraz fn edit_board(board: &mut Vec<(String, bool)>, edit: Edit<'_>) -> Result<String, &'static str>. Add odrzuca pusty po trim tytuł lub CR/LF błędem `title`. Poprawny tekst zachowuje dokładnie, dopisuje z false i zwraca `added N` z numeracją od 1. Finish ma być atomowe. Sprawdź wszystkie numery od lewej do prawej przed pierwszą zmianą. Pierwsze zero daje `id`, dodatni numer poza listą daje `missing`. Przy sukcesie oznacz wszystkie wskazane wpisy i zwróć `done K`, gdzie K to liczba podanych numerów łącznie z powtórzeniami. List zwraca całą tablicę w formacie `N [ ] tytuł\\n` lub `N [x] tytuł\\n`, łącznie z ostatnim znakiem nowej linii. Pusta lista daje pusty String.",
  solution: `enum Edit<'a> {
    Add(&'a str),
    Finish(&'a [usize]),
    List,
}

fn edit_board(board: &mut Vec<(String, bool)>, edit: Edit<'_>) -> Result<String, &'static str> {
    match edit {
        Edit::Add(title) => {
            if title.trim().is_empty() || title.contains(['\\r', '\\n']) {
                return Err("title");
            }
            board.push((title.to_owned(), false));
            Ok(format!("added {}", board.len()))
        }
        Edit::Finish(ids) => {
            for &id in ids {
                if id == 0 {
                    return Err("id");
                }
                if id > board.len() {
                    return Err("missing");
                }
            }
            for &id in ids {
                board[id - 1].1 = true;
            }
            Ok(format!("done {}", ids.len()))
        }
        Edit::List => Ok(board
            .iter()
            .enumerate()
            .map(|(i, (s, done))| format!("{} [{}] {}\\n", i + 1, if *done { "x" } else { " " }, s))
            .collect()),
    }
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn validates_edits_before_changing_the_board() {
    let mut b = vec![];
    assert_eq!(edit_board(&mut b, Edit::List).unwrap(), "");
    for bad in ["  ", "a\\nb", "a\\r"] {
        assert_eq!(edit_board(&mut b, Edit::Add(bad)), Err("title"));
    }
    for (i, title) in [" żółć ", "a", "a"].iter().enumerate() {
        assert_eq!(
            edit_board(&mut b, Edit::Add(title)).unwrap(),
            format!("added {}", i + 1)
        );
    }
    let saved = b.clone();
    for (ids, error) in [(&[2, 4, 0][..], "missing"), (&[1, 0, 4][..], "id")] {
        assert_eq!(edit_board(&mut b, Edit::Finish(ids)), Err(error));
        assert_eq!(b, saved);
    }
    assert_eq!(edit_board(&mut b, Edit::Finish(&[])).unwrap(), "done 0");
    assert_eq!(
        edit_board(&mut b, Edit::Finish(&[3, 1, 3])).unwrap(),
        "done 3"
    );
    assert_eq!(edit_board(&mut b, Edit::Finish(&[1])).unwrap(), "done 1");
    assert_eq!(
        edit_board(&mut b, Edit::List).unwrap(),
        "1 [x]  żółć \\n2 [ ] a\\n3 [x] a\\n"
    );
}`,
  },
  hints: [
    "Sprawdź całą listę identyfikatorów, zanim zaczniesz je wykonywać.",
    "Przy wyświetlaniu źródłem numeru jest pozycja wpisu.",
  ],
  evidenceKind: "assessment",
  evidenceGate: true,
};

export const replayTodoSession: LessonStep = {
  id: "todo-session-replay",
  kind: "blank",
  title: "Rozlicz sesję importu",
  prompt:
    "Import ma wskazywać pozycję błędnego rekordu. Zaimplementuj porównywalny przez PartialEq i wypisywalny przez Debug enum Batch { Every(Vec<Result<String, (usize, String)>>), Strict(Result<String, (usize, String)>) } i funkcję fn replay(lines: &[&str], strict: bool, apply: fn(&mut Vec<String>, &str) -> Result<String, String>) -> Batch. Każde wywołanie zaczyna z pustym Vec<String>. Przekaż ten sam lokalny stan i niezmienioną kolejną linię do apply dokładnie raz. W trybie Every zwróć po jednym wyniku w kolejności, także po błędach. Zachowaj zmiany wprowadzone przez apply również wtedy, gdy zapisuje coś w stanie i zwraca Err. W trybie Strict zatrzymaj wykonywanie na pierwszym Err, a przy samych sukcesach zwróć ostatni tekst lub pusty String dla pustego wejścia. W obu trybach Err zawiera numer linii liczony od 1 i dokładny tekst błędu. Funkcję apply przekazuje klient. Nie implementuj ponownie parsera.",
  solution: `#[derive(Debug, PartialEq)]
enum Batch {
    Every(Vec<Result<String, (usize, String)>>),
    Strict(Result<String, (usize, String)>),
}

fn replay(
    lines: &[&str],
    strict: bool,
    apply: fn(&mut Vec<String>, &str) -> Result<String, String>,
) -> Batch {
    let mut board = Vec::new();
    let results = lines
        .iter()
        .enumerate()
        .map(|(i, line)| apply(&mut board, line).map_err(|e| (i + 1, e)));
    if strict {
        let mut last = String::new();
        for result in results {
            match result {
                Ok(value) => last = value,
                Err(error) => return Batch::Strict(Err(error)),
            }
        }
        Batch::Strict(Ok(last))
    } else {
        Batch::Every(results.collect())
    }
}`,
  evaluator: {
    kind: "tests",
    tests: `fn import_line(board: &mut Vec<String>, line: &str) -> Result<String, String> {
    match line {
        "?" => Ok(board.join("/")),
        "!" => Err(String::from("błąd 🙂")),
        "missing" => Err(String::from("brak wpisu")),
        "must not run" => panic!("processed a line after the first error"),
        s => {
            board.push(s.to_owned());
            Ok(format!("saved {}", board.len()))
        }
    }
}
#[test]
fn reports_each_line_and_preserves_fresh_local_state() {
    assert_eq!(
        replay(&[" α ", "!", "b", "missing", "?"], false, import_line),
        Batch::Every(vec![
            Ok("saved 1".into()),
            Err((2, "błąd 🙂".into())),
            Ok("saved 2".into()),
            Err((4, "brak wpisu".into())),
            Ok(" α /b".into())
        ])
    );
    assert_eq!(
        replay(&["?"], false, import_line),
        Batch::Every(vec![Ok(String::new())])
    );
    assert_eq!(replay(&[], false, import_line), Batch::Every(vec![]));
}
#[test]
fn preserves_side_effects_on_error_and_calls_each_operation_once() {
    use std::cell::Cell;
    thread_local! { static CALLS: Cell<usize> = const { Cell::new(0) }; }
    fn audit(board: &mut Vec<String>, line: &str) -> Result<String, String> {
        CALLS.with(|n| n.set(n.get() + 1));
        if line == "fail" {
            board.push("attempted".into());
            Err("declined".into())
        } else {
            Ok(board.join("/"))
        }
    }
    assert_eq!(replay(&["fail", "read"], false, audit), Batch::Every(vec![
        Err((1, "declined".into())), Ok("attempted".into())]));
    assert_eq!(CALLS.with(Cell::get), 2);
    assert_eq!(replay(&["read", "fail", "after"], true, audit), Batch::Strict(Err((2, "declined".into()))));
    assert_eq!(CALLS.with(Cell::get), 4);
}
#[test]
fn stops_on_the_first_error_and_returns_the_last_success() {
    assert_eq!(
        replay(&["a", "missing", "must not run"], true, import_line),
        Batch::Strict(Err((2, "brak wpisu".into())))
    );
    assert_eq!(
        replay(&["!", "must not run"], true, import_line),
        Batch::Strict(Err((1, "błąd 🙂".into())))
    );
    assert_eq!(
        replay(&["a", "b", "?"], true, import_line),
        Batch::Strict(Ok("a/b".into()))
    );
    assert_eq!(
        replay(&[], true, import_line),
        Batch::Strict(Ok(String::new()))
    );
}`,
  },
  hints: [
    "enumerate daje indeks od zera. Numer błędu użytkownika zaczyna się od jedynki.",
    "W trybie ścisłym zakończ pracę przed wywołaniem apply dla następnego rekordu.",
  ],
  evidenceKind: "assessment",
  evidenceGate: true,
};
