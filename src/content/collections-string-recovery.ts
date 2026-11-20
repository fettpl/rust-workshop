import type { LessonStep } from "@/domain/types";

/** Fresh contracts retain the scalar-counting and complete-text mutation boundaries. */
export const stringRecoverySteps: LessonStep[] = [
  {
    id: "string-scalar-frequency-transfer",
    kind: "apply",
    title: "Policz wystąpienia wybranej wartości char",
    prompt:
      "Napisz `fn scalar_frequency(text: &str, target: char) -> usize`. Policz tylko wartości zwracane przez `chars()`, które są równe target. Pusty tekst i brak target dają 0. Licz każde wystąpienie osobno; emoji i litery wielobajtowe też liczą się po jednym. Akcent łączący jest osobną wartością char: dla `e\\u{301}e` i target `e` wynikiem jest 2, a dla target `\\u{301}` — 1. Nie normalizuj tekstu ani nie licz grafemów.",
    code: `fn scalar_frequency(text: &str, target: char) -> usize {
    0
}`,
    solution: `fn scalar_frequency(text: &str, target: char) -> usize {
    let mut count = 0;
    for scalar in text.chars() {
        if scalar == target {
            count += 1;
        }
    }
    count
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test] fn counts_only_matching_unicode_scalars() {
    for (text, target, count) in [
        ("", 'x', 0), ("banana", 'a', 3), ("banana", 'z', 0),
        ("żółćż", 'ż', 2), ("🙂a🙂", '🙂', 2),
        ("e\\u{301}e", 'e', 2), ("e\\u{301}e", '\\u{301}', 1),
        ("é", '\\u{301}', 0), ("a a", ' ', 1),
    ] { assert_eq!(scalar_frequency(text, target), count, "{text:?} / {target:?}"); }
}`,
    },
    evidenceKind: "transfer",
    evidenceGate: true,
    expectedStatus: "success",
    hints: [
      "Przejdź pętlą po text.chars() i porównaj każdą wartość z target.",
      "Zwiększ licznik tylko przy równości; nie sumuj długości UTF-8 pasujących wartości.",
    ],
  },
  {
    id: "string-joined-parts-transfer",
    kind: "apply",
    title: "Dołącz części z separatorem między nimi",
    prompt:
      'Napisz `fn append_joined(text: &mut String, parts: &[&str], separator: &str)`. Zachowaj dotychczasowy text i dopisz wszystkie pożyczone części w kolejności, wstawiając cały separator wyłącznie między częściami z parts. Nie wstawiaj go między starym text a pierwszą częścią ani po ostatniej. Pusta lista nic nie zmienia. Puste części nadal zajmują miejsce: dla text `start:`, parts `["", "ż", ""]` i separator `🙂` wynikiem jest `start:🙂ż🙂`. Nie usuwaj spacji ani fragmentów UTF-8.',
    code: `fn append_joined(text: &mut String, parts: &[&str], separator: &str) {
}`,
    solution: `fn append_joined(text: &mut String, parts: &[&str], separator: &str) {
    text.extend(parts.join(separator).chars());
}`,
    evaluator: {
      kind: "tests",
      tests: `#[test] fn preserves_prefix_parts_and_separator_boundaries() {
    for (before, parts, separator, expected) in [
        ("old", &[][..], ":", "old"),
        ("old", &[""][..], ":", "old"),
        ("start:", &["", "ż", ""][..], "🙂", "start:🙂ż🙂"),
        ("", &["żółć", "🙂", "e\\u{301}"][..], " / ", "żółć / 🙂 / e\\u{301}"),
        ("prefix", &["a", "b"][..], "", "prefixab"),
        ("x", &["", ""][..], "--", "x--"),
        ("old ", &[" a", "b "][..], "ż🙂", "old  aż🙂b "),
        ("prefix", &["only"][..], ":", "prefixonly"),
    ] {
        let mut text = String::from(before);
        append_joined(&mut text, parts, separator);
        assert_eq!(text, expected);
    }
}`,
    },
    evidenceKind: "transfer",
    evidenceGate: true,
    expectedStatus: "success",
    hints: [
      "Pusta część jest pełnoprawną pozycją; o separatorze decyduje pozycja, nie treść.",
      "Zapamiętaj, czy dopisujesz pierwszą część. Przed każdą następną dołącz separator, potem całą część.",
    ],
  },
];
