import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const miniGrepSystemSources: Source[] = [
  {
    id: "mini-grep-std-fs-symlink-metadata",
    title: "std::fs::symlink_metadata",
    url: "https://doc.rust-lang.org/std/fs/fn.symlink_metadata.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie polityki dowiązań; funkcja nie podąża za dowiązaniem końcowego komponentu, ale nie tworzy sandboxu ani ochrony przed wyścigiem.",
  },
  {
    id: "mini-grep-std-path",
    title: "std::path",
    url: "https://doc.rust-lang.org/std/path/index.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie reprezentacji ścieżek lub porządku katalogu; Path i PathBuf zachowują składnię platformy, a nie gwarantują wspólnego porządku nie-ASCII.",
  },
  {
    id: "mini-grep-book-command-line-arguments",
    title: "The Rust Programming Language: Accepting Command Line Arguments",
    url: "https://doc.rust-lang.org/book/ch12-01-accepting-command-line-arguments.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kontraktu argumentów; args_os jest potrzebne, gdy nie wolno założyć Unicode argumentu.",
  },
  {
    id: "mini-grep-std-env-args-os",
    title: "std::env::args_os",
    url: "https://doc.rust-lang.org/std/env/fn.args_os.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie granicy między Unicode query/opcjami a nie-UTF-8 ścieżkami przekazywanymi dalej jako OsString.",
  },
  {
    id: "mini-grep-std-process-exit",
    title: "std::process::exit",
    url: "https://doc.rust-lang.org/std/process/fn.exit.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie kodów wyjścia lub własności strumieni; zakończenie procesu nie jest transakcją stdout urządzenia.",
  },
];

export const miniGrepSystemCompetencies: Competency[] = [
  {
    id: "classify-paths-with-explicit-policy",
    title:
      "Klasyfikujesz wejścia ścieżkowe według jawnej polityki, odrzucasz dowiązania i zachowujesz błąd adaptera.",
  },
  {
    id: "preserve-cli-outcome-contract",
    title:
      "Walidujesz opcje CLI i mapujesz sukces, brak wyniku oraz błąd na rozłączne kody wyjścia i strumienie.",
  },
];

export const miniGrepSystemConcepts: Concept[] = [
  {
    id: "grep-path-policy",
    title: "Polityka ścieżek: klasyfikacja przed przejściem",
    prerequisites: ["grep-bounded-input"],
    competencyIds: ["classify-paths-with-explicit-policy"],
    reviewPrompt:
      "Dlaczego odrzucenie napotkanego dowiązania symbolicznego nie jest obietnicą sandboxu?",
    reviewAnswer:
      "symlink_metadata pozwala rozpoznać końcowy komponent jako dowiązanie i zakończyć politykę, lecz między metadanymi a open dane mogą się zmienić. Nie chroni też przed dowiązaniem w komponencie nadrzędnym ani podmianą katalogu przez inny proces.",
    distinguish:
      "Adapter w jednym źródle może pokazać decyzję Link/Special i propagację błędu, ale tylko archiwum Cargo testuje prawdziwe katalogi, symlinki i zachowanie systemu plików.",
  },
  {
    id: "grep-cli-contract",
    title: "Kontrakt CLI: opcje, wynik i kod procesu",
    prerequisites: ["grep-path-policy"],
    competencyIds: ["preserve-cli-outcome-contract"],
    reviewPrompt:
      "Dlaczego błąd wejścia nie może zakończyć programu kodem 0, nawet jeśli stderr zawiera opis?",
    reviewAnswer:
      "Kod 0 obiecuje co najmniej jedno poprawne dopasowanie. Skrypt wywołujący nie powinien parsować stderr, aby wykryć błąd użycia, I/O, formatu albo limitu; taki błąd ma kod 2 i nie publikuje przygotowanego stdout.",
    distinguish:
      "Czysty raport wyniku sprawdza mapowanie danych na kod i tekst, lecz nie uruchamia procesu ani nie dowodzi zachowania rzeczywistych stdout/stderr. Ten dowód należy do archiwum Mini grep.",
  },
];

type Choice = { id: string; label: string };

function choiceStep(options: {
  id: string;
  kind: "predict" | "explain" | "recall";
  title: string;
  prompt: string;
  choices: Choice[];
  correct: string;
  explanations: Record<string, string>;
  evidenceKind: LessonStep["evidenceKind"];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    choices: options.choices,
    evaluator: {
      kind: "choice",
      correct: options.correct,
      explanations: options.explanations,
    },
    evidenceKind: options.evidenceKind,
  };
}

const pathPolicyRun = `#[derive(Clone, Copy)]
enum EntryKind { File, Directory, Symlink }

fn label(kind: EntryKind, path: &str) -> String {
    match kind {
        EntryKind::File => format!("file:{path}"),
        EntryKind::Directory => format!("dir:{path}"),
        EntryKind::Symlink => format!("link:{path}"),
    }
}

fn main() {
    println!("{}", label(EntryKind::File, "notes.txt"));
    println!("{}", label(EntryKind::Directory, "logs"));
}`;

const pathPolicyGateStarter = `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathKind {
    File,
    Directory,
    Symlink,
    Special,
}

#[derive(Debug, PartialEq, Eq)]
pub enum PathPolicyError {
    Symlink(String),
    Special(String),
    Io { path: String, reason: String },
}

pub fn plan_roots<F>(
    roots: &[&str],
    _probe: F,
) -> Result<Vec<String>, PathPolicyError>
where
    F: FnMut(&str) -> Result<PathKind, &'static str>,
{
    let _ = roots;
    todo!("najpierw rozstrzygnij każdy wynik adaptera")
}

pub fn sort_children(children: Vec<String>) -> Vec<String> {
    children
}`;

const pathPolicyGateSolution = `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathKind {
    File,
    Directory,
    Symlink,
    Special,
}

#[derive(Debug, PartialEq, Eq)]
pub enum PathPolicyError {
    Symlink(String),
    Special(String),
    Io { path: String, reason: String },
}

pub fn plan_roots<F>(
    roots: &[&str],
    mut probe: F,
) -> Result<Vec<String>, PathPolicyError>
where
    F: FnMut(&str) -> Result<PathKind, &'static str>,
{
    let mut planned = Vec::new();
    for root in roots {
        match probe(root) {
            Ok(PathKind::File) => planned.push(format!("file:{root}")),
            Ok(PathKind::Directory) => planned.push(format!("dir:{root}")),
            Ok(PathKind::Symlink) => {
                return Err(PathPolicyError::Symlink((*root).to_owned()));
            }
            Ok(PathKind::Special) => {
                return Err(PathPolicyError::Special((*root).to_owned()));
            }
            Err(reason) => {
                return Err(PathPolicyError::Io {
                    path: (*root).to_owned(),
                    reason: reason.to_owned(),
                });
            }
        }
    }
    Ok(planned)
}

pub fn sort_children(mut children: Vec<String>) -> Vec<String> {
    children.sort();
    children
}`;

