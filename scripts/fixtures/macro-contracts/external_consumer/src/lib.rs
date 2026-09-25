use macro_contracts::readings;

// These names deliberately shadow common names in the caller crate. The macro
// must resolve its own public type and Vec through hygienic paths.
struct Reading;
struct Vec;

fn record(value: i32, events: &mut std::vec::Vec<&'static str>, label: &'static str) -> i32 {
    events.push(label);
    value
}

pub fn compile_probe() -> std::vec::Vec<macro_contracts::Reading> {
    readings!("probe" => const { 0 },)
}

#[test]
fn accepts_zero_entries() {
    let entries = readings!();
    assert!(entries.is_empty());
}

#[test]
fn accepts_single_entry_and_const_expression() {
    let entries = readings!("one" => const { 7 },);
    assert_eq!(
        entries.as_slice(),
        &[macro_contracts::Reading::new("one", 7)]
    );
}

#[test]
fn accepts_many_entries_with_trailing_comma() {
    let entries = readings!("first" => 1, "second" => 2, "third" => 3,);
    assert_eq!(
        entries
            .iter()
            .map(|entry| entry.name)
            .collect::<std::vec::Vec<_>>(),
        ["first", "second", "third"]
    );
    assert_eq!(
        entries
            .iter()
            .map(|entry| entry.value)
            .collect::<std::vec::Vec<_>>(),
        [1, 2, 3]
    );
}

#[test]
fn evaluates_each_value_once_in_input_order() {
    let mut events = std::vec::Vec::new();
    let entries = readings!(
        "first" => record(1, &mut events, "first"),
        "second" => record(2, &mut events, "second"),
        "third" => record(3, &mut events, "third"),
    );
    assert_eq!(events, ["first", "second", "third"]);
    assert_eq!(
        entries
            .iter()
            .map(|entry| entry.value)
            .collect::<std::vec::Vec<_>>(),
        [1, 2, 3]
    );
}
