/** Maintained public-function contracts: observe caller-owned data, not printed literals. */
export const appendSuffixContract = {
  starter: `pub fn append_suffix(text: &mut String, suffix: &str) {
    text.push_str(suffix);
}
fn main() {
    let mut text = String::from("hi");
    let view = &text;
    append_suffix(&mut text, "!");
    println!("{view}");
}`,
  solution: `pub fn append_suffix(text: &mut String, suffix: &str) {
    text.push_str(suffix);
}
fn main() {
    let mut text = String::from("hi");
    append_suffix(&mut text, "!");
    println!("{text}");
}`,
  tests: `#[test]
fn appends_to_the_callers_buffer() {
    let append: fn(&mut String, &str) = append_suffix;
    for (initial, suffix) in [("hi", "!"), ("", "?"), ("Rust", ""), ("żółw", " 🦀")] {
        let mut value = String::from(initial);
        append(&mut value, suffix);
        assert_eq!(value, format!("{initial}{suffix}"));
        append(&mut value, suffix);
        assert_eq!(value, format!("{initial}{suffix}{suffix}"));
    }
}`,
};

export const replaceTextContract = {
  starter: `pub fn replace_text(text: &mut String, replacement: &str) {
    text.push_str(replacement);
}
fn main() {
    let mut text = String::from("hi?");
    replace_text(&mut text, "ready!");
    println!("{text}");
}`,
  solution: `pub fn replace_text(text: &mut String, replacement: &str) {
    text.clear();
    text.push_str(replacement);
}
fn main() {
    let mut text = String::from("hi?");
    replace_text(&mut text, "ready!");
    println!("{text}");
}`,
  tests: `#[test]
fn replaces_the_callers_buffer() {
    let replace: fn(&mut String, &str) = replace_text;
    for (initial, replacement) in [("old", "new"), ("", "ready"), ("stale", ""), ("żółw", "🦀!")] {
        let mut value = String::from(initial);
        replace(&mut value, replacement);
        assert_eq!(value, replacement);
        replace(&mut value, "drugi 🦀");
        assert_eq!(value, "drugi 🦀");
        replace(&mut value, "");
        assert_eq!(value, "");
    }
}`,
};

export const surroundContract = {
  starter: `pub fn surround(text: &mut String, prefix: &str, suffix: &str) {
    text.insert_str(0, prefix);
    text.push_str(suffix);
}
fn main() {
    let mut text = String::from("try");
    let view = &text;
    surround(&mut text, "[", "]");
    println!("{view}");
}`,
  solution: `pub fn surround(text: &mut String, prefix: &str, suffix: &str) {
    text.insert_str(0, prefix);
    text.push_str(suffix);
}
fn main() {
    let mut text = String::from("try");
    surround(&mut text, "[", "]");
    let view = &text;
    println!("{view}");
}`,
  tests: `#[test]
fn surrounds_the_existing_callers_buffer() {
    let wrap: fn(&mut String, &str, &str) = surround;
    for (middle, prefix, suffix) in [("try", "[", "]"), ("", "<", ">"), ("kept", "", ""), ("żółw", "🦀 ", " ✓"), ("x", "left:", ":right"), ("x", "", "!"), ("x", "?", "")] {
        let mut value = String::from(middle);
        wrap(&mut value, prefix, suffix);
        assert_eq!(value, format!("{prefix}{middle}{suffix}"));
        wrap(&mut value, "(", ")");
        assert_eq!(value, format!("({prefix}{middle}{suffix})"));
    }
}`,
};

export const removeTrailingMarkContract = {
  starter: `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool {
    let _ = (text, mark);
    false
}
fn main() {
    let mut text = String::from("ready!!");
    let removed = remove_trailing_mark(&mut text, '!');
    println!("{text} {removed}");
}`,
  solution: `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool {
    if text.ends_with(mark) {
        text.pop();
        true
    } else {
        false
    }
}
fn main() {
    let mut text = String::from("ready!!");
    let removed = remove_trailing_mark(&mut text, '!');
    println!("{text} {removed}");
}`,
  tests: `#[test]
fn removes_exactly_one_matching_terminal_character() {
    let remove: fn(&mut String, char) -> bool = remove_trailing_mark;
    for (initial, mark, expected, removed) in [("", '!', "", false), ("hi?", '!', "hi?", false), ("!hi", '!', "!hi", false), ("ready!!", '!', "ready!", true), ("żółw🦀", '🦀', "żółw", true), ("żółw", 'ł', "żółw", false), ("a✓✓", '✓', "a✓", true)] {
        let mut value = String::from(initial);
        assert_eq!(remove(&mut value, mark), removed);
        assert_eq!(value, expected);
    }
    let mut value = String::from("żółw🦀🦀");
    assert!(remove(&mut value, '🦀'));
    assert_eq!(value, "żółw🦀");
    assert!(!remove(&mut value, '?'));
    assert_eq!(value, "żółw🦀");
    assert!(remove(&mut value, '🦀'));
    assert_eq!(value, "żółw");
    assert!(!remove(&mut value, '🦀'));
    assert_eq!(value, "żółw");
}`,
};