const pathPolicyGateTests = `#[test]
fn plans_files_and_directories_in_argument_order() {
    let mut calls = Vec::new();
    let plan = plan_roots(&["notes.txt", "logs"], |path| {
        calls.push(path.to_owned());
        Ok(match path {
            "notes.txt" => PathKind::File,
            "logs" => PathKind::Directory,
            _ => unreachable!(),
        })
    })
    .unwrap();

    assert_eq!(calls, vec!["notes.txt", "logs"]);
    assert_eq!(plan, vec!["file:notes.txt", "dir:logs"]);
}

#[test]
fn retains_empty_and_repeated_root_arguments() {
    let mut empty_calls = 0;
    assert_eq!(
        plan_roots(&[], |_| {
            empty_calls += 1;
            Ok(PathKind::File)
        })
        .unwrap(),
        Vec::<String>::new(),
    );
    assert_eq!(empty_calls, 0);

    let mut duplicate_calls = Vec::new();
    assert_eq!(
        plan_roots(&["again", "again"], |path| {
            duplicate_calls.push(path.to_owned());
            Ok(PathKind::File)
        })
        .unwrap(),
        vec!["file:again", "file:again"],
    );
    assert_eq!(duplicate_calls, vec!["again", "again"]);
}

#[test]
fn rejects_a_symlink_before_later_roots_are_classified() {
    let mut calls = Vec::new();
    let error = plan_roots(&["safe", "alias", "later"], |path| {
        calls.push(path.to_owned());
        Ok(match path {
            "safe" => PathKind::File,
            "alias" => PathKind::Symlink,
            _ => PathKind::File,
        })
    })
    .unwrap_err();

    assert_eq!(calls, vec!["safe", "alias"]);
    assert_eq!(error, PathPolicyError::Symlink("alias".to_owned()));
}

#[test]
fn rejects_special_entries_with_their_original_label() {
    assert_eq!(
        plan_roots(&["socket"], |_| Ok(PathKind::Special)),
        Err(PathPolicyError::Special("socket".to_owned())),
    );
}

#[test]
fn preserves_the_adapter_error_and_sorts_only_the_child_labels() {
    let error = plan_roots(&["locked"], |_| Err("permission marker")).unwrap_err();
    assert_eq!(
        error,
        PathPolicyError::Io {
            path: "locked".to_owned(),
            reason: "permission marker".to_owned(),
        },
    );
    assert_eq!(
        sort_children(vec![
            "root/z.txt".to_owned(),
            "root/a.txt".to_owned(),
            "root/m.txt".to_owned(),
        ]),
        vec![
            "root/a.txt".to_owned(),
            "root/m.txt".to_owned(),
            "root/z.txt".to_owned(),
        ],
    );
}`;

const pathPolicyBlankSolution = `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CatalogKind {
    Note,
    Folder,
    Shortcut,
    Device,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CatalogIssue {
    Shortcut(String),
    Device(String),
    Lookup { label: String, reason: String },
    ProbeLimit { label: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct CatalogAudit {
    pub allowed: Vec<String>,
    pub issues: Vec<CatalogIssue>,
}

pub fn audit_catalog<F>(
    labels: &[&str],
    probe_limit: usize,
    mut inspect: F,
) -> CatalogAudit
where
    F: FnMut(&str) -> Result<CatalogKind, &'static str>,
{
    let mut cache: Vec<(String, Result<CatalogKind, &'static str>)> = Vec::new();
    let mut allowed = Vec::new();
    let mut issues = Vec::new();

    for label in labels {
        let result = match cache.iter().find(|(known, _)| known == label) {
            Some((_, result)) => *result,
            None if cache.len() >= probe_limit => {
                issues.push(CatalogIssue::ProbeLimit {
                    label: (*label).to_owned(),
                });
                continue;
            }
            None => {
                let result = inspect(label);
                cache.push(((*label).to_owned(), result));
                result
            }
        };

        match result {
            Ok(CatalogKind::Note) => allowed.push(format!("note:{label}")),
            Ok(CatalogKind::Folder) => allowed.push(format!("folder:{label}")),
            Ok(CatalogKind::Shortcut) => {
                issues.push(CatalogIssue::Shortcut((*label).to_owned()));
            }
            Ok(CatalogKind::Device) => {
                issues.push(CatalogIssue::Device((*label).to_owned()));
            }
            Err(reason) => {
                issues.push(CatalogIssue::Lookup {
                    label: (*label).to_owned(),
                    reason: reason.to_owned(),
                });
            }
        }
    }

    CatalogAudit { allowed, issues }
}`;

const pathPolicyBlankTests = `#[test]
fn audit_collects_all_results_in_input_order_but_probes_each_label_once() {
    let mut calls = Vec::new();
    let audit = audit_catalog(
        &["memo", "shortcut", "archive", "shortcut", "tty", "memo"],
        4,
        |label| {
            calls.push(label.to_owned());
            Ok(match label {
                "memo" => CatalogKind::Note,
                "shortcut" => CatalogKind::Shortcut,
                "archive" => CatalogKind::Folder,
                "tty" => CatalogKind::Device,
                _ => unreachable!(),
            })
        },
    );

    assert_eq!(calls, vec!["memo", "shortcut", "archive", "tty"]);
    assert_eq!(audit.allowed, vec!["note:memo", "folder:archive", "note:memo"]);
    assert_eq!(
        audit.issues,
        vec![
            CatalogIssue::Shortcut("shortcut".to_owned()),
            CatalogIssue::Shortcut("shortcut".to_owned()),
            CatalogIssue::Device("tty".to_owned()),
        ],
    );
}

#[test]
fn audit_keeps_lookup_errors_and_reports_new_labels_after_the_probe_budget() {
    let mut calls = Vec::new();
    let audit = audit_catalog(&["gone", "memo", "later", "later"], 2, |label| {
        calls.push(label.to_owned());
        match label {
            "gone" => Err("catalog denied"),
            "memo" => Ok(CatalogKind::Note),
            _ => unreachable!(),
        }
    });

    assert_eq!(calls, vec!["gone", "memo"]);
    assert_eq!(audit.allowed, vec!["note:memo"]);
    assert_eq!(
        audit.issues,
        vec![
            CatalogIssue::Lookup {
                label: "gone".to_owned(),
                reason: "catalog denied".to_owned(),
            },
            CatalogIssue::ProbeLimit {
                label: "later".to_owned(),
            },
            CatalogIssue::ProbeLimit {
                label: "later".to_owned(),
            },
        ],
    );
}`;

const pathPolicyReviewStarter = `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    Record,
    Bundle,
    Redirect,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SourceIssue {
    Redirect(String),
    Inspect { name: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct SourceSummary {
    pub accepted: Vec<String>,
    pub first_issue: Option<SourceIssue>,
}

pub fn summarize_sources<F>(
    names: &[&str],
    _inspect: F,
) -> SourceSummary
where
    F: FnMut(&str) -> Result<SourceKind, &'static str>,
{
    let _ = names;
    todo!("cache classification and preserve the first failure")
}`;

