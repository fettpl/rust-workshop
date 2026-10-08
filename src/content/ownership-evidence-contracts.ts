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

export const isEmptyTextContract = {
  starter: `fn main() {
    let text = String::from("Rust");
    println!("{} {}", is_empty_text(&text), text);
}

fn is_empty_text(text: String) -> bool {
    text.is_empty()
}`,
  solution: `fn main() {
    let text = String::from("Rust");
    println!("{} {}", is_empty_text(&text), text);
}

fn is_empty_text(text: &String) -> bool {
    text.is_empty()
}`,
  tests: `#[test]
fn checks_borrowed_input_without_consuming_it() {
    let check: fn(&String) -> bool = is_empty_text;
    for (input, expected) in [("", true), ("Rust", false), ("   ", false), ("żółw 🦀", false), ("!?", false)] {
        let value = String::from(input);
        assert_eq!(check(&value), expected);
        assert_eq!(value, input);
        assert_eq!(check(&value), expected);
    }
}`,
};

export const addMarkContract = {
  starter: `fn main() {
    let text = String::from("ready");
    let marked = add_mark(text);
    println!("{marked}");
}

fn add_mark(text: String) -> String {
    text
}`,
  solution: `fn main() {
    let text = String::from("ready");
    let marked = add_mark(text);
    println!("{marked}");
}

fn add_mark(mut text: String) -> String {
    text.push('!');
    text
}`,
  tests: `#[test]
fn returns_exactly_one_new_mark_each_call() {
    let add: fn(String) -> String = add_mark;
    for (input, expected) in [("", "!"), ("ready!", "ready!!"), ("żółw 🦀", "żółw 🦀!"), ("?!", "?!!")] {
        assert_eq!(add(String::from(input)), expected);
    }
}`,
};

export const frameTextContract = {
  starter: `fn main() {
    let text = String::from("ready!");
    let framed = frame_text(text);
    println!("{framed}");
}

fn frame_text(text: String) -> String {
    text
}`,
  solution: `fn main() {
    let text = String::from("ready!");
    let framed = frame_text(text);
    println!("{framed}");
}

fn frame_text(text: String) -> String {
    format!("<{text}>")
}`,
  tests: `#[test]
fn returns_exact_delimiters_and_preserves_text() {
    let frame: fn(String) -> String = frame_text;
    for (input, expected) in [("", "<>"), ("ready!", "<ready!>"), ("żółw 🦀", "<żółw 🦀>"), ("<x>", "<<x>>")] {
        assert_eq!(frame(String::from(input)), expected);
    }
}`,
};

/** Shared-borrow contract family: callers retain String owners while APIs read &str views. */
export const sharedCountWordsContract = {
  starter: `fn count_words(text: String) -> usize {
    text.split_whitespace().count()
}

fn main() {
    let text = String::from("Rust ma sens");
    let words = count_words(&text);
    println!("{text}: {words}");
}`,
  solution: `fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

fn main() {
    let text = String::from("Rust ma sens");
    let words = count_words(&text);
    println!("{text}: {words}");
}`,
  tests: `#[test]
fn count_words_handles_empty_and_whitespace_boundaries() {
    let count: fn(&str) -> usize = count_words;
    for (input, expected) in [("", 0), (" \\t\\n\\r\\n\\u{2003}", 0), ("rust", 1), ("one\\r\\ntwo\\n", 2)] {
        assert_eq!(count(input), expected);
    }
}

#[test]
fn count_words_handles_multiple_pieces_and_unicode() {
    let count: fn(&str) -> usize = count_words;
    assert_eq!(count("  Rust\\tma   sens  "), 3);
    assert_eq!(count("jeden\\u{2003}dwa"), 2);
    assert_eq!(count("żółw 🦀"), 2);
}

#[test]
fn count_words_preserves_each_owned_input_after_repeated_calls() {
    let count: fn(&str) -> usize = count_words;
    for (input, expected) in [("Rust ma sens", 3), ("żółw 🦀", 2), ("", 0)] {
        let value = String::from(input);
        assert_eq!(count(&value), expected);
        assert_eq!(value, input);
        assert_eq!(count(&value), expected);
        assert_eq!(value, input);
    }
    assert_eq!(count("literal words"), 2);
}`,
};

