// Original Polish prompts are CC BY 4.0. Executable Rust examples are MIT.
import type { LessonStep } from "../domain/types";

export const lengthPrefixedTexts: LessonStep = {
  id: "format-length-prefixed-texts",
  kind: "blank",
  title: "Zapisz pola tekstowe z długością w bajtach",
  prompt:
    "Zaimplementuj `fn pack_texts(items: &[String]) -> String` oraz `fn unpack_texts(input: &str) -> Option<Vec<String>>`. Zapisz każde pole jako liczbę bajtów UTF-8, dwukropek i treść. Pola następują bez separatora. Przykład: [„”, „ą”, „:”] daje `0:2:ą1::`. Pusta lista daje pusty napis. Zachowaj kolejność, spacje i znaki nowej linii. Nagłówek musi zawierać cyfry ASCII bez znaku i bez zer wiodących (poza samym 0). Jeśli choć jedno pole jest ucięte, długość przekracza usize, granica wypada wewnątrz znaku lub na końcu pozostają niepoprawne dane, zwróć None dla całego wejścia.",
  solution: `fn pack_texts(items: &[String]) -> String {
    let mut output = String::new();
    for item in items {
        output.push_str(&item.len().to_string());
        output.push(':');
        output.push_str(item);
    }
    output
}

fn unpack_texts(mut input: &str) -> Option<Vec<String>> {
    let mut items = Vec::new();
    while !input.is_empty() {
        let (header, rest) = input.split_once(':')?;
        if !header.bytes().all(|b| b.is_ascii_digit()) || (header.len() > 1 && header.starts_with('0')) {
            return None;
        }
        let n = header.parse::<usize>().ok()?;
        items.push(rest.get(..n)?.to_owned());
        input = rest.get(n..)?;
    }
    Some(items)
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn preserves_exact_byte_lengths_and_list_boundaries() {
    let items = vec![String::new(), "ą".to_string(), ":".to_string(), " x\\r\\n🙂 ".to_string()];
    let encoded = "0:2:ą1::9: x\\r\\n🙂 ";
    assert_eq!(pack_texts(&items), encoded);
    assert_eq!(unpack_texts(encoded), Some(items));
    assert_eq!(pack_texts(&[]), "");
    assert_eq!(unpack_texts(""), Some(vec![]));
    let long = "a:".repeat(64);
    assert_eq!(pack_texts(&[long.clone()]), format!("128:{long}"));
    assert_eq!(unpack_texts(&format!("128:{long}0:")), Some(vec![long, String::new()]));
}
#[test]
fn rejects_the_entire_stream_on_a_bad_field() {
    for bad in [":", "00:", "01:a", "+1:a", "-1:a", "١:a", " 1:a", "3:ab", "1:ą", "1:a!", "999999999999999999999999999999:a"] {
        assert_eq!(unpack_texts(bad), None, "{bad:?}");
        assert_eq!(unpack_texts(&format!("2:ok{bad}")), None, "{bad:?}");
    }
}`,
  },
  expectedStatus: "success",
  evidenceKind: "transfer",
  evidenceGate: true,
  hints: [
    "Długość napisu w bajtach zwraca str::len. Treść może zawierać dowolnie wiele dwukropków.",
    "Najpierw przeczytaj nagłówek jednego pola. Metoda str::get sprawdza zarazem rozmiar i granicę znaku UTF-8.",
  ],
};