const pathPolicyReviewSolution = `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    Record,
    Bundle,
    Redirect,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SourceIssue {
    Redirect(String),
    Inspect { name: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct SourceSummary {
    pub accepted: Vec<String>,
    pub first_issue: Option<SourceIssue>,
}

pub fn summarize_sources<F>(
    names: &[&str],
    mut inspect: F,
) -> SourceSummary
where
    F: FnMut(&str) -> Result<SourceKind, &'static str>,
{
    let mut cache: Vec<(String, Result<SourceKind, &'static str>)> = Vec::new();
    let mut accepted = Vec::new();
    let mut first_issue = None;

    for name in names {
        let result = match cache.iter().find(|(known, _)| known == name) {
            Some((_, result)) => *result,
            None => {
                let result = inspect(name);
                cache.push(((*name).to_owned(), result));
                result
            }
        };
        match result {
            Ok(SourceKind::Record) => accepted.push(format!("record:{name}")),
            Ok(SourceKind::Bundle) => accepted.push(format!("bundle:{name}")),
            Ok(SourceKind::Redirect) if first_issue.is_none() => {
                first_issue = Some(SourceIssue::Redirect((*name).to_owned()));
            }
            Ok(SourceKind::Redirect) => {}
            Err(reason) if first_issue.is_none() => {
                first_issue = Some(SourceIssue::Inspect {
                    name: (*name).to_owned(),
                    reason: reason.to_owned(),
                });
            }
            Err(_) => {}
        }
    }

    SourceSummary {
        accepted,
        first_issue,
    }
}`;

const pathPolicyReviewTests = `#[test]
fn review_caches_each_source_but_keeps_all_allowed_occurrences() {
    let mut calls = Vec::new();
    let summary = summarize_sources(&["a", "bundle", "a"], |name| {
        calls.push(name.to_owned());
        Ok(match name {
            "a" => SourceKind::Record,
            "bundle" => SourceKind::Bundle,
            _ => unreachable!(),
        })
    });
    assert_eq!(calls, vec!["a", "bundle"]);
    assert_eq!(summary.accepted, vec!["record:a", "bundle:bundle", "record:a"]);
    assert_eq!(summary.first_issue, None);
}

#[test]
fn review_continues_after_failure_but_preserves_the_first_one() {
    let mut calls = Vec::new();
    let summary = summarize_sources(&["bad", "ok", "jump", "bad"], |name| {
        calls.push(name.to_owned());
        match name {
            "bad" => Err("first marker"),
            "ok" => Ok(SourceKind::Record),
            "jump" => Ok(SourceKind::Redirect),
            _ => unreachable!(),
        }
    });
    assert_eq!(calls, vec!["bad", "ok", "jump"]);
    assert_eq!(summary.accepted, vec!["record:ok"]);
    assert_eq!(
        summary.first_issue,
        Some(SourceIssue::Inspect {
            name: "bad".to_owned(),
            reason: "first marker".to_owned(),
        }),
    );
}`;

const cliRun = `#[derive(Debug)]
enum Outcome {
    Matches(String),
    NoMatches,
    Failure { stage: &'static str, reason: &'static str },
}

fn code(outcome: Outcome) -> u8 {
    match outcome {
        Outcome::Matches(_) => 0,
        Outcome::NoMatches => 1,
        Outcome::Failure { .. } => 2,
    }
}

fn main() {
    let matched = Outcome::Matches("notes.txt:3:needle\\n".to_owned());
    if let Outcome::Matches(text) = &matched { print!("{text}"); }
    println!("code={}", code(matched));
    println!("code={}", code(Outcome::NoMatches));
    println!("code={}", code(Outcome::Failure { stage: "read", reason: "marker" }));
}`;

const cliGateStarter = `#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Arg {
    Text(String),
    Opaque,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PathArg {
    Text(String),
    Opaque,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Command {
    pub context: u8,
    pub query: String,
    pub paths: Vec<PathArg>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum UsageError {
    MissingQuery,
    EmptyQuery,
    MissingPath,
    MissingContextValue,
    RepeatedContext,
    InvalidContext(String),
    ContextTooLarge(String),
    UnknownOption(String),
    NonUnicodeOption,
    NonUnicodeQuery,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SearchOutcome {
    Matches(String),
    NoMatches,
    Failure { stage: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct ProcessReport {
    pub code: u8,
    pub stdout: String,
    pub stderr: String,
}

pub fn parse_command(_args: &[Arg]) -> Result<Command, UsageError> {
    todo!("rozpoznaj -C, --, query i ścieżki")
}

pub fn report_outcome(_outcome: SearchOutcome) -> ProcessReport {
    todo!("kod procesu ma zależeć od obserwowalnego wyniku")
}`;

const cliGateSolution = `#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Arg {
    Text(String),
    Opaque,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PathArg {
    Text(String),
    Opaque,
}

#[derive(Debug, PartialEq, Eq)]
pub struct Command {
    pub context: u8,
    pub query: String,
    pub paths: Vec<PathArg>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum UsageError {
    MissingQuery,
    EmptyQuery,
    MissingPath,
    MissingContextValue,
    RepeatedContext,
    InvalidContext(String),
    ContextTooLarge(String),
    UnknownOption(String),
    NonUnicodeOption,
    NonUnicodeQuery,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SearchOutcome {
    Matches(String),
    NoMatches,
    Failure { stage: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct ProcessReport {
    pub code: u8,
    pub stdout: String,
    pub stderr: String,
}

pub fn parse_command(args: &[Arg]) -> Result<Command, UsageError> {
    let mut context = 0;
    let mut context_seen = false;
    let mut options = true;
    let mut query = None;
    let mut paths = Vec::new();
    let mut index = 0;

    while index < args.len() {
        if query.is_some() {
            paths.push(match &args[index] {
                Arg::Text(value) => PathArg::Text(value.clone()),
                Arg::Opaque => PathArg::Opaque,
            });
            index += 1;
            continue;
        }

        match &args[index] {
            Arg::Text(value) if options && value == "--" => {
                options = false;
                index += 1;
            }
            Arg::Text(value) if options && value == "-C" => {
                if context_seen {
                    return Err(UsageError::RepeatedContext);
                }
                context_seen = true;
                index += 1;
                let Some(value) = args.get(index) else {
                    return Err(UsageError::MissingContextValue);
                };
                let Arg::Text(raw) = value else {
                    return Err(UsageError::NonUnicodeOption);
                };
                if !raw.bytes().all(|byte| byte.is_ascii_digit()) {
                    return Err(UsageError::InvalidContext(raw.clone()));
                }
                let parsed = raw
                    .parse::<u8>()
                    .map_err(|_| UsageError::InvalidContext(raw.clone()))?;
                if parsed > 16 {
                    return Err(UsageError::ContextTooLarge(raw.clone()));
                }
                context = parsed;
                index += 1;
            }
            Arg::Text(value) if options && value.starts_with('-') => {
                return Err(UsageError::UnknownOption(value.clone()));
            }
            Arg::Text(value) => {
                if value.is_empty() {
                    return Err(UsageError::EmptyQuery);
                }
                query = Some(value.clone());
                index += 1;
            }
            Arg::Opaque => return Err(UsageError::NonUnicodeQuery),
        }
    }

    let query = query.ok_or(UsageError::MissingQuery)?;
    if paths.is_empty() {
        return Err(UsageError::MissingPath);
    }
    Ok(Command {
        context,
        query,
        paths,
    })
}

pub fn report_outcome(outcome: SearchOutcome) -> ProcessReport {
    match outcome {
        SearchOutcome::Matches(stdout) => ProcessReport {
            code: 0,
            stdout,
            stderr: String::new(),
        },
        SearchOutcome::NoMatches => ProcessReport {
            code: 1,
            stdout: String::new(),
            stderr: String::new(),
        },
        SearchOutcome::Failure { stage, reason } => ProcessReport {
            code: 2,
            stdout: String::new(),
            stderr: format!("mini-grep: {stage}: {reason}\\n"),
        },
    }
}`;