export const sharedHasSuffixContract = {
  starter: `fn has_suffix(text: String, suffix: &str) -> bool {
    text.ends_with(suffix)
}

fn main() {
    let text = String::from("raport.txt");
    let suffix = String::from(".txt");
    let matches = has_suffix(text, &suffix);
    println!("{text} {suffix}: {matches}");
}`,
  solution: `fn has_suffix(text: &str, suffix: &str) -> bool {
    text.ends_with(suffix)
}

fn main() {
    let text = String::from("raport.txt");
    let suffix = String::from(".txt");
    let matches = has_suffix(&text, &suffix);
    println!("{text} {suffix}: {matches}");
}`,
  tests: `#[test]
fn has_suffix_handles_empty_exact_and_negative_cases() {
    let check: fn(&str, &str) -> bool = has_suffix;
    for (text, suffix, expected) in [
        ("", "", true),
        ("rust", "", true),
        ("", "x", false),
        ("rust", "rust", true),
        ("x", "longer", false),
    ] {
        assert_eq!(check(text, suffix), expected);
    }
}

#[test]
fn has_suffix_requires_the_exact_terminal_text() {
    let check: fn(&str, &str) -> bool = has_suffix;
    for (text, suffix, expected) in [
        ("raport.txt", ".txt", true),
        ("raport.txt", "raport", false),
        ("ababa", "bab", false),
        ("raport.txt ", ".txt", false),
        ("x", "x ", false),
        ("RUST", "rust", false),
    ] {
        assert_eq!(check(text, suffix), expected);
    }
}

#[test]
fn has_suffix_handles_multibyte_text_without_normalization() {
    let check: fn(&str, &str) -> bool = has_suffix;
    assert!(check("żółw🦀", "🦀"));
    assert!(!check("żółw🦀", "żółw"));
    assert!(!check("café", "e\\u{301}"));
}

#[test]
fn has_suffix_preserves_both_owned_inputs_and_supports_same_owner_views() {
    let check: fn(&str, &str) -> bool = has_suffix;
    let text = String::from("raport.txt");
    let suffix = String::from(".txt");
    assert!(check(&text, &suffix));
    assert_eq!(text, "raport.txt");
    assert_eq!(suffix, ".txt");
    assert!(!check(&text, "raport"));
    assert_eq!(text, "raport.txt");
    assert_eq!(suffix, ".txt");
    assert!(!check(&text, ".md"));
    assert_eq!(text, "raport.txt");
    assert_eq!(suffix, ".txt");

    let owner = String::from("żółw🦀");
    let view = &owner[..];
    let suffix_view = &owner[owner.len() - "🦀".len()..];
    assert!(check(view, suffix_view));
    assert_eq!(view, "żółw🦀");
    assert_eq!(suffix_view, "🦀");
    assert_eq!(owner, "żółw🦀");
    assert!(check("literal.txt", ".txt"));
    assert!(!check("literal.txt", ".rs"));
}`,
};

export const delayedSharedCountLinesContract = {
  starter: `fn count_lines(text: String) -> usize {
    text.lines().count()
}

fn main() {
    let text = String::from("one\\ntwo");
    let lines = count_lines(text);
    println!("{text}: {lines}");
}`,
  solution: `fn count_lines(text: &str) -> usize {
    text.lines().count()
}

fn main() {
    let text = String::from("one\\ntwo");
    let lines = count_lines(&text);
    println!("{text}: {lines}");
}`,
  tests: `#[test]
fn count_lines_handles_empty_single_and_terminal_lines() {
    let count: fn(&str) -> usize = count_lines;
    for (input, expected) in [("", 0), ("one", 1), ("one\\n", 1), ("\\n", 1)] {
        assert_eq!(count(input), expected);
    }
}

#[test]
fn count_lines_handles_multiple_blank_unicode_and_crlf_lines() {
    let count: fn(&str) -> usize = count_lines;
    for (input, expected) in [
        ("one\\ntwo", 2),
        ("one\\r\\ntwo\\r\\n", 2),
        ("one\\n\\ntwo", 3),
        ("żółw\\n🦀\\n", 2),
        ("one two", 1),
        ("one\\rtwo", 1),
    ] {
        assert_eq!(count(input), expected);
    }
}

#[test]
fn count_lines_preserves_each_owned_input_after_repeated_calls() {
    let count: fn(&str) -> usize = count_lines;
    for (input, expected) in [("one\\ntwo", 2), ("", 0), ("one\\n\\ntwo", 3)] {
        let value = String::from(input);
        assert_eq!(count(&value), expected);
        assert_eq!(value, input);
        assert_eq!(count(&value), expected);
        assert_eq!(value, input);
    }
    assert_eq!(count("literal"), 1);
}`,
};
