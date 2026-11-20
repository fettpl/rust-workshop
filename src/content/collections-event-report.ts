import type { LessonStep } from "@/domain/types";

const signature = "fn sprawdz(raport: fn(&[&str]) -> Vec<(String, usize)>)";
const regression = `#[test]
fn moja_regresja() {
    sprawdz(raport_awarii);
}`;

// The oracle runs independently of the learner's two implementations.
const firstSeen = `fn pierwsze_wystapienia(zdarzenia: &[&str]) -> Vec<(String, usize)> {
    let mut wiersze: Vec<(String, usize)> = Vec::new();
    for &nazwa in zdarzenia {
        if let Some(wiersz) = wiersze.iter_mut().find(|wiersz| wiersz.0 == nazwa) {
            wiersz.1 += 1;
        } else {
            wiersze.push((nazwa.to_string(), 1));
        }
    }
    wiersze
}`;

export const eventReport: LessonStep = {
  id: "events-report-regression",
  kind: "apply",
  title: "Zaprojektuj dwa raporty z dziennika zdarzeń",
  prompt: `1. Czujnik przesyła nazwy zdarzeń. W funkcji \`raport_nazw\` zwróć po jednym wierszu (nazwa, liczba wystąpień), rosnąco według nazw w porządku napisów Rust. Nazwy porównuj dokładnie, z uwzględnieniem wielkości liter. Pusty napis też jest nazwą. Z pustego dziennika powstaje pusty raport. Typ wyniku określa, co otrzymuje operator. Sam wybierz strukturę do zliczania. W notatce zapisz, jak odszukujesz powracającą nazwę i jaki jest koszt tego wyboru.

2. Po awarii operator potrzebuje drugiego widoku. Funkcja \`raport_awarii\` ma zwrócić te same wiersze i liczniki w kolejności pierwszego wystąpienia nazw. Powtórzenie zmienia licznik, a pozycja wiersza zostaje ta sama. Zachowaj działanie \`raport_nazw\`. Czy Twoja struktura pamięta obie potrzebne informacje? Możesz zmienić ją lub współdzielić kod między funkcjami.

3. Napisz treść własnego testu regresji w funkcji \`sprawdz\`. Parametr \`raport\` wywołujesz jak zwykłą funkcję. Dobierz własny dziennik, w którym kolejność pierwszych wystąpień różni się od porządku nazw, a co najmniej jedna nazwa powraca. Wylicz oczekiwane wiersze i porównaj cały wynik przez \`assert_eq!\`. W starterze test \`moja_regresja\` uruchamia Twoje sprawdzenie na \`raport_awarii\`. Kurs uruchomi je także na poprawnym raporcie i na dwóch wadliwych wersjach. Pierwsza sortuje wiersze, druga zwraca licznik 1 dla każdej nazwy. Twój test powinien wykryć obie usterki.

Możesz uruchamiać testy po każdej części. Aby wrócić do własnego przykładu poza kursem, utwórz pakiet poleceniem \`cargo new --lib raport_zdarzen\`, wklej swój kod do \`src/lib.rs\` i uruchom \`cargo test\` w katalogu pakietu.`,
  code: `fn raport_nazw(zdarzenia: &[&str]) -> Vec<(String, usize)> {
    todo!()
}

fn raport_awarii(zdarzenia: &[&str]) -> Vec<(String, usize)> {
    todo!()
}

${signature} {
    // Tu dobierz dane i napisz własną asercję.
}

${regression}`,
  solution: `${firstSeen}

fn raport_nazw(zdarzenia: &[&str]) -> Vec<(String, usize)> {
    let mut wiersze = pierwsze_wystapienia(zdarzenia);
    wiersze.sort();
    wiersze
}

fn raport_awarii(zdarzenia: &[&str]) -> Vec<(String, usize)> {
    pierwsze_wystapienia(zdarzenia)
}

${signature} {
    let wynik = raport(&["zanik", "alarm", "zanik", "zanik"]);
    assert_eq!(wynik, vec![("zanik".to_string(), 3), ("alarm".to_string(), 1)]);
}

${regression}`,
  evaluator: {
    kind: "tests",
    tests: `${firstSeen}

#[test]
fn raport_w_porzadku_nazw() {
    assert_eq!(raport_nazw(&[]), vec![]);
    assert_eq!(raport_nazw(&["", "", ""]), vec![(String::new(), 3)]);
    assert_eq!(raport_nazw(&["żar", "A", "żar", "", "a", "A", "A"]),
        vec![(String::new(), 1), ("A".to_string(), 3), ("a".to_string(), 1), ("żar".to_string(), 2)]);
}

#[test]
fn raport_w_porzadku_pierwszych_wystapien() {
    assert_eq!(raport_awarii(&[]), vec![]);
    assert_eq!(raport_awarii(&["", "", ""]), vec![(String::new(), 3)]);
    assert_eq!(raport_awarii(&["żar", "A", "", "a", "A", "żar", "A"]),
        vec![("żar".to_string(), 2), ("A".to_string(), 3), (String::new(), 1), ("a".to_string(), 1)]);
    assert_eq!(raport_awarii(&["A", "", "żar", "A"]),
        vec![("A".to_string(), 2), (String::new(), 1), ("żar".to_string(), 1)]);
}

#[test]
fn test_kursanta_przyjmuje_poprawny_raport() {
    sprawdz(pierwsze_wystapienia);
}

#[test]
fn test_kursanta_wykrywa_sortowanie() {
    let wynik = std::panic::catch_unwind(|| sprawdz(|zdarzenia| {
        let mut wiersze = pierwsze_wystapienia(zdarzenia);
        wiersze.sort();
        wiersze
    }));
    assert!(wynik.is_err(), "Dobierz nazwy, dla których sortowanie zmienia kolejność wierszy.");
}

#[test]
fn test_kursanta_wykrywa_zgubione_powtorzenia() {
    let wynik = std::panic::catch_unwind(|| sprawdz(|zdarzenia| {
        let mut wiersze = pierwsze_wystapienia(zdarzenia);
        for wiersz in &mut wiersze { wiersz.1 = 1; }
        wiersze
    }));
    assert!(wynik.is_err(), "Dodaj powtórzenie i sprawdź oczekiwany licznik.");
}`,
  },
  expectedStatus: "success",
  evidenceKind: "transfer",
};
