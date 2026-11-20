import type { LessonStep } from "@/domain/types";

const repairEvidence = {
  version: 2,
  conceptIds: ["ownership-repair"],
  codingTaskId: "ownership/restore-after-rejection-v1",
};

const copyEvidence = {
  version: 2,
  conceptIds: ["copy-semantics"],
};

export const ownershipRestoreRejectionStarter = `pub fn accept_label(
    slot: &mut Option<String>,
    accept: bool,
) -> Result<(), &'static str> {
    let _ = (slot, accept);
    Err("missing")
}

fn main() {
    let mut label = Some(String::from("Rust"));
    let result = accept_label(&mut label, false);
    println!("{result:?} {label:?}");
}`;

export const ownershipRestoreRejectionCanonical = `pub fn accept_label(
    slot: &mut Option<String>,
    accept: bool,
) -> Result<(), &'static str> {
    let Some(label) = slot.take() else {
        return Err("missing");
    };
    if !accept {
        *slot = Some(label);
        return Err("rejected");
    }
    *slot = Some(format!("accepted:{label}"));
    Ok(())
}

fn main() {
    let mut label = Some(String::from("Rust"));
    let result = accept_label(&mut label, false);
    println!("{result:?} {label:?}");
}`;

export const ownershipRestoreRejectionValidAlternate = `pub fn accept_label(
    slot: &mut Option<String>,
    accept: bool,
) -> Result<(), &'static str> {
    match slot {
        None => Err("missing"),
        Some(label) if !accept => Err("rejected"),
        Some(label) => {
            label.insert_str(0, "accepted:");
            Ok(())
        }
    }
}

fn main() {
    let mut label = Some(String::from("Rust"));
    let result = accept_label(&mut label, false);
    println!("{result:?} {label:?}");
}`;

export const ownershipRestoreRejectionHarness = `#[test]
fn missing_slot_reports_error_and_stays_empty() {
    let accept: fn(&mut Option<String>, bool) -> Result<(), &'static str> = accept_label;
    let mut slot = None;
    assert_eq!(accept(&mut slot, false), Err("missing"));
    assert_eq!(slot, None);
    assert_eq!(accept(&mut slot, true), Err("missing"));
    assert_eq!(slot, None);
}

#[test]
fn rejection_restores_the_exact_owned_value() {
    let accept: fn(&mut Option<String>, bool) -> Result<(), &'static str> = accept_label;
    for input in ["", " Rust ", "żółw 🦀", "   "] {
        let mut slot = Some(String::from(input));
        assert_eq!(accept(&mut slot, false), Err("rejected"));
        assert_eq!(slot.as_deref(), Some(input));
        assert_eq!(accept(&mut slot, false), Err("rejected"));
        assert_eq!(slot.as_deref(), Some(input));
    }
}

#[test]
fn acceptance_prefixes_the_current_value_and_repeated_calls_observe_it() {
    let accept: fn(&mut Option<String>, bool) -> Result<(), &'static str> = accept_label;
    let mut slot = Some(String::from("Rust"));
    assert_eq!(accept(&mut slot, true), Ok(()));
    assert_eq!(slot.as_deref(), Some("accepted:Rust"));
    assert_eq!(accept(&mut slot, true), Ok(()));
    assert_eq!(slot.as_deref(), Some("accepted:accepted:Rust"));
    assert_eq!(accept(&mut slot, false), Err("rejected"));
    assert_eq!(slot.as_deref(), Some("accepted:accepted:Rust"));
}`;