const cliGateTests = `fn text(value: &str) -> Arg {
    Arg::Text(value.to_owned())
}

#[test]
fn parses_context_before_query_and_preserves_an_opaque_path() {
    let command = parse_command(&[
        text("-C"),
        text("16"),
        text("needle"),
        Arg::Opaque,
        text("notes.txt"),
    ])
    .unwrap();
    assert_eq!(command.context, 16);
    assert_eq!(command.query, "needle");
    assert_eq!(
        command.paths,
        vec![PathArg::Opaque, PathArg::Text("notes.txt".to_owned())],
    );
}

#[test]
fn rejects_conflicting_or_invalid_options_but_double_dash_makes_a_literal_query() {
    assert_eq!(
        parse_command(&[text("-C"), text("1"), text("-C"), text("2"), text("x"), text("p")]),
        Err(UsageError::RepeatedContext),
    );
    assert_eq!(
        parse_command(&[text("-C"), text("17"), text("x"), text("p")]),
        Err(UsageError::ContextTooLarge("17".to_owned())),
    );
    assert_eq!(
        parse_command(&[text("-C"), text("+1"), text("x"), text("p")]),
        Err(UsageError::InvalidContext("+1".to_owned())),
    );
    assert_eq!(
        parse_command(&[text("--word"), text("x"), text("p")]),
        Err(UsageError::UnknownOption("--word".to_owned())),
    );
    assert_eq!(
        parse_command(&[text("--"), text("-C"), text("file")]).unwrap(),
        Command {
            context: 0,
            query: "-C".to_owned(),
            paths: vec![PathArg::Text("file".to_owned())],
        },
    );
    assert_eq!(
        parse_command(&[text("-C"), Arg::Opaque]),
        Err(UsageError::NonUnicodeOption),
    );
}

#[test]
fn rejects_missing_and_non_unicode_query_parts() {
    assert_eq!(parse_command(&[]), Err(UsageError::MissingQuery));
    assert_eq!(parse_command(&[text("")]), Err(UsageError::EmptyQuery));
    assert_eq!(parse_command(&[text("needle")]), Err(UsageError::MissingPath));
    assert_eq!(parse_command(&[Arg::Opaque]), Err(UsageError::NonUnicodeQuery));
    assert_eq!(
        parse_command(&[text("-C")]),
        Err(UsageError::MissingContextValue),
    );
}

#[test]
fn maps_each_outcome_to_its_process_contract_without_partial_stdout_on_error() {
    assert_eq!(
        report_outcome(SearchOutcome::Matches("a:1:needle\\n".to_owned())),
        ProcessReport {
            code: 0,
            stdout: "a:1:needle\\n".to_owned(),
            stderr: String::new(),
        },
    );
    assert_eq!(
        report_outcome(SearchOutcome::NoMatches),
        ProcessReport {
            code: 1,
            stdout: String::new(),
            stderr: String::new(),
        },
    );
    assert_eq!(
        report_outcome(SearchOutcome::Failure {
            stage: "read".to_owned(),
            reason: "marker".to_owned(),
        }),
        ProcessReport {
            code: 2,
            stdout: String::new(),
            stderr: "mini-grep: read: marker\\n".to_owned(),
        },
    );
}`;

const cliBlankSolution = `#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReportToken {
    Text(String),
    Opaque,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReportPath {
    Text(String),
    Opaque,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReportCommand {
    Count { query: String, paths: Vec<ReportPath> },
    Lines { context: u8, query: String, paths: Vec<ReportPath> },
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReportUsage {
    MissingCommand,
    UnknownCommand(String),
    ContextOnlyForLines,
    MissingContextValue,
    RepeatedContext,
    InvalidContext(String),
    ContextTooLarge(String),
    MissingQuery,
    EmptyQuery,
    MissingPath,
    UnknownOption(String),
    NonUnicodeOption,
    NonUnicodeQuery,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReportOutcome {
    Found(String),
    Empty,
    Failed { stage: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct ReportResult {
    pub code: u8,
    pub stdout: String,
    pub stderr: String,
}

fn parse_query_and_paths(
    tokens: &[ReportToken],
    mut index: usize,
    allow_context: bool,
) -> Result<(u8, String, Vec<ReportPath>), ReportUsage> {
    let mut context = 0;
    let mut context_seen = false;
    let mut options = true;
    let mut query = None;
    let mut paths = Vec::new();

    while index < tokens.len() {
        if query.is_some() {
            paths.push(match &tokens[index] {
                ReportToken::Text(value) => ReportPath::Text(value.clone()),
                ReportToken::Opaque => ReportPath::Opaque,
            });
            index += 1;
            continue;
        }

        match &tokens[index] {
            ReportToken::Text(value) if options && value == "--" => {
                options = false;
                index += 1;
            }
            ReportToken::Text(value) if options && value == "-C" && !allow_context => {
                return Err(ReportUsage::ContextOnlyForLines);
            }
            ReportToken::Text(value) if options && value == "-C" => {
                if context_seen {
                    return Err(ReportUsage::RepeatedContext);
                }
                context_seen = true;
                index += 1;
                let Some(token) = tokens.get(index) else {
                    return Err(ReportUsage::MissingContextValue);
                };
                let ReportToken::Text(raw) = token else {
                    return Err(ReportUsage::NonUnicodeOption);
                };
                if !raw.bytes().all(|byte| byte.is_ascii_digit()) {
                    return Err(ReportUsage::InvalidContext(raw.clone()));
                }
                let parsed = raw
                    .parse::<u8>()
                    .map_err(|_| ReportUsage::InvalidContext(raw.clone()))?;
                if parsed > 4 {
                    return Err(ReportUsage::ContextTooLarge(raw.clone()));
                }
                context = parsed;
                index += 1;
            }
            ReportToken::Text(value) if options && value.starts_with('-') => {
                return Err(ReportUsage::UnknownOption(value.clone()));
            }
            ReportToken::Text(value) => {
                if value.is_empty() {
                    return Err(ReportUsage::EmptyQuery);
                }
                query = Some(value.clone());
                index += 1;
            }
            ReportToken::Opaque => return Err(ReportUsage::NonUnicodeQuery),
        }
    }

    let query = query.ok_or(ReportUsage::MissingQuery)?;
    if paths.is_empty() {
        return Err(ReportUsage::MissingPath);
    }
    Ok((context, query, paths))
}

pub fn parse_report(tokens: &[ReportToken]) -> Result<ReportCommand, ReportUsage> {
    let Some(command) = tokens.first() else {
        return Err(ReportUsage::MissingCommand);
    };
    let ReportToken::Text(command) = command else {
        return Err(ReportUsage::UnknownCommand("<opaque>".to_owned()));
    };
    match command.as_str() {
        "count" => {
            let (_, query, paths) = parse_query_and_paths(tokens, 1, false)?;
            Ok(ReportCommand::Count { query, paths })
        }
        "lines" => {
            let (context, query, paths) = parse_query_and_paths(tokens, 1, true)?;
            Ok(ReportCommand::Lines {
                context,
                query,
                paths,
            })
        }
        _ => Err(ReportUsage::UnknownCommand(command.clone())),
    }
}

pub fn report_result(outcome: ReportOutcome) -> ReportResult {
    match outcome {
        ReportOutcome::Found(stdout) => ReportResult {
            code: 0,
            stdout,
            stderr: String::new(),
        },
        ReportOutcome::Empty => ReportResult {
            code: 1,
            stdout: String::new(),
            stderr: String::new(),
        },
        ReportOutcome::Failed { stage, reason } => ReportResult {
            code: 2,
            stdout: String::new(),
            stderr: format!("report: {stage}: {reason}\\n"),
        },
    }
}`;

