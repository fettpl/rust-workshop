import type { LessonStep } from "../domain/types";

/** Separate authored contracts; the existing review families stay retrieval-only. */
export const functionOwnedCountRecovery: LessonStep = {
  id: "function-split-owned",
  kind: "debug",
  title: "Oddaj tekst razem z wynikiem odczytu",
  prompt:
    "Napraw granicę funkcji split_owned: ma przyjmować String i zwracać (String, usize). Zachowaj podane obliczenie liczby znaków i typowane wywołanie w main; popraw typ wejścia i wyniku. Funkcja przejmuje String, liczy jego znaki Unicode przez chars().count(), a następnie zwraca parę: ten sam tekst bez zmian oraz liczbę znaków. Wywołujący przejmuje parę jako let (text, count) = split_owned(text) i może ponownie użyć zwróconego właściciela. Spacje i końce linii też są znakami. Nie licz bajtów przez len() ani słów; żółw ma cztery znaki. To osobny kontrakt zwracania własności z wynikiem, bez dodawania wykrzyknika.",
  code: `fn split_owned(text: &String) -> (&String, usize) {
    let count = text.chars().count();
    (text, count)
}
fn main() {
    let text = String::from("żółw");
    let (owned, count): (String, usize) = split_owned(text);
    println!("{owned}: {count}");
}`,
  solution:
    "fn split_owned(text: String) -> (String, usize) {\n    let count = text.chars().count();\n    (text, count)\n}\nfn main() {}",
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn owned_input_returns_unchanged_with_unicode_scalar_count() {
    let split: fn(String) -> (String, usize) = split_owned;
    for (input, expected) in [("",0),("Rust",4),("żółw",4),("🦀",1),("a b\\n",4),("e\\u{301}",2)] {
        let (text,count) = split(input.into());
        assert_eq!(text,input); assert_eq!(count,expected,"{input:?}");
        let (again,recount) = split(text);
        assert_eq!(again,input); assert_eq!(recount,expected);
    }
}`,
  },
  expectedStatus: "compile-error",
  expectedError: "E0308",
  evidenceKind: "fix",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["function-ownership"],
    codingTaskId: "ownership/function-owned-count-v1",
  },
};

export const sharedCharacterCountRecovery: LessonStep = {
  id: "shared-character-count",
  kind: "debug",
  title: "Odczytaj liczbę znaków przez widok",
  prompt:
    "Napraw granicę character_count, aby przyjmowała &str. Zachowaj podane ciało text.chars().count() oraz wywołanie z &text; nie kopiuj właściciela. Odczytaj liczbę znaków Unicode przez text.chars().count(), zachowując właściciela String do kolejnych wywołań. Pusty tekst daje 0; spacje, tabulatory i końce linii też liczą się jako znaki. Nie używaj len() jako liczby znaków, bo liczy bajty. Sekwencja e i osobny akcent łączący to dwa znaki Unicode. Funkcja przyjmuje zarówno literal, cały String po pożyczeniu, jak i widok jego części. Nie dzieli tekstu na słowa i nie sprawdza końcówki.",
  code: `fn character_count(text: String) -> usize { text.chars().count() }
fn main() {
    let text = String::from("żółw");
    let count = character_count(&text);
    println!("{text}: {count}");
}`,
  solution:
    "fn character_count(text: &str) -> usize { text.chars().count() }\nfn main() {}",
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn counts_unicode_scalars_without_consuming_the_owner() {
    let count: fn(&str) -> usize = character_count;
    for (text,expected) in [("",0),("a b",3),("żółw",4),("🦀",1),("\\t\\n",2),("e\\u{301}",2)] {
        let owner=String::from(text);
        let first=&owner[..]; let second=&owner[..];
        assert_eq!(count(first),expected); assert_eq!(count(second),expected);
        assert_eq!(owner,text);
    }
    let owner=String::from("xżółw!");
    assert_eq!(count(&owner[1..owner.len()-1]),4);
    assert_eq!(owner,"xżółw!");
}`,
  },
  expectedStatus: "compile-error",
  expectedError: "E0308",
  evidenceKind: "fix",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["shared-borrow"],
    codingTaskId: "ownership/shared-character-count-v1",
  },
};

export const documentationKeyedSettingRecovery: LessonStep = {
  id: "docs-keyed-setting",
  kind: "apply",
  title: "Wybierz wartość dokładnie wskazanego klucza",
  prompt:
    "Odczytaj migawkę split_once z tej lekcji i napisz fn setting_value<'a>(text: &'a str, key: &str) -> Option<&'a str>. Zapis 'a wskazuje, że wynik pożycza text; nie pożycza krócej żyjącego key. Podziel text przy pierwszym = i zwróć prawą część tylko wtedy, gdy lewa część jest dokładnie równa niepustemu key. Pusty key, brak separatora lub inny klucz dają None. Poprawny klucz i pusty wynik dają Some(\"\"). Zachowaj dalsze =, Unicode i odstępy bez trim. Wynik ma być widokiem text, bez kopiowania; oba właściciele pozostają dostępni. To kontrakt wyboru według klucza, dodatkowo odrzucający pusty klucz; samo zwrócenie obu części nie spełnia zadania.",
  code: "fn setting_value<'a>(_text: &'a str, _key: &str) -> Option<&'a str> { None }\nfn main() {}",
  solution:
    "fn setting_value<'a>(text: &'a str, key: &str) -> Option<&'a str> {\n    if key.is_empty() { return None; }\n    let (actual, value) = text.split_once('=')?;\n    if actual == key { Some(value) } else { None }\n}\nfn main() {}",
  evaluator: {
    kind: "tests",
    tests: `#[test]
fn selected_key_distinguishes_missing_empty_and_exact_borrowed_value() {
    let select: for<'a,'b> fn(&'a str,&'b str)->Option<&'a str> = setting_value;
    for (text,key,want) in [("","x",None),("plain","plain",None),("=value","",None),("=","",None),("k=","k",Some("")),("k=a=b","k",Some("a=b")),("k=a=b","a",None),("Key=v","key",None),(" key = value "," key ",Some(" value ")),(" key =v","key",None),("żółw=🦀=x","żółw",Some("🦀=x"))] {
        let owner=String::from(text); let key_owner=String::from(key);
        let result=select(&owner,&key_owner);
        assert_eq!(result,want,"{text:?}/{key:?}");
        if let Some(value)=result {assert_eq!(value.as_ptr(),owner.as_bytes()[key.len()+1..].as_ptr())}
        assert_eq!(owner,text); assert_eq!(key_owner,key);
    }
    let owner=String::from("żółw= 🦀 ");
    let value={ let key=String::from("żółw"); select(&owner,&key) };
    assert_eq!(value,Some(" 🦀 "));
}`,
  },
  expectedStatus: "success",
  evidenceKind: "transfer",
  evidenceGate: true,
  evidence: {
    version: 1,
    conceptIds: ["documentation-guided-repair"],
    codingTaskId: "docs/keyed-setting",
  },
};