export const ownershipRestoreRejectionSemanticMutants: Record<string, string> =
  {
    "drop-on-rejection": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    let Some(label) = slot.take() else { return Err("missing"); };
    if !accept { let _ = label; return Err("rejected"); }
    *slot = Some(format!("accepted:{label}")); Ok(())
}`,
    "commit-on-rejection": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    let Some(label) = slot.take() else { return Err("missing"); };
    if !accept { *slot = Some(format!("rejected:{label}")); return Err("rejected"); }
    *slot = Some(format!("accepted:{label}")); Ok(())
}`,
    "prefix-on-error": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    let Some(mut label) = slot.take() else { return Err("missing"); };
    if !accept { label.insert_str(0, "accepted:"); *slot = Some(label); return Err("rejected"); }
    *slot = Some(format!("accepted:{label}")); Ok(())
}`,
    "always-ok": `pub fn accept_label(slot: &mut Option<String>, _accept: bool) -> Result<(), &'static str> {
    if let Some(label) = slot.take() { *slot = Some(format!("accepted:{label}")); }
    Ok(())
}`,
    "hard-coded-output": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    if slot.is_none() { return Err("missing"); }
    if accept { *slot = Some(String::from("accepted:fixed")); Ok(()) } else { Err("rejected") }
}`,
    "repeat-no-prefix": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    let Some(mut label) = slot.take() else { return Err("missing"); };
    if !accept { *slot = Some(label); return Err("rejected"); }
    if label.starts_with("accepted:") { *slot = Some(label); return Ok(()); }
    label.insert_str(0, "accepted:"); *slot = Some(label); Ok(())
}`,
    "none-as-empty": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    if slot.is_none() { *slot = Some(String::from("")); }
    if accept { let label = slot.take().unwrap(); *slot = Some(format!("accepted:{label}")); Ok(()) } else { Err("rejected") }
}`,
    "restore-trimmed": `pub fn accept_label(slot: &mut Option<String>, accept: bool) -> Result<(), &'static str> {
    let Some(label) = slot.take() else { return Err("missing"); };
    if !accept { *slot = Some(label.trim().to_owned()); return Err("rejected"); }
    *slot = Some(format!("accepted:{label}")); Ok(())
}`,
  };

export const ownershipRestoreRejectionCompilerPairs = {
  movedUse: {
    negative: `fn inspect(slot: Option<String>) {
    let moved: Option<String> = slot;
    println!("{}", slot.is_some());
    let _ = moved;
}
fn main() { inspect(Some(String::from("Rust"))); }`,
    positive: `fn inspect(slot: &mut Option<String>) {
    let moved: Option<String> = slot.take();
    println!("{}", moved.is_some());
}
fn main() { inspect(&mut Some(String::from("Rust"))); }`,
  },
  borrowedLocal: {
    negative: `fn borrowed<'a>() -> &'a str {
    let text = String::from("Rust");
    text.as_str()
}
fn main() { let _ = borrowed(); }`,
    positive: `fn borrowed(text: &str) -> &str { text }
fn main() { let text = String::from("Rust"); println!("{}", borrowed(&text)); }`,
  },
} as const;

export const ownershipCopyCounterStarter = `pub fn bump_and_keep(count: u32) -> (u32, u32) {
    let _ = count;
    (0, 0)
}

fn main() {
    println!("{:?}", bump_and_keep(1));
}`;

export const ownershipCopyCounterCanonical = `pub fn bump_and_keep(count: u32) -> (u32, u32) {
    let before = count;
    let after = count.saturating_add(1);
    (before, after)
}

fn main() {
    println!("{:?}", bump_and_keep(1));
}`;

export const ownershipCopyCounterValidAlternate = `pub fn bump_and_keep(count: u32) -> (u32, u32) {
    let before = count;
    let after = match count.checked_add(1) {
        Some(value) => value,
        None => u32::MAX,
    };
    (before, after)
}

fn main() {
    println!("{:?}", bump_and_keep(1));
}`;

export const ownershipCopyCounterHarness = `#[test]
fn preserves_before_and_saturates_after() {
    let bump: fn(u32) -> (u32, u32) = bump_and_keep;
    for (input, expected) in [
        (0, (0, 1)),
        (1, (1, 2)),
        (42, (42, 43)),
        (u32::MAX, (u32::MAX, u32::MAX)),
    ] {
        assert_eq!(bump(input), expected);
        assert_eq!(bump(input), expected);
    }
}`;

export const ownershipCopyCounterSemanticMutants: Record<string, string> = {
  "constant-pair": `pub fn bump_and_keep(_count: u32) -> (u32, u32) { (0, 1) }`,
  "wrong-increment": `pub fn bump_and_keep(count: u32) -> (u32, u32) { (count, count.saturating_add(2)) }`,
  "wrapping-increment": `pub fn bump_and_keep(count: u32) -> (u32, u32) { (count, count.wrapping_add(1)) }`,
  "reversed-pair": `pub fn bump_and_keep(count: u32) -> (u32, u32) { (count.saturating_add(1), count) }`,
  "hard-coded-value": `pub fn bump_and_keep(_count: u32) -> (u32, u32) { (42, 43) }`,
};