const cliBlankTests = `fn report_text(value: &str) -> ReportToken {
    ReportToken::Text(value.to_owned())
}

#[test]
fn two_commands_have_different_context_policies() {
    assert_eq!(
        parse_report(&[report_text("count"), report_text("needle"), ReportToken::Opaque]).unwrap(),
        ReportCommand::Count {
            query: "needle".to_owned(),
            paths: vec![ReportPath::Opaque],
        },
    );
    assert_eq!(
        parse_report(&[
            report_text("lines"),
            report_text("-C"),
            report_text("4"),
            report_text("needle"),
            report_text("notes.txt"),
        ])
        .unwrap(),
        ReportCommand::Lines {
            context: 4,
            query: "needle".to_owned(),
            paths: vec![ReportPath::Text("notes.txt".to_owned())],
        },
    );
    assert_eq!(
        parse_report(&[
            report_text("count"),
            report_text("-C"),
            report_text("1"),
            report_text("needle"),
            report_text("notes.txt"),
        ]),
        Err(ReportUsage::ContextOnlyForLines),
    );
}

#[test]
fn lines_rejects_repeated_context_and_double_dash_keeps_literal_query() {
    assert_eq!(
        parse_report(&[
            report_text("lines"),
            report_text("-C"),
            report_text("1"),
            report_text("-C"),
            report_text("2"),
            report_text("needle"),
            report_text("notes.txt"),
        ]),
        Err(ReportUsage::RepeatedContext),
    );
    assert_eq!(
        parse_report(&[
            report_text("count"),
            report_text("--"),
            report_text("-C"),
            report_text("notes.txt"),
        ])
        .unwrap(),
        ReportCommand::Count {
            query: "-C".to_owned(),
            paths: vec![ReportPath::Text("notes.txt".to_owned())],
        },
    );
    assert_eq!(
        parse_report(&[
            report_text("lines"),
            report_text("-C"),
            report_text("+1"),
            report_text("needle"),
            report_text("notes.txt"),
        ]),
        Err(ReportUsage::InvalidContext("+1".to_owned())),
    );
}

#[test]
fn report_result_distinguishes_found_empty_and_error() {
    assert_eq!(
        report_result(ReportOutcome::Found("2\\n".to_owned())).code,
        0,
    );
    assert_eq!(report_result(ReportOutcome::Empty).code, 1);
    assert_eq!(
        report_result(ReportOutcome::Failed {
            stage: "input".to_owned(),
            reason: "denied".to_owned(),
        }),
        ReportResult {
            code: 2,
            stdout: String::new(),
            stderr: "report: input: denied\\n".to_owned(),
        },
    );
}`;

const cliReviewStarter = `#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BatchEvent {
    Match(String),
    NoMatch,
    Error { stage: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct BatchReport {
    pub code: u8,
    pub stdout: String,
    pub stderr: String,
}

pub fn reduce_batch(_events: &[BatchEvent]) -> BatchReport {
    todo!("later errors must clear prepared output and replace an earlier error")
}`;

const cliReviewSolution = `#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BatchEvent {
    Match(String),
    NoMatch,
    Error { stage: String, reason: String },
}

#[derive(Debug, PartialEq, Eq)]
pub struct BatchReport {
    pub code: u8,
    pub stdout: String,
    pub stderr: String,
}

pub fn reduce_batch(events: &[BatchEvent]) -> BatchReport {
    let mut stdout = String::new();
    let mut late_error = None;
    for event in events {
        match event {
            BatchEvent::Match(line) => stdout.push_str(line),
            BatchEvent::NoMatch => {}
            BatchEvent::Error { stage, reason } => {
                late_error = Some((stage, reason));
            }
        }
    }
    match late_error {
        Some((stage, reason)) => BatchReport {
            code: 2,
            stdout: String::new(),
            stderr: format!("batch: {stage}: {reason}\\n"),
        },
        None if stdout.is_empty() => BatchReport {
            code: 1,
            stdout: String::new(),
            stderr: String::new(),
        },
        None => BatchReport {
            code: 0,
            stdout,
            stderr: String::new(),
        },
    }
}`;

const cliReviewTests = `#[test]
fn review_reduces_matches_and_no_match_events() {
    assert_eq!(
        reduce_batch(&[
            BatchEvent::NoMatch,
            BatchEvent::Match("a:1:needle\\n".to_owned()),
            BatchEvent::Match("b:2:needle\\n".to_owned()),
        ]),
        BatchReport {
            code: 0,
            stdout: "a:1:needle\\nb:2:needle\\n".to_owned(),
            stderr: String::new(),
        },
    );
    assert_eq!(
        reduce_batch(&[BatchEvent::NoMatch]),
        BatchReport {
            code: 1,
            stdout: String::new(),
            stderr: String::new(),
        },
    );
}

#[test]
fn review_uses_the_late_error_and_erases_prepared_output() {
    assert_eq!(
        reduce_batch(&[
            BatchEvent::Match("partial\\n".to_owned()),
            BatchEvent::Error {
                stage: "read".to_owned(),
                reason: "first".to_owned(),
            },
            BatchEvent::Error {
                stage: "limit".to_owned(),
                reason: "late".to_owned(),
            },
        ]),
        BatchReport {
            code: 2,
            stdout: String::new(),
            stderr: "batch: limit: late\\n".to_owned(),
        },
    );
}`;

