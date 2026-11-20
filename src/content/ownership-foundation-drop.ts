import type { LessonStep } from "@/domain/types";

/**
 * This trusted support module is closed evaluator support. It exposes
 * observations, not the log's storage or mutation API; learner fixtures only
 * import the module from the hidden evaluator wrapper.
 */
export const dropSupportModule = String.raw`
pub mod support {
    use std::cell::RefCell;

    pub struct DropLog {
        events: RefCell<Vec<&'static str>>,
    }

    impl DropLog {
        pub fn new() -> Self {
            Self { events: RefCell::new(Vec::new()) }
        }

        pub fn count(&self) -> usize {
            self.events.borrow().len()
        }

        pub fn events(&self) -> Vec<&'static str> {
            self.events.borrow().clone()
        }
    }

    pub struct Marker<'a> {
        label: &'static str,
        log: &'a DropLog,
    }

    impl<'a> Marker<'a> {
        pub fn new(label: &'static str, log: &'a DropLog) -> Self {
            Self { label, log }
        }
    }

    impl Drop for Marker<'_> {
        fn drop(&mut self) {
            self.log.events.borrow_mut().push(self.label);
        }
    }
}
`;

const withSupportBridge = (source: string): string =>
  `use __rust_workshop_hidden_tests::support;\n${source}`;

export const nestedDropStarter = withSupportBridge(String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let _ = log;
    todo!("record nested Drop checkpoints")
}
`);

export const nestedDropCanonical = withSupportBridge(String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    {
        let _inner = support::Marker::new("inner", log);
    }
    let after_inner = log.count();
    std::mem::drop(outer);
    let after_outer = log.count();
    (after_inner, after_outer)
}
`);

/** A distinct, behaviorally equivalent spelling using explicit inner release. */
export const nestedDropValidAlternate = withSupportBridge(String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    let after_inner = {
        let inner = support::Marker::new("inner", log);
        std::mem::drop(inner);
        log.count()
    };
    drop(outer);
    (after_inner, log.count())
}
`);

export const nestedDropHarness = `${dropSupportModule}
#[test]
fn nested_scope_observes_both_checkpoints_and_reverse_drop_order() {
    let run: fn(&support::DropLog) -> (usize, usize) = nested_scope;
    let log = support::DropLog::new();
    assert_eq!(run(&log), (1, 2));
    assert_eq!(log.count(), 2);
    assert_eq!(log.events(), vec!["inner", "outer"]);
}

#[test]
fn nested_scope_uses_fresh_independent_logs_and_snapshot_cannot_forge_events() {
    let first = support::DropLog::new();
    let second = support::DropLog::new();
    assert_eq!(nested_scope(&first), (1, 2));
    assert_eq!(nested_scope(&second), (1, 2));
    let mut snapshot = second.events();
    snapshot.push("forged");
    assert_eq!(second.count(), 2);
    assert_eq!(second.events(), vec!["inner", "outer"]);
}

#[test]
fn marker_drop_is_only_observable_through_the_fixed_owned_api() {
    let log = support::DropLog::new();
    let marker = support::Marker::new("trusted", &log);
    std::mem::drop(marker);
    assert_eq!(log.events(), vec!["trusted"]);
}
`;

export const nestedDropTests = nestedDropHarness;

const nestedDropSemanticMutantsRaw: Record<string, string> = {
  "missing-inner": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    let first = log.count();
    drop(outer);
    (first, log.count())
}
`,
  "wrong-order-label": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    let inner = support::Marker::new("wrong", log);
    drop(outer);
    let first = log.count();
    drop(inner);
    (first, log.count())
}
`,
  "wrong-order": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    let inner = support::Marker::new("inner", log);
    drop(outer);
    let first = log.count();
    drop(inner);
    (first, log.count())
}
`,
  "wrong-label": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    {
        let _inner = support::Marker::new("wrong", log);
    }
    let first = log.count();
    drop(outer);
    (first, log.count())
}
`,
  "forgotten-outer": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    {
        let _inner = support::Marker::new("inner", log);
    }
    let first = log.count();
    std::mem::forget(outer);
    (first, log.count())
}
`,
  "constant-tuple": String.raw`
pub fn nested_scope(_log: &support::DropLog) -> (usize, usize) {
    (1, 2)
}
`,
  "wrong-checkpoints": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    let _inner = support::Marker::new("inner", log);
    drop(outer);
    let first = log.count();
    (first, log.count())
}
`,
  "early-return-before-inner": String.raw`
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let outer = support::Marker::new("outer", log);
    let first = log.count();
    drop(outer);
    (first, log.count())
}
`,
  "no-lifecycle": String.raw`