export const ownershipCopyCounterCompilerPairs = {
  stringMove: {
    negative: `fn main() {
    let value = String::from("not Copy");
    let moved = value;
    println!("{value}");
    let _ = moved;
}`,
    positive: `fn main() {
    let value: u32 = 41;
    let copied = value;
    println!("{value} {copied}");
}`,
  },
} as const;

export const ownershipCopyArrayStarter = `pub fn flip_first(flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    (flags, flags)
}

fn main() {
    println!("{:?}", flip_first([false, true, false]));
}`;

export const ownershipCopyArrayCanonical = `pub fn flip_first(flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    let before = flags;
    let mut after = before;
    after[0] = !after[0];
    (before, after)
}

fn main() {
    println!("{:?}", flip_first([false, true, false]));
}`;

export const ownershipCopyArrayValidAlternate = `pub fn flip_first(flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    let [first, second, third] = flags;
    ([first, second, third], [!first, second, third])
}

fn main() {
    println!("{:?}", flip_first([false, true, false]));
}`;

export const ownershipCopyArrayHarness = `#[test]
fn preserves_the_snapshot_and_flips_only_index_zero() {
    let flip: fn([bool; 3]) -> ([bool; 3], [bool; 3]) = flip_first;
    for flags in [
        [false, false, false],
        [false, false, true],
        [false, true, false],
        [false, true, true],
        [true, false, false],
        [true, false, true],
        [true, true, false],
        [true, true, true],
    ] {
        let (before, after) = flip(flags);
        assert_eq!(before, flags);
        assert_eq!(after, [!flags[0], flags[1], flags[2]]);
        assert_eq!(flip(flags), (before, after));
    }
}`;

export const ownershipCopyArraySemanticMutants: Record<string, string> = {
  "flip-snapshot": `pub fn flip_first(mut flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    let before = flags;
    flags[0] = !flags[0];
    (flags, flags)
}`,
  "flip-all": `pub fn flip_first(flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    let mut after = flags;
    for value in &mut after { *value = !*value; }
    (flags, after)
}`,
  "flip-last": `pub fn flip_first(flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    let mut after = flags;
    after[2] = !after[2];
    (flags, after)
}`,
  "constant-array": `pub fn flip_first(_flags: [bool; 3]) -> ([bool; 3], [bool; 3]) {
    ([false, false, false], [true, false, false])
}`,
  "return-same-array": `pub fn flip_first(flags: [bool; 3]) -> ([bool; 3], [bool; 3]) { (flags, flags) }`,
};

export const ownershipCopyArrayCompilerPairs = {
  stringArrayMove: {
    negative: `fn main() {
    let values: [String; 3] = [String::from("a"), String::from("b"), String::from("c")];
    let moved = values;
    println!("{}", values[0]);
    let _ = moved;
}`,
    positive: `fn main() {
    let values = [false, true, false];
    let copied = values;
    println!("{:?} {:?}", values, copied);
}`,
  },
} as const;

export const ownershipFoundationValueFixtures = {
  repair: {
    starter: ownershipRestoreRejectionStarter,
    canonical: ownershipRestoreRejectionCanonical,
    validAlternate: ownershipRestoreRejectionValidAlternate,
    harness: ownershipRestoreRejectionHarness,
    semanticMutants: ownershipRestoreRejectionSemanticMutants,
    compilerPairs: ownershipRestoreRejectionCompilerPairs,
  },
  counter: {
    starter: ownershipCopyCounterStarter,
    canonical: ownershipCopyCounterCanonical,
    validAlternate: ownershipCopyCounterValidAlternate,
    harness: ownershipCopyCounterHarness,
    semanticMutants: ownershipCopyCounterSemanticMutants,
    compilerPairs: ownershipCopyCounterCompilerPairs,
  },
  array: {
    starter: ownershipCopyArrayStarter,
    canonical: ownershipCopyArrayCanonical,
    validAlternate: ownershipCopyArrayValidAlternate,
    harness: ownershipCopyArrayHarness,
    semanticMutants: ownershipCopyArraySemanticMutants,
    compilerPairs: ownershipCopyArrayCompilerPairs,
  },
} as const;

