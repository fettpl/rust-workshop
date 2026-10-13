/** Fixed, borrowed public APIs; hidden assertions test each boundary independently. */
export const prefixTypeError = `fn remove_tag(text: &str) -> &str {
    text.strip_prefix("tag:")
}
fn main() {
    let owner = String::from("tag:Łódź");
    let remainder = remove_tag(&owner);
    println!("{remainder:?}|{owner}");
}`;
export const movedOwnerError = `fn remove_tag_owned(text: String) -> Option<String> {
    text.strip_prefix("tag:").map(str::to_owned)
}
fn main() {
    let owner = String::from("tag:Łódź");
    let remainder = remove_tag_owned(owner);
    println!("{remainder:?}|{owner}");
}`;
export const movedOwnerRepair = `fn remove_tag_borrowed(text: &str) -> Option<&str> {
    text.strip_prefix("tag:")
}
fn main() {
    let owner = String::from("tag:Łódź");
    let remainder = remove_tag_borrowed(&owner);
    println!("{remainder:?}|{owner}");
}`;
const learnerTest = `#[test]
fn learner_regression() {
    assert_eq!(remove_tag("tag:abc"), Some("abc"));
    assert_eq!(remove_tag("tag:"), Some(""));
}`;
export const documentationPrefixContract = {
  starter: `${prefixTypeError}
#[test]
fn learner_regression() {
    // Po naprawie dodaj własną zwykłą asercję oraz asercję graniczną.
}`,
  solution: `${prefixTypeError.replace("-> &str", "-> Option<&str>")}
${learnerTest}`,
  tests: `#[test]
fn prefix_removes_exact_tag_once_and_preserves_missing_empty_unicode() {
    let strip: for<'a> fn(&'a str) -> Option<&'a str> = remove_tag;
    for (input, expected) in [
        ("", None), ("tag:", Some("")), ("tag:abc", Some("abc")),
        ("other:abc", None), ("TAG:abc", None), ("x tag:abc", None),
        ("tag:tag:abc", Some("tag:abc")), ("tag:tag:", Some("tag:")),
        ("tag:żółć🦀", Some("żółć🦀")), ("tag: żółć \\n", Some(" żółć \\n")),
    ] {
        let owner = input.to_string();
        assert_eq!(strip(&owner), expected, "{input:?}");
        assert_eq!(strip(&owner), expected);
        assert_eq!(owner, input);
        if let Some(remainder) = strip(&owner) {
            assert_eq!(remainder.as_ptr(), owner.as_bytes()[4..].as_ptr(), "borrowed origin");
        }
    }
}`,
};
export const documentationSettingContract = {
  starter: `fn split_setting(text: &str) -> Option<(&str, &str)> { None }
fn main() {}`,
  solution: `fn split_setting(text: &str) -> Option<(&str, &str)> {
    text.split_once('=')
}
fn main() {}`,
  tests: `#[test]
fn setting_splits_first_separator_and_preserves_both_borrowed_sides() {
    let split: for<'a> fn(&'a str) -> Option<(&'a str, &'a str)> = split_setting;
    for (input, expected) in [
        ("", None), ("plain", None), ("żółć🦀", None),
        ("=", Some(("", ""))), ("key=", Some(("key", ""))), ("=value", Some(("", "value"))),
        ("a=b=c", Some(("a", "b=c"))), ("a==b", Some(("a", "=b"))), ("==", Some(("", "="))),
        ("żółć=🦀=Łódź", Some(("żółć", "🦀=Łódź"))), (" key = value ", Some((" key ", " value "))),
    ] {
        let owner = input.to_string();
        assert_eq!(split(&owner), expected, "{input:?}");
        assert_eq!(split(&owner), expected);
        assert_eq!(owner, input);
        if let Some((left, right)) = split(&owner) {
            let expected_left = expected.unwrap().0;
            assert_eq!(left.as_ptr(), owner.as_ptr());
            assert_eq!(right.as_ptr(), owner.as_bytes()[expected_left.len() + 1..].as_ptr());
        }
    }
}`,
};
export const documentationRevisionContract = {
  starter: `fn split_revision(text: &str) -> Option<(&str, &str)> { None }
fn main() {}`,
  solution: `fn split_revision(text: &str) -> Option<(&str, &str)> {
    text.rsplit_once('@')
}
fn main() {}`,
  tests: `#[test]
fn revision_uses_last_separator_without_losing_empty_or_borrowed_text() {
    let split: for<'a> fn(&'a str) -> Option<(&'a str, &'a str)> = split_revision;
    for (input, expected) in [
        ("", None), ("record", None), ("żółć", None),
        ("@", Some(("", ""))), ("record@", Some(("record", ""))), ("@rev", Some(("", "rev"))),
        ("record@old@new", Some(("record@old", "new"))), ("@@", Some(("@", ""))),
        ("żółć@🦀@Łódź", Some(("żółć@🦀", "Łódź"))), (" key @ rev ", Some((" key ", " rev "))),
    ] {
        let owner = input.to_string();
        assert_eq!(split(&owner), expected, "{input:?}");
        assert_eq!(split(&owner), expected);
        assert_eq!(owner, input);
        if let Some((left, right)) = split(&owner) {
            assert_eq!(left.as_ptr(), owner.as_ptr());
            assert_eq!(right.as_ptr(), owner.as_bytes()[expected.unwrap().0.len() + 1..].as_ptr());
        }
    }
}`,
};