pub fn nested_scope(_log: &support::DropLog) -> (usize, usize) {
    (0, 0)
}
`,
};

export const nestedDropSemanticMutants: Record<string, string> =
  Object.fromEntries(
    Object.entries(nestedDropSemanticMutantsRaw).map(([name, source]) => [
      name,
      withSupportBridge(source),
    ]),
  );

export const nestedDropMutants = nestedDropSemanticMutants;

export const nestedDropCompilerPairs = {
  directDestructor: {
    negative: `${dropSupportModule}
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let marker = support::Marker::new("outer", log);
    marker.drop();
    (0, 0)
}
fn main() {}
`,
    positive: `${dropSupportModule}
pub fn nested_scope(log: &support::DropLog) -> (usize, usize) {
    let marker = support::Marker::new("outer", log);
    std::mem::drop(marker);
    (0, 1)
}
fn main() {}
`,
  },
};

export const nestedDropCompilerNegative =
  nestedDropCompilerPairs.directDestructor.negative;
export const nestedDropCompilerPositive =
  nestedDropCompilerPairs.directDestructor.positive;

export const conditionalDropStarter = withSupportBridge(String.raw`
pub fn finish_attempt(
    log: &support::DropLog,
    fail: bool,
) -> Result<u8, &'static str> {
    let _ = (log, fail);
    todo!("finish the attempt and release its markers")
}
`);

export const conditionalDropCanonical = withSupportBridge(String.raw`
pub fn finish_attempt(
    log: &support::DropLog,
    fail: bool,
) -> Result<u8, &'static str> {
    let _outer = support::Marker::new("outer", log);
    if fail {
        return Err("failed");
    }
    let _inner = support::Marker::new("inner", log);
    Ok(2)
}
`);

/** A distinct equivalent that makes both branch results explicit. */
export const conditionalDropValidAlternate = withSupportBridge(String.raw`
pub fn finish_attempt(
    log: &support::DropLog,
    fail: bool,
) -> Result<u8, &'static str> {
    let outer = support::Marker::new("outer", log);
    match fail {
        true => {
            drop(outer);
            Err("failed")
        }
        false => {
            let inner = support::Marker::new("inner", log);
            let result: Result<u8, &'static str> = Ok(2);
            drop(inner);
            drop(outer);
            result
        }
    }
}
`);

export const conditionalDropHarness = `${dropSupportModule}
#[test]
fn failure_returns_typed_error_and_drops_only_outer() {
    let finish: fn(&support::DropLog, bool) -> Result<u8, &'static str> = finish_attempt;
    let log = support::DropLog::new();
    assert_eq!(finish(&log, true), Err("failed"));
    assert_eq!(log.count(), 1);
    assert_eq!(log.events(), vec!["outer"]);
}

#[test]
fn success_returns_typed_value_and_drops_inner_then_outer() {
    let finish: fn(&support::DropLog, bool) -> Result<u8, &'static str> = finish_attempt;
    let log = support::DropLog::new();
    assert_eq!(finish(&log, false), Ok(2));
    assert_eq!(log.count(), 2);
    assert_eq!(log.events(), vec!["inner", "outer"]);
}