function valueStep(
  step: Omit<LessonStep, "evidence" | "evaluator" | "evidenceKind"> & {
    evidence: LessonStep["evidence"];
    evaluator: LessonStep["evaluator"];
    evidenceKind: LessonStep["evidenceKind"];
  },
): LessonStep {
  return step;
}

export const ownershipFoundationValueSteps: LessonStep[] = [
  valueStep({
    id: "ownership-restore-rejection-transfer",
    kind: "debug",
    title: "Przywróć odrzuconą etykietę",
    prompt:
      'Uzupełnij `accept_label`, aby dla `None` zwracała `Err("missing")` i zostawiała slot pusty. Dla `Some(label)` oraz `accept == false` zwróć `Err("rejected")` i zachowaj dokładnie tę samą wartość, także pustą, ze spacjami lub Unicode. Dla akceptacji zapisz `accepted:` przed bieżącym tekstem i zwróć `Ok(())`. To wąski, dostarczony kontrakt wyniku: `Ok(())` oznacza powodzenie, a `Err("...")` opisuje błąd; nie musisz znać jeszcze całego rozdziału o `Result`.',
    code: ownershipRestoreRejectionStarter,
    solution: ownershipRestoreRejectionCanonical,
    hints: [
      "Najpierw rozdziel pusty slot od istniejącego owned tekstu. Przy odrzuceniu nie zmieniaj znaków ani białych znaków.",
      "`take()` daje chwilową własność; na ścieżce błędu włóż ten sam tekst z powrotem, a na sukcesie zapisz prefiks `accepted:`.",
    ],
    evaluator: { kind: "tests", tests: ownershipRestoreRejectionHarness },
    evidenceKind: "fix",
    evidence: repairEvidence,
    evidenceGate: true,
    expectedStatus: "success",
  }),
  valueStep({
    id: "copy-counter-transfer",
    kind: "modify",
    title: "Zachowaj licznik przez Copy",
    prompt:
      "Uzupełnij `bump_and_keep(count: u32)`, zwracając `(before, after)`: pierwsza liczba to wartość przed zmianą, a druga to `saturating_add(1)`. `u32::MAX` ma pozostać `u32::MAX`, więc test obejmuje pełną granicę typu. `u32` pozwala zachować kopię wartości i nie jest obietnicą fizycznego układu pamięci.",
    code: ownershipCopyCounterStarter,
    solution: ownershipCopyCounterCanonical,
    hints: [
      "Zwiąż `count` jako `before`, zanim obliczysz następną wartość.",
      "Użyj `saturating_add(1)`, aby przypadek `u32::MAX` nie zawinął się do zera.",
    ],
    evaluator: { kind: "tests", tests: ownershipCopyCounterHarness },
    evidenceKind: "transfer",
    evidence: { ...copyEvidence, codingTaskId: "ownership/copy-counter-v1" },
    evidenceGate: true,
    expectedStatus: "success",
  }),
  valueStep({
    id: "copy-array-snapshot-transfer",
    kind: "modify",
    title: "Zachowaj migawkę tablicy Copy",
    prompt:
      "Uzupełnij `flip_first`, zwracając najpierw niezmienioną migawkę `[bool; 3]`, a potem nową tablicę z odwróconym wyłącznie elementem o indeksie 0. Sprawdź wszystkie osiem kombinacji boolowskich oraz kolejne niezależne wywołania. Tablica z elementami `Copy` może zostać przypisana bez przeniesienia własności; to obserwowalna reguła typów, nie twierdzenie o stosie lub stercie.",
    code: ownershipCopyArrayStarter,
    solution: ownershipCopyArrayCanonical,
    hints: [
      "Zachowaj `flags` jako pierwszą wartość wyniku, zanim zmienisz kopię.",
      "Skopiuj tablicę do `after` i zmień tylko `after[0]`; elementy 1 i 2 muszą pozostać bez zmian.",
    ],
    evaluator: { kind: "tests", tests: ownershipCopyArrayHarness },
    evidenceKind: "transfer",
    evidence: {
      ...copyEvidence,
      codingTaskId: "ownership/copy-array-snapshot-v1",
    },
    evidenceGate: true,
    expectedStatus: "success",
  }),
];
