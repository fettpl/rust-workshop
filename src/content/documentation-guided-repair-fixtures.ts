/** Trusted author candidates, not learner or imported source. */
import {
  documentationPrefixContract as prefix,
  documentationSettingContract as setting,
  documentationRevisionContract as revision,
} from "./documentation-guided-repair-contracts";
function replace(source: string, before: string, after: string) {
  if (!source.includes(before))
    throw new Error(`Missing maintained fixture fragment: ${before}`);
  return source.replace(before, after);
}
const settingMutants = {
  lastSeparator: {
    code: replace(setting.solution, ".split_once('=')", ".rsplit_once('=')"),
    assertion:
      "setting_splits_first_separator_and_preserves_both_borrowed_sides",
  },
  nextTokenOnly: {
    code: replace(
      setting.solution,
      "text.split_once('=')",
      "{ let mut parts = text.split('='); Some((parts.next()?, parts.next()?)) }",
    ),
    assertion:
      "setting_splits_first_separator_and_preserves_both_borrowed_sides",
  },
  rejectsEmpty: {
    code: replace(
      setting.solution,
      ".split_once('=')",
      ".split_once('=').filter(|(left, right)| !left.is_empty() && !right.is_empty())",
    ),
    assertion:
      "setting_splits_first_separator_and_preserves_both_borrowed_sides",
  },
  trimsFields: {
    code: replace(
      setting.solution,
      ".split_once('=')",
      ".split_once('=').map(|(left, right)| (left.trim(), right.trim()))",
    ),
    assertion:
      "setting_splits_first_separator_and_preserves_both_borrowed_sides",
  },
  swapsFields: {
    code: replace(
      setting.solution,
      ".split_once('=')",
      ".split_once('=').map(|(left, right)| (right, left))",
    ),
    assertion:
      "setting_splits_first_separator_and_preserves_both_borrowed_sides",
  },
};
const settingAlternate = replace(
  setting.solution,
  "text.split_once('=')",
  "match text.find('=') { Some(at) => Some((&text[..at], &text[at + 1..])), None => None }",
);
export const documentationRepairFixtures = [
  {
    id: "docs-prefix-repair",
    starterError: "E0308",
    // Parser credit does not certify learner-authored assertion presence or quality.
    positiveCharacterizations: {
      emptyLearnerRegression: replace(
        prefix.starter,
        "-> &str",
        "-> Option<&str>",
      ),
    },
    alternate: replace(
      prefix.solution,
      'text.strip_prefix("tag:")',
      'if text.starts_with("tag:") { Some(&text[4..]) } else { None }',
    ),
    mutants: {
      emptyMeansAbsent: {
        code: replace(
          prefix.solution,
          'text.strip_prefix("tag:")',
          'text.strip_prefix("tag:").filter(|rest| !rest.is_empty())',
        ),
        assertion:
          "prefix_removes_exact_tag_once_and_preserves_missing_empty_unicode",
      },
      absenceMeansSuccess: {
        code: replace(
          prefix.solution,
          'text.strip_prefix("tag:")',
          'text.strip_prefix("tag:").or(Some(""))',
        ),
        assertion:
          "prefix_removes_exact_tag_once_and_preserves_missing_empty_unicode",
      },
      removesAllTags: {
        code: replace(
          prefix.solution,
          'text.strip_prefix("tag:")',
          'if text.starts_with("tag:") { Some(text.trim_start_matches("tag:")) } else { None }',
        ),
        assertion:
          "prefix_removes_exact_tag_once_and_preserves_missing_empty_unicode",
      },
      trimsRemainder: {
        code: replace(
          prefix.solution,
          'text.strip_prefix("tag:")',
          'text.strip_prefix("tag:").map(str::trim)',
        ),
        assertion:
          "prefix_removes_exact_tag_once_and_preserves_missing_empty_unicode",
      },
      learnerAssertionFails: {
        code: replace(
          prefix.solution,
          'assert_eq!(remove_tag("tag:"), Some(""));',
          'assert_eq!(remove_tag("tag:"), Some("not-empty"));',
        ),
        assertion: "learner_regression",
      },
    },
  },
  {
    id: "docs-split-transfer",
    alternate: settingAlternate,
    mutants: settingMutants,
  },
  {
    id: "docs-split-blank",
    alternate: settingAlternate,
    mutants: settingMutants,
  },
  {
    id: "review-documentation-revision",
    alternate: replace(
      revision.solution,
      "text.rsplit_once('@')",
      "match text.rfind('@') { Some(at) => Some((&text[..at], &text[at + 1..])), None => None }",
    ),
    mutants: {
      firstSeparator: {
        code: replace(
          revision.solution,
          ".rsplit_once('@')",
          ".split_once('@')",
        ),
        assertion:
          "revision_uses_last_separator_without_losing_empty_or_borrowed_text",
      },
      rejectsEmpty: {
        code: replace(
          revision.solution,
          ".rsplit_once('@')",
          ".rsplit_once('@').filter(|(left, right)| !left.is_empty() && !right.is_empty())",
        ),
        assertion:
          "revision_uses_last_separator_without_losing_empty_or_borrowed_text",
      },
      trimsFields: {
        code: replace(
          revision.solution,
          ".rsplit_once('@')",
          ".rsplit_once('@').map(|(left, right)| (left.trim(), right.trim()))",
        ),
        assertion:
          "revision_uses_last_separator_without_losing_empty_or_borrowed_text",
      },
      absenceMeansSuccess: {
        code: replace(
          revision.solution,
          ".rsplit_once('@')",
          '.rsplit_once(\'@\').or(Some(("", "")))',
        ),
        assertion:
          "revision_uses_last_separator_without_losing_empty_or_borrowed_text",
      },
    },
  },
];