#[test]
fn each_attempt_gets_a_fresh_log_and_snapshot_is_not_a_setter() {
    let first = support::DropLog::new();
    let second = support::DropLog::new();
    assert_eq!(finish_attempt(&first, true), Err("failed"));
    assert_eq!(finish_attempt(&second, false), Ok(2));
    let mut snapshot = first.events();
    snapshot.clear();
    assert_eq!(first.events(), vec!["outer"]);
    assert_eq!(second.events(), vec!["inner", "outer"]);
}
`;

export const conditionalDropTests = conditionalDropHarness;

const conditionalDropSemanticMutantsRaw: Record<string, string> = {
  "missing-inner": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let _outer = support::Marker::new("outer", log);
    if fail { Err("failed") } else { Ok(2) }
}
`,
  "wrong-order-label": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let outer = support::Marker::new("outer", log);
    if fail { return Err("failed"); }
    let inner = support::Marker::new("wrong", log);
    drop(outer);
    drop(inner);
    Ok(2)
}
`,
  "wrong-order": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let outer = support::Marker::new("outer", log);
    if fail { return Err("failed"); }
    let inner = support::Marker::new("inner", log);
    drop(outer);
    drop(inner);
    Ok(2)
}
`,
  "wrong-label": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let outer = support::Marker::new("outer", log);
    if fail { return Err("failed"); }
    let inner = support::Marker::new("wrong", log);
    drop(inner);
    drop(outer);
    Ok(2)
}
`,
  "forgotten-on-error": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let outer = support::Marker::new("outer", log);
    if fail {
        std::mem::forget(outer);
        return Err("failed");
    }
    let _inner = support::Marker::new("inner", log);
    Ok(2)
}
`,
  "skip-outer-on-error": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    if fail { return Err("failed"); }
    let _outer = support::Marker::new("outer", log);
    let _inner = support::Marker::new("inner", log);
    Ok(2)
}
`,
  "no-lifecycle": String.raw`
pub fn finish_attempt(_log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    if fail { Err("failed") } else { Ok(2) }
}
`,
  "create-inner-on-error": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let _outer = support::Marker::new("outer", log);
    let _inner = support::Marker::new("inner", log);
    if fail { Err("failed") } else { Ok(2) }
}
`,
  "count-before-drop": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let outer = support::Marker::new("outer", log);
    if fail { return Err("failed"); }
    let inner = support::Marker::new("inner", log);
    let count = log.count() as u8;
    drop(inner);
    drop(outer);
    Ok(count)
}
`,
  "wrong-typed-result": String.raw`
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let _outer = support::Marker::new("outer", log);
    if fail { Ok(2) } else { Err("failed") }
}
`,
};

export const conditionalDropSemanticMutants: Record<string, string> =
  Object.fromEntries(
    Object.entries(conditionalDropSemanticMutantsRaw).map(([name, source]) => [
      name,
      withSupportBridge(source),
    ]),
  );

export const conditionalDropMutants = conditionalDropSemanticMutants;

export const conditionalDropCompilerPairs = {
  directDestructor: {
    negative: `${dropSupportModule}
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let marker = support::Marker::new("outer", log);
    marker.drop();
    if fail { Err("failed") } else { Ok(2) }
}
fn main() {}
`,
    positive: `${dropSupportModule}
