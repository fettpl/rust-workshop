/** Trusted test-only implementations: do not expose this verifier to user supplied Rust. */
export const mutationFixtures = {
  "borrow-conflict": {
    equivalent: `pub fn append_suffix(text: &mut String, suffix: &str) { text.extend(suffix.chars()); } fn main() {}`,
    signature: "append_suffix: fn(&mut String, &str)",
    mutants: {
      "constant-print": `pub fn append_suffix(_: &mut String, _: &str) { println!("hi!"); }`,
      "no-mutation": `pub fn append_suffix(_: &mut String, _: &str) {}`,
      "replace-instead": `pub fn append_suffix(text: &mut String, suffix: &str) { text.clear(); text.push_str(suffix); }`,
      "ignore-suffix": `pub fn append_suffix(text: &mut String, _: &str) { text.push('!'); }`,
      "ascii-only": `pub fn append_suffix(text: &mut String, suffix: &str) { if text.is_ascii() && suffix.is_ascii() { text.push_str(suffix); } }`,
      "clone-only": `pub fn append_suffix(text: &mut String, suffix: &str) { let mut copy = text.clone(); copy.push_str(suffix); }`,
      "append-twice": `pub fn append_suffix(text: &mut String, suffix: &str) { text.push_str(suffix); text.push_str(suffix); }`,
    },
  },
  "borrow-mutable-run": {
    equivalent: `pub fn replace_text(text: &mut String, replacement: &str) { text.replace_range(.., replacement); } fn main() {}`,
    signature: "replace_text: fn(&mut String, &str)",
    mutants: {
      "constant-hi": `pub fn replace_text(text: &mut String, _: &str) { *text = String::from("hi!"); }`,
      "no-mutation": `pub fn replace_text(_: &mut String, _: &str) {}`,
      "append-instead": `pub fn replace_text(text: &mut String, replacement: &str) { text.push_str(replacement); }`,
      "ignore-replacement": `pub fn replace_text(text: &mut String, _: &str) { text.clear(); }`,
      "clone-only": `pub fn replace_text(text: &mut String, replacement: &str) { let mut copy = text.clone(); copy.clear(); copy.push_str(replacement); }`,
      "ascii-only": `pub fn replace_text(text: &mut String, replacement: &str) { if replacement.is_ascii() { text.clear(); text.push_str(replacement); } }`,
    },
  },
  "adversarial-conflict": {
    equivalent: `pub fn surround(text: &mut String, prefix: &str, suffix: &str) { *text = format!("{prefix}{text}{suffix}"); } fn main() {}`,
    signature: "surround: fn(&mut String, &str, &str)",
    mutants: {
      "swapped-delimiters": `pub fn surround(text: &mut String, prefix: &str, suffix: &str) { text.insert_str(0, suffix); text.push_str(prefix); }`,
      "lost-middle": `pub fn surround(text: &mut String, prefix: &str, suffix: &str) { *text = format!("{prefix}{suffix}"); }`,
      hardcoded: `pub fn surround(text: &mut String, _: &str, _: &str) { *text = String::from("try again"); }`,
      "append-only": `pub fn surround(text: &mut String, prefix: &str, suffix: &str) { text.push_str(prefix); text.push_str(suffix); }`,
      "clone-only": `pub fn surround(text: &mut String, prefix: &str, suffix: &str) { let mut copy = text.clone(); copy.insert_str(0, prefix); copy.push_str(suffix); }`,
      "no-mutation": `pub fn surround(_: &mut String, _: &str, _: &str) {}`,
      "ascii-only": `pub fn surround(text: &mut String, prefix: &str, suffix: &str) { if text.is_ascii() { text.insert_str(0, prefix); text.push_str(suffix); } }`,
    },
  },
  "review-mutable-borrow": {
    equivalent: `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool { match text.chars().next_back() { Some(last) if last == mark => { text.truncate(text.len() - last.len_utf8()); true }, _ => false } } fn main() {}`,
    signature: "remove_trailing_mark: fn(&mut String, char) -> bool",
    mutants: {
      "always-false": `pub fn remove_trailing_mark(_: &mut String, _: char) -> bool { false }`,
      "always-pop": `pub fn remove_trailing_mark(text: &mut String, _: char) -> bool { text.pop().is_some() }`,
      "all-trailing": `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool { let mut removed = false; while text.ends_with(mark) { text.pop(); removed = true; } removed }`,
      "wrong-bool": `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool { if text.ends_with(mark) { text.pop(); } false }`,
      "clone-only": `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool { let mut copy = text.clone(); if copy.ends_with(mark) { copy.pop(); true } else { false } }`,
      "remove-anywhere": `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool { if let Some(index) = text.find(mark) { text.remove(index); true } else { false } }`,
      "ascii-only": `pub fn remove_trailing_mark(text: &mut String, mark: char) -> bool { if mark.is_ascii() && text.ends_with(mark) { text.pop(); true } else { false } }`,
    },
  },
};