export const replaceCurrentFile: LessonStep = {
  id: "file-replace-current-text",
  kind: "blank",
  title: "Zapisz poprawkę tylko dla odczytanej wersji",
  prompt:
    "Edytor zna poprzedni tekst pliku. Napisz `fn replace_current(path: &std::path::Path, expected: &str, replacement: &str) -> std::io::Result<bool>`. Odczytaj cały plik jako UTF-8. Różnica względem expected, nawet w końcowej spacji, daje Ok(false) bez dotykania pliku roboczego. Przy zgodności zapisz replacement pod nazwą oryginału z dopiskiem .pending (np. notes.txt.pending), tworząc nowy plik wyłącznie dla tej próby. Następnie zastąp oryginał przez rename i zwróć Ok(true). Zastany .pending powoduje błąd AlreadyExists i ma pozostać bez zmian. Brak oryginału daje NotFound. Czytelnik, który otworzył poprzednią wersję przed rename, nadal odczyta starą treść. Przy błędzie zwróć błąd I/O, zachowaj oryginał i posprzątaj tylko własny plik roboczy. Zakładamy jednego zapisującego i zwykłe pliki w jednym katalogu. Nie musisz obsługiwać zapisu współbieżnego ani awarii zasilania.",
  solution: `fn replace_current(path: &std::path::Path, expected: &str, replacement: &str) -> std::io::Result<bool> {
    use std::{fs, io::Write, path::PathBuf};
    if fs::read_to_string(path)? != expected {
        return Ok(false);
    }
    let mut name = path.as_os_str().to_owned();
    name.push(".pending");
    let pending = PathBuf::from(name);
    let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&pending)?;
    let written = file.write_all(replacement.as_bytes());
    drop(file);
    if let Err(error) = written.and_then(|_| fs::rename(&pending, path)) {
        let _ = fs::remove_file(&pending);
        return Err(error);
    }
    Ok(true)
}`,
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn updates_only_the_expected_version_and_respects_existing_files() {
    use std::fs;
    use std::io::{ErrorKind, Read};
    let dir = std::env::temp_dir().join(format!("workshop-edit-{}", std::process::id()));
    fs::create_dir(&dir).unwrap();
    let path = dir.join("notatki.txt");
    let pending = dir.join("notatki.txt.pending");
    let old = "żółć \\n";
    let new = "🙂\\nnowy";
    assert_eq!(replace_current(&path, "", new).unwrap_err().kind(), ErrorKind::NotFound);
    assert!(!path.exists() && !pending.exists());
    fs::write(&path, old).unwrap();
    fs::write(&pending, "cudza kopia").unwrap();
    assert!(!replace_current(&path, old.trim_end(), new).unwrap());
    assert_eq!(fs::read_to_string(&path).unwrap(), old);
    assert_eq!(replace_current(&path, old, new).unwrap_err().kind(), ErrorKind::AlreadyExists);
    assert_eq!(fs::read_to_string(&pending).unwrap(), "cudza kopia");
    assert_eq!(fs::read_to_string(&path).unwrap(), old);
    fs::remove_file(&pending).unwrap();
    let mut previous = fs::File::open(&path).unwrap();
    assert!(replace_current(&path, old, new).unwrap());
    let mut saved = String::new();
    previous.read_to_string(&mut saved).unwrap();
    assert_eq!(saved, old);
    drop(previous);
    assert_eq!(fs::read_to_string(&path).unwrap(), new);
    assert!(!pending.exists());
    assert!(!replace_current(&path, old, "").unwrap());
    assert_eq!(fs::read_to_string(&path).unwrap(), new);
    assert!(replace_current(&path, new, "").unwrap());
    assert_eq!(fs::read(&path).unwrap(), b"");
    fs::write(&path, [0xff]).unwrap();
    assert!(replace_current(&path, "", new).is_err());
    assert_eq!(fs::read(&path).unwrap(), [0xff]);
    assert!(!pending.exists());
    fs::remove_dir_all(dir).unwrap();
}`,
  },
  expectedStatus: "success",
  evidenceKind: "transfer",
  evidenceGate: true,
  hints: [
    "Porównaj dokładną odczytaną treść z expected przed otwarciem .pending. Brak pliku i błąd dekodowania są błędami odczytu.",
    "create_new odmawia nadpisania cudzej kopii. Po udanym utworzeniu jesteś właścicielem pliku roboczego aż do rename lub sprzątania.",
  ],
};