pub fn finish_attempt(log: &support::DropLog, fail: bool) -> Result<u8, &'static str> {
    let marker = support::Marker::new("outer", log);
    std::mem::drop(marker);
    if fail { Err("failed") } else { Ok(2) }
}
fn main() {}
`,
  },
};

export const conditionalDropCompilerNegative =
  conditionalDropCompilerPairs.directDestructor.negative;
export const conditionalDropCompilerPositive =
  conditionalDropCompilerPairs.directDestructor.positive;

export const ownershipFoundationDropFixtures = {
  nested: {
    starter: nestedDropStarter,
    canonical: nestedDropCanonical,
    validAlternate: nestedDropValidAlternate,
    harness: nestedDropHarness,
    tests: nestedDropTests,
    mutants: nestedDropSemanticMutants,
    compilerPairs: nestedDropCompilerPairs,
  },
  conditional: {
    starter: conditionalDropStarter,
    canonical: conditionalDropCanonical,
    validAlternate: conditionalDropValidAlternate,
    harness: conditionalDropHarness,
    tests: conditionalDropTests,
    mutants: conditionalDropSemanticMutants,
    compilerPairs: conditionalDropCompilerPairs,
  },
} as const;

function primaryStep(options: {
  id: string;
  title: string;
  prompt: string;
  code: string;
  solution: string;
  tests: string;
  codingTaskId: string;
  hints: [string, string];
}): LessonStep {
  return {
    id: options.id,
    kind: "apply",
    title: options.title,
    prompt: options.prompt,
    code: options.code,
    solution: options.solution,
    hints: options.hints,
    evaluator: { kind: "tests", tests: options.tests },
    expectedStatus: "success",
    evidenceKind: "transfer",
    evidenceGate: true,
    evidence: {
      version: 2,
      conceptIds: ["scope-drop"],
      codingTaskId: options.codingTaskId,
    },
  };
}

export const ownershipFoundationDropSteps: LessonStep[] = [
  primaryStep({
    id: "scope-nested-drop-transfer",
    title: "Napraw oś czasu zagnieżdżonego zakresu",
    prompt:
      'Uzupełnij `nested_scope(log) -> (usize, usize)`. Otrzymujesz stały, bezpieczny `support::DropLog` oraz `support::Marker::new(label, log)`, który jest już gotowym właścicielem rejestrującym własny Drop. Utwórz `outer`, potem `inner` w zagnieżdżonym zakresie. Pierwszy wynik ma być odczytem po zniszczeniu inner, a przed zwolnieniem outer; następnie zwolnij outer i zwróć drugi odczyt. Wynik `(1, 2)` oraz log `["inner", "outer"]` opisują obserwowalny kontrakt. Automatyczne testy dołączają moduł `support`; nie implementuj Drop, RefCell ani generycznego mechanizmu.',
    code: nestedDropStarter,
    solution: nestedDropCanonical,
    tests: nestedDropHarness,
    codingTaskId: "ownership/nested-drop-timeline-v1",
    hints: [
      "Zakres wewnętrzny kończy się przed pierwszym checkpointem. `log.count()` czyta obserwację, ale niczego nie dopisuje.",
      "Po pierwszym odczycie jawne `std::mem::drop(outer)` zwalnia zewnętrzny marker; drugi odczyt powinien zobaczyć oba zdarzenia.",
    ],
  }),
  primaryStep({
    id: "scope-conditional-drop-transfer",
    title: "Dokończ warunkowe zwalnianie zasobów",
    prompt:
      'Uzupełnij `finish_attempt(log, fail) -> Result<u8, &\'static str>`. Najpierw utwórz `outer`. Przy `fail == true` zwróć dokładnie `Err("failed")`; wtedy log ma zawierać tylko `outer`. Przy sukcesie utwórz `inner` i zwróć dokładnie `Ok(2)`; oba markery muszą zostać zwolnione przed powrotem, w kolejności `inner`, `outer`. `Result` jest dostarczonym, konkretnym typem wyniku — nie zmieniaj go na samą liczbę ani tekst. Automatyczne testy dołączają moduł `support`.',
    code: conditionalDropStarter,
    solution: conditionalDropCanonical,
    tests: conditionalDropHarness,
    codingTaskId: "ownership/conditional-drop-return-v1",
    hints: [
      "Deklaracja `outer` przed rozgałęzieniem obejmuje oba wyjścia; Rust automatycznie sprząta lokalne markery przy `return`.",
      'Marker `inner` powinien powstać wyłącznie na ścieżce sukcesu. `Ok(2)` i `Err("failed")` mają różne warianty tego samego Result.',
    ],
  }),
];