export const readLengthFixtures = [
  {
    lessonId: "adversarial-no-clone",
    stepId: "adversarial-code",
    equivalent:
      "fn show_result(message: &str) -> usize { message.as_bytes().len() } fn main() {}",
    mutants: [
      "fn show_result(_: &str) -> usize { 7 }",
      "fn show_result(_: &str) -> usize { 0 }",
      "fn show_result(message: &str) -> usize { message.chars().count() }",
    ],
  },
  {
    lessonId: "scenario-assessment",
    stepId: "assessment-repair",
    equivalent:
      "fn measure(value: &String) -> usize { value.as_bytes().len() } fn main() {}",
    mutants: [
      "fn measure(_: &String) -> usize { 8 }",
      "fn measure(_: &String) -> usize { 0 }",
      "fn measure(value: &String) -> usize { value.chars().count() }",
    ],
  },
];

/** Function-boundary controls whose failures are compiler diagnostics, not semantic mutants. */
export const functionOwnershipCompileControls = {
  isEmptyTextOwning: `fn main() {
    let text = String::from("Rust");
    println!("{} {}", is_empty_text(&text), text);
}

fn is_empty_text(text: String) -> bool {
    text.is_empty()
}`,
  addMarkBorrowedSignature: `fn main() {
    let text = String::from("ready");
    let marked: fn(&String) -> String = add_mark;
    println!("{}", marked(&text));
}
fn add_mark(text: String) -> String { text }`,
  addMarkBorrowedLocalReturn: `fn add_mark<'a>(text: String) -> &'a str {
    text.as_str()
}`,
  frameTextBorrowedSignature: `fn main() {
    let text = String::from("ready!");
    let framed: fn(&String) -> String = frame_text;
    println!("{}", framed(&text));
}
fn frame_text(text: String) -> String { text }`,
  frameTextBorrowedLocalReturn: `fn frame_text<'a>(text: String) -> &'a str {
    text.as_str()
}`,
};

/** Complete function-boundary implementations and compiling semantic mutants. */
export const functionOwnershipFixtures = {
  "function-predicate-v1": {
    signature: "is_empty_text: fn(&String) -> bool",
    equivalent: `fn is_empty_text(text: &String) -> bool { text.as_bytes().is_empty() }`,
    mutants: {
      "always-true": `fn is_empty_text(text: &String) -> bool { let _ = text; true }`,
      "always-false": `fn is_empty_text(text: &String) -> bool { let _ = text; false }`,
      "trimmed": `fn is_empty_text(text: &String) -> bool { text.trim().is_empty() }`,
    },
  },
  "function-return-owned-v1": {
    signature: "add_mark: fn(String) -> String",
    equivalent: `fn add_mark(mut text: String) -> String { text.push('!'); text }`,
    mutants: {
      unchanged: `fn add_mark(text: String) -> String { text }`,
      "hard-coded": `fn add_mark(text: String) -> String { let _ = text; String::from("fixed!") }`,
      "delimiter-loss": `fn add_mark(text: String) -> String { text + "" }`,
      "delimiter-duplicated": `fn add_mark(text: String) -> String { text + "!!" }`,
    },
  },
  "function-frame-owned-v1": {
    signature: "frame_text: fn(String) -> String",
    equivalent: `fn frame_text(text: String) -> String { let mut out = String::from("<"); out.push_str(&text); out.push('>'); out }`,
    mutants: {
      unchanged: `fn frame_text(text: String) -> String { text }`,
      "hard-coded": `fn frame_text(text: String) -> String { let _ = text; String::from("<fixed>") }`,
      "trimmed": `fn frame_text(text: String) -> String { format!("<{}>", text.trim()) }`,
      "delimiter-loss": `fn frame_text(text: String) -> String { format!("<{}", text) }`,
      "delimiter-duplicated": `fn frame_text(text: String) -> String { format!("<<{}>>", text) }`,
      "unicode-altered": `fn frame_text(text: String) -> String { format!("<{}>", text.replace("🦀", "?")) }`,
    },
  },
} as const;