export const miniGrepSystemLessons: Lesson[] = [
  {
    id: "grep-path-policy",
    moduleId: "mini-grep",
    conceptIds: ["grep-path-policy"],
    competencyIds: ["classify-paths-with-explicit-policy"],
    prerequisites: ["grep-bounded-input"],
    title: "Polityka ścieżek: decyzja przed przejściem",
    subtitle:
      "Odróżniasz plik i katalog od dowiązania lub obiektu specjalnego, nie gubiąc przyczyny błędu.",
    minutes: 34,
    outcomes: [
      "Podejmiesz jawną decyzję dla pliku, katalogu, dowiązania i obiektu specjalnego.",
      "Zachowasz kolejność argumentów, a dzieci katalogu uporządkujesz w oddzielnej operacji.",
      "Przekażesz błąd adaptera zamiast cicho pomijać ścieżkę.",
      "Wskażesz, że model adaptera nie dowodzi bezpieczeństwa systemu plików ani braku TOCTOU.",
    ],
    steps: [
      choiceStep({
        id: "grep-path-policy-predict",
        kind: "predict",
        title: "Jaki jest pierwszy ruch przy dowiązaniu?",
        prompt:
          "Adapter metadanych oznaczył końcową ścieżkę wejściową jako dowiązanie symboliczne. Co robi Mini grep zgodnie z polityką projektu?",
        choices: [
          {
            id: "reject",
            label:
              "Zwraca błąd polityki dla tej ścieżki i nie zaczyna przejścia przez jej cel.",
          },
          {
            id: "follow",
            label:
              "Otwiera cel linku, ponieważ użytkownik podał tę ścieżkę świadomie.",
          },
          {
            id: "skip",
            label:
              "Milcząco pomija link i raportuje sukces dla pozostałych wejść.",
          },
        ],
        correct: "reject",
        explanations: {
          reject:
            "Polityka odrzuca napotkany link zamiast rekurencyjnie w niego wchodzić. Jest to decyzja formatu wejścia, nie obietnica sandboxu.",
          follow:
            "Podążanie za linkiem zmienia określoną politykę i może obejść granicę przejścia katalogu.",
          skip: "Pominięcie ukrywa błąd oraz tworzy fałszywy obraz kompletnie przetworzonych wejść.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "grep-path-policy-run",
        kind: "run",
        title: "Zobacz czystą klasyfikację",
        prompt:
          "Uruchom mały model. Etykiety pochodzą z adaptera, więc kod pokazuje decyzję File/Directory bez otwierania pliku lub katalogu.",
        code: pathPolicyRun,
        solution: pathPolicyRun,
        evaluator: {
          kind: "exact-output",
          expected: "file:notes.txt\ndir:logs\n",
        },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      choiceStep({
        id: "grep-path-policy-boundary",
        kind: "explain",
        title: "Gdzie kończy się dowód adaptera?",
        prompt:
          "Test przekazał adapter zwracający Symlink i sprawdził, że funkcja zwraca błąd. Czego ten test jeszcze nie dowodzi?",
        choices: [
          {
            id: "filesystem",
            label:
              "Nie dowodzi zachowania prawdziwego systemu plików, odporności na podmianę ścieżki ani ochrony przed linkiem w katalogu nadrzędnym.",
          },
          {
            id: "all-safe",
            label:
              "Dowodzi, że program jest sandboxem dla dowolnej ścieżki i nie ma wyścigów metadane–open.",
          },
          {
            id: "not-useful",
            label:
              "Nie dowodzi nawet, że policyjna decyzja dla Symlink jest wykonywana w kodzie.",
          },
        ],
        correct: "filesystem",
        explanations: {
          filesystem:
            "Adapter daje deterministyczny test decyzji. Rzeczywiste katalogi, linki i procesy mają osobne testy w zaufanym archiwum Cargo.",
          "all-safe":
            "Jedno sprawdzenie metadanych nie zamyka TOCTOU, nie kontroluje komponentów nadrzędnych i nie izoluje procesu od systemu.",
          "not-useful":
            "Test adaptera właśnie sprawdza decyzję biznesową. Jego ograniczenie dotyczy obserwacji OS, a nie tej decyzji.",
        },
        evidenceKind: "exposure",
      }),
      {
        id: "grep-path-policy-gate",
        kind: "debug",
        title: "Zachowaj politykę i przyczynę adaptera",
        prompt:
          "Uzupełnij `plan_roots` i `sort_children`. Adapter klasyfikuje każdą podaną ścieżkę jako File, Directory, Symlink albo Special albo zwraca krótki powód błędu. File i Directory tworzą odpowiednio etykiety `file:` i `dir:` w kolejności argumentów. Symlink oraz Special kończą plan właściwym błędem, a błąd adaptera zachowuje ścieżkę i powód. Dzieci sortuj rosnąco tylko w pomocniku. Testy odrzucą przejście przez link, ciche pominięcie błędu i brak sortowania. To model decyzji: rzeczywiste `symlink_metadata`, katalogi i otwarcie należą wyłącznie do archiwum projektu.",
        code: pathPolicyGateStarter,
        solution: pathPolicyGateSolution,
        evaluator: { kind: "tests", tests: pathPolicyGateTests },
        expectedStatus: "test-failure",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "W pętli rozstrzygnij wynik `probe` zanim dopiszesz kolejną etykietę. Po Symlink, Special lub Err od razu zwróć odpowiedni wariant.",
          "Sortowanie dzieci nie sortuje argumentów korzenia. Zostaw argumenty w tej kolejności, w jakiej podał je klient.",
        ],
      },
      {
        id: "grep-path-policy-blank",
        kind: "blank",
        title: "Pusta strona: preflight całej partii katalogu",
        prompt:
          "Od zera zaprojektuj preflight całej partii katalogu redakcyjnego. `CatalogKind` ma warianty Note, Folder, Shortcut i Device. `CatalogIssue` ma dokładnie `Shortcut(String)`, `Device(String)`, `Lookup { label: String, reason: String }` i `ProbeLimit { label: String }`. `CatalogAudit` udostępnia pola `allowed: Vec<String>` oraz `issues: Vec<CatalogIssue>`. `audit_catalog` dostaje pożyczone etykiety, limit rzeczywistych badań i callback klasyfikujący etykietę albo zwracający stały powód. Bada każdą różną etykietę najwyżej raz, także gdy występuje ponownie; nie przerywa po Shortcut, Device ani Lookup. Dozwolone wystąpienia dodaje jako `note:` albo `folder:` w kolejności wejścia, a issues zachowuje w kolejności wystąpień. Nowa, nieznana etykieta po wyczerpaniu limitu dostaje ProbeLimit bez wywołania callbacku. Testy sprawdzają te publiczne nazwy, pola i format. Wybierz samodzielnie prywatną pamięć cache oraz przebieg; nie dodawaj `main`.",
        solution: pathPolicyBlankSolution,
        evaluator: { kind: "tests", tests: pathPolicyBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Wynik jednego badania zachowaj pod etykietą, aby kolejne wystąpienie nie uruchamiało callbacku drugi raz.",
          "Limit liczy nowe badania, a nie wszystkie wystąpienia. Zgromadź wyniki i problemy zamiast zwracać pierwszy błąd.",
        ],
      },
      choiceStep({
        id: "grep-path-policy-recall",
        kind: "recall",
        title: "Odtwórz granicę polityki",
        prompt:
          "Dlaczego zachowany błąd odczytu po wcześniejszym poprawnym wejściu powinien nadal zakończyć całe wyszukiwanie?",
        choices: [
          {
            id: "error",
            label:
              "Wynik miał obejmować wszystkie wejścia; ukrycie błędu tworzy częściowy raport wyglądający jak pełny sukces.",
          },
          {
            id: "ignore",
            label:
              "Wcześniejsze trafienie wystarczy do kodu sukcesu, więc późniejszy błąd można pominąć.",
          },
          {
            id: "retry",
            label:
              "Należy w nieskończoność ponawiać dowolny błąd adaptera, aż wejście zadziała.",
          },
        ],
        correct: "error",
        explanations: {
          error:
            "Błąd zachowuje informację, że raport nie pokrył pełnego kontraktu. Archiwum dodatkowo zachowuje prawdziwy `io::Error` jako source.",
          ignore:
            "Sukces części danych nie jest sukcesem całego zlecenia, gdy kontrakt nie przewiduje pomijania błędów.",
          retry:
            "Polityka nie obiecuje retry ani snapshotu; ponawianie może ukryć inny stan ścieżki i nie ma ustalonego limitu.",
        },
        evidenceKind: "recall",
      }),
    ],
    misconceptions: [
      "Odrzucenie linku końcowego tworzy sandbox i usuwa wszystkie wyścigi TOCTOU.",
      "Błąd jednego wejścia można pominąć, jeśli znaleziono już inne dopasowanie.",
      "Sortowanie dzieci katalogu pozwala bez zmiany kontraktu posortować także argumenty klienta.",
    ],
    transferTask:
      "Dla lokalnego indeksatora dokumentów zapisz osobno politykę File/Directory/Link/Special, kolejność korzeni i dzieci oraz zachowanie błędu po częściowym sukcesie. Dopisz do threat modelu, że klasyfikacja metadanych nie daje snapshotu ani sandboxu, a prawdziwe ścieżki sprawdź dopiero w pakiecie Cargo.",
    evidenceGate:
      "Primary gate i blank testują czystą klasyfikację adaptera, kolejność oraz propagację przyczyny. Nie uruchamiają systemu plików. Archiwum `mini-grep-workshop` jest jedynym miejscem dowodu rzeczywistych katalogów, Unix symlinków i błędów procesu.",
    sourceIds: ["mini-grep-std-fs-symlink-metadata", "mini-grep-std-path"],
  },
  {
    id: "grep-cli-contract",
    moduleId: "mini-grep",
    conceptIds: ["grep-cli-contract"],
    competencyIds: ["preserve-cli-outcome-contract"],
    prerequisites: ["grep-path-policy"],
    title: "Kontrakt CLI: opcje i wynik procesu",
    subtitle:
      "Oddzielasz błąd użycia od braku dopasowań i od sukcesu, bez udawania procesu w jednym pliku.",
    minutes: 36,
    outcomes: [
      "Sprawdzisz `-C` raz przed query oraz granicę 0–16 i `--` kończące opcje.",
      "Odróżnisz Unicode query/opcje od nie-UTF-8 ścieżki przekazywanej dalej.",
      "Zamienisz wynik wyszukiwania na rozłączne kody 0, 1 i 2 bez stdout po błędzie.",
      "Wskażesz, że adapter raportu nie jest testem prawdziwego procesu ani atomowego stdout.",
    ],
    steps: [
      choiceStep({
        id: "grep-cli-contract-predict",
        kind: "predict",
        title: "Co znaczy kod 1?",
        prompt:
          "Mini grep poprawnie przetworzył wszystkie wejścia, lecz nie znalazł literalnego query. Jaki wynik ma zobaczyć skrypt wywołujący?",
        choices: [
          {
            id: "no-match",
            label:
              "Kod 1, bez diagnostyki i bez stdout: brak dopasowania jest poprawnym wynikiem wyszukiwania.",
          },
          {
            id: "success",
            label: "Kod 0, ponieważ samo skanowanie plików się udało.",
          },
          {
            id: "error",
            label: "Kod 2 i opis błędu, ponieważ nie znaleziono danych.",
          },
        ],
        correct: "no-match",
        explanations: {
          "no-match":
            "Kod 1 rozróżnia prawidłowe zero trafień od co najmniej jednego trafienia i od błędu użycia, I/O, formatu lub limitu.",
          success:
            "Kod 0 ma obiecywać co najmniej jedno dopasowanie, więc utraciłby rozróżnienie potrzebne automatyzacji.",
          error:
            "Brak dopasowania nie jest diagnostyką ani awarią, gdy wszystkie wejścia zostały poprawnie przetworzone.",
        },
        evidenceKind: "prediction",
      }),
      {
        id: "grep-cli-contract-run",
        kind: "run",
        title: "Zobacz trzy rozłączne wyniki",
        prompt:
          "Uruchom czysty adapter wyniku. Model wypisuje pełny tekst tylko dla dopasowań i pokazuje kody sukcesu, braku wyniku oraz błędu; nie tworzy prawdziwego procesu.",
        code: cliRun,
        solution: cliRun,
        evaluator: {
          kind: "exact-output",
          expected: "notes.txt:3:needle\ncode=0\ncode=1\ncode=2\n",
        },
        expectedStatus: "success",
        evidenceKind: "exposure",
      },
      choiceStep({
        id: "grep-cli-contract-os-boundary",
        kind: "explain",
        title: "Który argument musi być Unicode?",
        prompt:
          "Program otrzymuje argumenty przez `args_os`. Która decyzja jest zgodna z kontraktem Mini grep?",
        choices: [
          {
            id: "boundary",
            label:
              "Query i liczba opcji muszą dać się odczytać jako Unicode; ścieżka po query może pozostać nieprzetworzonym argumentem OS dla PathBuf.",
          },
          {
            id: "all-string",
            label:
              "Każdy argument musi zostać natychmiast zamieniony na String, bo ścieżka zawsze jest tekstem UTF-8.",
          },
          {
            id: "all-opaque",
            label:
              "Query także może być dowolną sekwencją systemową, bo wyszukiwanie literalne nie wymaga tekstu.",
          },
        ],
        correct: "boundary",
        explanations: {
          boundary:
            "Query jest literalnym podciągiem UTF-8, natomiast nazwa ścieżki jest wejściem systemowym. Archiwum przechowuje ją jako OsString/PathBuf.",
          "all-string":
            "Założenie Unicode dla ścieżki traci legalne nazwy platformy, a `args()` może panicować przy nie-UTF-8 argumencie.",
          "all-opaque":
            "Nie-UTF-8 query lub opcja jest błędem użycia, bo kontrakt wyszukiwania i liczby wymaga tekstu.",
        },
        evidenceKind: "exposure",
      }),
      {
        id: "grep-cli-contract-gate",
        kind: "debug",
        title: "Ustal parser i raport wyniku",
        prompt:
          "Uzupełnij `parse_command` oraz `report_outcome`. Parser dostaje argumenty po nazwie programu: `-C N` może pojawić się tylko raz przed query, N to cyfry ASCII bez znaku, zapisujące liczbę dziesiętną 0–16, a `--` kończy opcje. Query ma być niepustym tekstem Unicode i trzeba podać co najmniej jedną ścieżkę; nie-UTF-8 ścieżka po query pozostaje Opaque. Nieznana opcja, powtórzone `-C`, brak wartości i zły limit są błędami użycia. Raport mapuje dopasowania na kod 0, brak dopasowań na 1, a błąd z etapem i powodem na 2, pusty stdout i stderr `mini-grep: etap: powód`. Testy odrzucą ignorowanie konfliktu opcji oraz fałszywy sukces błędu. To adapter danych: prawdziwe args_os, stdout, stderr i proces sprawdza wyłącznie archiwum projektu.",
        code: cliGateStarter,
        solution: cliGateSolution,
        evaluator: { kind: "tests", tests: cliGateTests },
        expectedStatus: "test-failure",
        evidenceKind: "fix",
        evidenceGate: true,
        hints: [
          "Dopóki nie masz query, `--` wyłącza rozpoznawanie opcji, a `-C` pobiera następny argument. Po query każdy argument jest ścieżką.",
          "Utwórz raport dopiero z kompletnego wyniku. Wariant Failure nie może dziedziczyć stdout po wcześniejszym sukcesie.",
        ],
      },
      {
        id: "grep-cli-contract-blank",
        kind: "blank",
        title: "Pusta strona: dwa tryby raportu",
        prompt:
          "Od zera zaprojektuj publiczny kontrakt raportu z dwoma subcommands. `ReportToken` i `ReportPath` mają `Text(String)` oraz `Opaque`. `ReportCommand` ma `Count { query: String, paths: Vec<ReportPath> }` i `Lines { context: u8, query: String, paths: Vec<ReportPath> }`. `parse_report` wymaga najpierw tekstowego `count` albo `lines`. Oba tryby mają niepuste Unicode query i co najmniej jedną ścieżkę, mogą użyć `--` przed query, a ścieżka po query może pozostać Opaque. Tylko Lines pozwala raz użyć `-C N` przed query dla N zapisanej cyframi ASCII bez znaku od 0 do 4; Count z `-C` zwraca ContextOnlyForLines, a ponowione `-C` w Lines zwraca RepeatedContext. `ReportUsage` ma dokładnie warianty MissingCommand, UnknownCommand(String), ContextOnlyForLines, MissingContextValue, RepeatedContext, InvalidContext(String), ContextTooLarge(String), MissingQuery, EmptyQuery, MissingPath, UnknownOption(String), NonUnicodeOption i NonUnicodeQuery. `ReportOutcome` ma Found(String), Empty oraz Failed { stage: String, reason: String }; `report_result` zwraca `ReportResult` z polami `code: u8`, `stdout: String` i `stderr: String`: Found ma kod 0, Empty kod 1, a Failed kod 2, pusty stdout i stderr `report: etap: powód` z LF. Testy sprawdzają te publiczne nazwy, pola i wynik obserwowalny. Wybierz samodzielnie prywatne rozdzielenie obu trybów; nie dodawaj `main`.",
        solution: cliBlankSolution,
        evaluator: { kind: "tests", tests: cliBlankTests },
        expectedStatus: "success",
        evidenceKind: "transfer",
        evidenceGate: true,
        hints: [
          "Najpierw rozstrzygnij subcommand; dopiero potem jego własną politykę opcji. `-C` nie może przejść przez count jako zwykły argument.",
          "Błąd jest osobnym wynikiem od pustego raportu. Zbuduj dla niego nowy raport bez kopiowania stdout sukcesu.",
        ],
      },
      choiceStep({
        id: "grep-cli-contract-recall",
        kind: "recall",
        title: "Odtwórz granicę stdout",
        prompt:
          "Biblioteka wykryła późny błąd I/O po przygotowaniu kilku rekordów. Jaką obietnicę ma adapter raportu dla błędu?",
        choices: [
          {
            id: "clear",
            label:
              "Zwraca kod 2, diagnostykę etapu i pusty przygotowany stdout; publikacja wyniku następuje dopiero po sukcesie wszystkich wejść.",
          },
          {
            id: "partial",
            label:
              "Zwraca już przygotowane rekordy i kod 0, aby użytkownik miał choć część danych.",
          },
          {
            id: "atomic-device",
            label:
              "Gwarantuje, że awaria samego urządzenia stdout nigdy nie zostawi części zapisu.",
          },
        ],
        correct: "clear",
        explanations: {
          clear:
            "Kontrakt oddziela wynik wejść od zapisu urządzenia: błędne wejście nie publikuje przygotowanego raportu i ma kod 2.",
          partial:
            "Częściowy raport mógłby wyglądać jak kompletny. Specyfikacja wymaga jego wstrzymania przy błędzie wejścia/polityki/limitu.",
          "atomic-device":
            "Program nie kontroluje atomowości dowolnego stdout; awaria samego urządzenia może pozostawić część fizycznego zapisu.",
        },
        evidenceKind: "recall",
      }),
    ],
    misconceptions: [
      "Kod 0 może oznaczać zarówno trafienie, jak i błąd opisany na stderr.",
      "Nie-UTF-8 ścieżka wymaga zamiany na String przed utworzeniem PathBuf.",
      "Czysta funkcja raportująca testuje prawdziwy proces oraz atomowość każdego stdout.",
    ],
    transferTask:
      "Dla własnego CLI zapisz tabelę opcji, argumentu kończącego opcje, danych Unicode i systemowych oraz kodów procesu. Dodaj test skryptu dla sukcesu, pustego wyniku i błędu; proces, strumienie i prawdziwe argumenty OS sprawdź w oddzielnym pakiecie Cargo.",
    evidenceGate:
      "Primary gate i blank sprawdzają parser oraz czyste mapowanie wyniku na raport. Nie tworzą procesu ani nie dotykają stdout. Testy procesu, args_os i braku częściowego raportu po prawdziwym błędzie wejścia należą tylko do `mini-grep-workshop`.",
    sourceIds: [
      "mini-grep-book-command-line-arguments",
      "mini-grep-std-env-args-os",
      "mini-grep-std-process-exit",
    ],
  },
];

export const miniGrepSystemReviewExercises: Record<string, LessonStep> = {
  "grep-path-policy": {
    id: "review-grep-path-policy",
    kind: "debug",
    title: "Powtórka: cache klasyfikacji źródeł",
    prompt:
      "Uzupełnij `summarize_sources`. Adapter klasyfikuje nazwę jako Record, Bundle albo Redirect i może zwrócić powód inspect. Każdą różną nazwę badaj najwyżej raz, lecz każde dozwolone wystąpienie zachowaj jako `record:` albo `bundle:`. Nie kończ po błędzie: zwróć wszystkie dopuszczone elementy, a `first_issue` ma zachować tylko pierwszy Redirect albo Inspect w kolejności wejścia. To ćwiczenie cache adaptera, nie dowód systemu plików.",
    code: pathPolicyReviewStarter,
    solution: pathPolicyReviewSolution,
    evaluator: { kind: "tests", tests: pathPolicyReviewTests },
    expectedStatus: "test-failure",
    evidenceKind: "transfer",
    hints: [
      "Zapamiętaj wynik adaptera dla nazwy niezależnie od tego, czy jest sukcesem, Redirect czy błędem.",
      "Po zapisaniu pierwszego problemu kontynuuj pętlę, ale nie zastępuj tego wariantu kolejnym problemem.",
    ],
  },
  "grep-cli-contract": {
    id: "review-grep-cli-contract",
    kind: "debug",
    title: "Powtórka: redukcja wielu wyników wejścia",
    prompt:
      "Uzupełnij `reduce_batch`. Kolejne BatchEvent mogą być Match, NoMatch albo Error z etapem i powodem. Bez Error złącz Match w stdout i zwróć kod 0, gdy tekst nie jest pusty; same NoMatch dają kod 1. Dowolny Error wygrywa nad przygotowanym outputem: zwraca kod 2, pusty stdout i stderr `batch: etap: powód` z ostatniego Error w kolejności wejścia. To test redukcji danych; prawdziwy proces i urządzenie stdout pozostają w archiwum projektu.",
    code: cliReviewStarter,
    solution: cliReviewSolution,
    evaluator: { kind: "tests", tests: cliReviewTests },
    expectedStatus: "test-failure",
    evidenceKind: "transfer",
    hints: [
      "Zachowuj kandydat późnego błędu podczas iteracji, ale końcowy raport zbuduj dopiero po przejściu wszystkich eventów.",
      "Jeśli masz Error, nie kopiuj wcześniejszych Match do stdout. Brak Error i pusty tekst oznacza kod 1.",
    ],
  },
};
