import type { LessonStep } from "../domain/types";

/** Separate recovery contracts; no alternative is shared by two confirmations. */
export const dependencyRecoverySteps: Record<string, LessonStep[]> = {
  "dependency-graph-diagnosis": [
    {
      id: "dependency-graph-diagnosis-edge-audit-transfer",
      kind: "apply",
      title: "Sprawdź aktywne krawędzie",
      prompt:
        "Napisz `struct SelectedEdge { from: &'static str, package: &'static str, version: &'static str, source: &'static str, enabled: bool }`, porównywalny Debug `enum EdgeAudit { Clean, Cycle(&'static str), Conflict(&'static str) }` oraz `fn audit_edges(edges: &[SelectedEdge]) -> EdgeAudit`. Bierz pod uwagę wyłącznie enabled. Najpierw zwróć pierwszy self-cycle (from == package); dopiero bez cyklu pierwszy konflikt package z inną wersją lub source, w kolejności wejścia. Identyczne zależności różnych rodziców nie są konfliktem. Puste wejście jest Clean.",
      solution: `struct SelectedEdge { from: &'static str, package: &'static str, version: &'static str, source: &'static str, enabled: bool }
#[derive(Debug, PartialEq, Eq)]
enum EdgeAudit { Clean, Cycle(&'static str), Conflict(&'static str) }
fn audit_edges(edges: &[SelectedEdge]) -> EdgeAudit {
    let selected: Vec<_> = edges.iter().filter(|e| e.enabled).collect();
    if let Some(e) = selected.iter().find(|e| e.from == e.package) { return EdgeAudit::Cycle(e.package); }
    for (i, e) in selected.iter().enumerate() {
        if selected[i+1..].iter().any(|o| o.package == e.package && (o.version != e.version || o.source != e.source)) { return EdgeAudit::Conflict(e.package); }
    }
    EdgeAudit::Clean
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn active_edges_preserve_cycle_precedence_and_source_identity() {
    fn edge(from: &'static str, package: &'static str, version: &'static str, source: &'static str, enabled: bool) -> SelectedEdge { SelectedEdge { from, package, version, source, enabled } }
    assert_eq!(audit_edges(&[]), EdgeAudit::Clean);
    assert_eq!(audit_edges(&[edge("app","bytes","1","registry",true),edge("helper","bytes","1","registry",true)]), EdgeAudit::Clean);
    for (v,s) in [("2","registry"),("1","git")] {
        let mut rows = vec![edge("app","bytes","1","registry",true),edge("helper","bytes",v,s,true)];
        assert_eq!(audit_edges(&rows), EdgeAudit::Conflict("bytes"));
        rows.push(edge("app","app","1","path",true));
        assert_eq!(audit_edges(&rows), EdgeAudit::Cycle("app"));
        rows[2].enabled = false;
        rows[1].enabled = false;
        assert_eq!(audit_edges(&rows), EdgeAudit::Clean);
        rows[0].enabled = false; rows[1].enabled = true;
        assert_eq!(audit_edges(&rows), EdgeAudit::Clean);
    }
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
  ],
  "dependency-source-license-policy": [
    {
      id: "dependency-source-license-policy-batch-transfer",
      kind: "apply",
      title: "Rozlicz każdą zależność",
      prompt:
        "Zdefiniuj `struct PolicyEntry<'a> { source: &'a str, license: &'a str }` i `fn rejected_indices(entries: &[PolicyEntry<'_>]) -> Vec<usize>`. Zwróć w kolejności wejścia indeks każdej odrzuconej pozycji, także powtórzeń. Akceptuj wyłącznie source registry z MIT albo Apache-2.0; każda inna, pusta lub nieznana wartość jest odrzucona. Nie kończ na pierwszym błędzie.",
      solution: `struct PolicyEntry<'a> { source: &'a str, license: &'a str }
fn rejected_indices(entries: &[PolicyEntry<'_>]) -> Vec<usize> {
    entries.iter().enumerate().filter_map(|(i,e)| {
        (!(e.source == "registry" && matches!(e.license, "MIT" | "Apache-2.0"))).then_some(i)
    }).collect()
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn checks_every_source_license_pair_without_fail_open_or_fail_fast() {
    assert_eq!(rejected_indices(&[]), Vec::<usize>::new());
    let sources = ["registry", "git", "path", "", "mirror"];
    let licenses = ["MIT", "Apache-2.0", "UNKNOWN", "GPL-3.0", ""];
    let entries: Vec<_> = sources.iter().flat_map(|s| licenses.iter().map(move |l| PolicyEntry { source:s, license:l })).collect();
    let expected: Vec<_> = (2..25).collect();
    assert_eq!(rejected_indices(&entries), expected);
    let entries = [PolicyEntry {source:"path",license:"MIT"},PolicyEntry {source:"registry",license:"MIT"},PolicyEntry {source:"path",license:"MIT"}];
    assert_eq!(rejected_indices(&entries), vec![0,2]);
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
    {
      id: "dependency-source-license-policy-reason-transfer",
      kind: "apply",
      title: "Zwróć niezależne powody odmowy",
      prompt:
        "Zdefiniuj porównywalny Debug `enum PolicyAudit { Accepted, Source, License, SourceAndLicense }` i `fn audit_policy(source: &str, license: &str) -> PolicyAudit`. Zaufane źródło to tylko registry, licencje to MIT i Apache-2.0. Sprawdź oba pola i nazwij każdy powód odmowy: nieznane obie wartości dają SourceAndLicense, samo złe source daje Source, sama zła licencja License. Puste pola są nieznane.",
      solution: `#[derive(Debug, PartialEq, Eq)]
enum PolicyAudit { Accepted, Source, License, SourceAndLicense }
fn audit_policy(source: &str, license: &str) -> PolicyAudit {
    match (source == "registry", matches!(license,"MIT"|"Apache-2.0")) {
        (true,true) => PolicyAudit::Accepted, (false,true) => PolicyAudit::Source,
        (true,false) => PolicyAudit::License, (false,false) => PolicyAudit::SourceAndLicense,
    }
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn reports_both_independent_policy_dimensions() {
    for source in ["registry","git","path","","unknown"] {
        for license in ["MIT","Apache-2.0","UNKNOWN","","GPL-3.0"] {
            let expected = match (source,license) { ("registry","MIT"|"Apache-2.0") => PolicyAudit::Accepted, ("registry",_) => PolicyAudit::License, (_,"MIT"|"Apache-2.0") => PolicyAudit::Source, _ => PolicyAudit::SourceAndLicense };
            assert_eq!(audit_policy(source,license), expected);
        }
    }
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
  ],
  "dependency-advisory-exceptions": [
    {
      id: "dependency-advisory-exceptions-scope-transfer",
      kind: "apply",
      title: "Wybierz aktywne wyjątki dla zakresu",
      prompt:
        "Napisz `struct ScopedException<'a> { advisory: &'a str, package: &'a str, owner: &'a str, scope: &'a str, reason: &'a str, expires_ymd: u32 }` i `fn current_ids<'a>(rows: &[ScopedException<'a>], package: &str, scope: &str, as_of: u32) -> Vec<&'a str>`. Zwracaj advisory w kolejności wejścia, zachowując powtórzenia, tylko gdy package i scope dokładnie pasują, wszystkie pięć pól tekstowych jest niepuste, a as_of <= expires_ymd. Data pochodzi wyłącznie z argumentu; pusty szukany package/scope nie może akceptować pustego rekordu.",
      solution: `struct ScopedException<'a> { advisory: &'a str, package: &'a str, owner: &'a str, scope: &'a str, reason: &'a str, expires_ymd: u32 }
fn current_ids<'a>(rows: &[ScopedException<'a>], package: &str, scope: &str, as_of: u32) -> Vec<&'a str> {
    rows.iter().filter(|row| [row.advisory,row.package,row.owner,row.scope,row.reason].iter().all(|s| !s.is_empty()) && row.package == package && row.scope == scope && as_of <= row.expires_ymd).map(|row| row.advisory).collect()
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn selects_exact_scope_and_checks_every_field_and_expiry() {
    let good = || ScopedException { advisory:"SEC-A",package:"bytes",owner:"team",scope:"prod",reason:"migration",expires_ymd:20261201 };
    let mut rows = vec![good(),good(),good(),good(),good(),good(),good(),good(),good()];
    rows[1].advisory=""; rows[2].package=""; rows[3].owner=""; rows[4].scope=""; rows[5].reason="";
    rows[6].expires_ymd=20261130; rows[7].package="other"; rows[8].scope="test";
    assert_eq!(current_ids(&rows,"bytes","prod",20261201), vec!["SEC-A"]);
    assert!(current_ids(&rows,"bytes","prod",20261202).is_empty());
    assert!(current_ids(&rows,"","prod",20261201).is_empty());
    assert!(current_ids(&rows,"bytes","",20261201).is_empty());
    assert_eq!(current_ids(&[good(),good()],"bytes","prod",20261119),vec!["SEC-A","SEC-A"]);
    assert!(current_ids(&[],"bytes","prod",20261119).is_empty());
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
    {
      id: "dependency-advisory-exceptions-ledger-transfer",
      kind: "apply",
      title: "Rozlicz każdy wpis ledger",
      prompt:
        "Napisz `struct LedgerEntry<'a> { advisory: &'a str, package: &'a str, owner: &'a str, scope: &'a str, reason: &'a str, expires_ymd: u32 }`, porównywalny Debug `enum LedgerStatus { Missing, Expired, Current }` oraz `fn audit_ledger(rows: &[LedgerEntry<'_>], as_of: u32) -> Vec<LedgerStatus>`. Każdy wpis ma osobny wynik w kolejności wejścia. Brak dowolnego z pięciu pól tekstowych daje Missing z pierwszeństwem przed datą; kompletne dane po expires_ymd dają Expired, a do dnia expiry włącznie Current. Nie pobieraj daty systemowej.",
      solution: `struct LedgerEntry<'a> { advisory: &'a str, package: &'a str, owner: &'a str, scope: &'a str, reason: &'a str, expires_ymd: u32 }
#[derive(Debug, PartialEq, Eq)]
enum LedgerStatus { Missing, Expired, Current }
fn audit_ledger(rows: &[LedgerEntry<'_>], as_of: u32) -> Vec<LedgerStatus> {
    rows.iter().map(|row| {
        if !([row.advisory,row.package,row.owner,row.scope,row.reason].iter().all(|s| !s.is_empty())) { LedgerStatus::Missing }
        else if as_of > row.expires_ymd { LedgerStatus::Expired }
        else { LedgerStatus::Current }
    }).collect()
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn records_missing_expired_and_current_without_skipping_neighbors() {
    let good = || LedgerEntry { advisory:"SEC-B",package:"serde",owner:"security",scope:"release",reason:"upgrade",expires_ymd:20261201 };
    let mut rows = vec![good(),good(),good(),good(),good(),good(),good()];
    rows[1].advisory=""; rows[2].package=""; rows[3].owner=""; rows[4].scope=""; rows[5].reason=""; rows[6].expires_ymd=20261130;
    assert_eq!(audit_ledger(&rows,20261201),vec![LedgerStatus::Current,LedgerStatus::Missing,LedgerStatus::Missing,LedgerStatus::Missing,LedgerStatus::Missing,LedgerStatus::Missing,LedgerStatus::Expired]);
    assert_eq!(audit_ledger(&[good()],20261130),vec![LedgerStatus::Current]);
    assert_eq!(audit_ledger(&rows[1..2],20261202),vec![LedgerStatus::Missing]);
    assert!(audit_ledger(&[],20261201).is_empty());
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
  ],
  "dependency-release-dossier": [
    {
      id: "dependency-release-dossier-missing-transfer",
      kind: "apply",
      title: "Wylicz brakujące dowody",
      prompt:
        "Napisz `struct ReleaseCheck<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, archive: &'a str, config: &'a str, consumer: bool, publish: bool }`, porównywalny Debug `enum HoldReason { Manifest, Lock, Audit, Archive, Config, Consumer, Publish }` oraz `fn hold_reasons(proof: &ReleaseCheck<'_>) -> Vec<HoldReason>`. Zwróć wszystkie powody Hold w podanej kolejności enumu: pięć pustych pól, consumer=false, publish=true. Pusta lista oznacza kompletne dossier Release. Nie pomijaj późniejszych problemów po pierwszym błędzie.",
      solution: `struct ReleaseCheck<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, archive: &'a str, config: &'a str, consumer: bool, publish: bool }
#[derive(Debug, PartialEq, Eq)]
enum HoldReason { Manifest, Lock, Audit, Archive, Config, Consumer, Publish }
fn hold_reasons(proof: &ReleaseCheck<'_>) -> Vec<HoldReason> {
    let mut reasons=Vec::new();
    if proof.manifest.is_empty() { reasons.push(HoldReason::Manifest); }
    if proof.lock.is_empty() { reasons.push(HoldReason::Lock); }
    if proof.audit.is_empty() { reasons.push(HoldReason::Audit); }
    if proof.archive.is_empty() { reasons.push(HoldReason::Archive); }
    if proof.config.is_empty() { reasons.push(HoldReason::Config); }
    if !proof.consumer { reasons.push(HoldReason::Consumer); }
    if proof.publish { reasons.push(HoldReason::Publish); }
    reasons
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn enumerates_every_missing_boundary_in_fixed_order() {
    let good=|| ReleaseCheck {manifest:"m",lock:"l",audit:"a",archive:"z",config:"c",consumer:true,publish:false};
    assert!(hold_reasons(&good()).is_empty());
    assert_eq!(hold_reasons(&ReleaseCheck {manifest:"",lock:"",audit:"",archive:"",config:"",consumer:false,publish:true}),vec![HoldReason::Manifest,HoldReason::Lock,HoldReason::Audit,HoldReason::Archive,HoldReason::Config,HoldReason::Consumer,HoldReason::Publish]);
    let mut proof=good(); proof.lock=""; proof.archive=""; proof.publish=true;
    assert_eq!(hold_reasons(&proof),vec![HoldReason::Lock,HoldReason::Archive,HoldReason::Publish]);
    for i in 0..7 {
        let mut proof=good();
        let expected=match i {0=>{proof.manifest="";HoldReason::Manifest},1=>{proof.lock="";HoldReason::Lock},2=>{proof.audit="";HoldReason::Audit},3=>{proof.archive="";HoldReason::Archive},4=>{proof.config="";HoldReason::Config},5=>{proof.consumer=false;HoldReason::Consumer},_=>{proof.publish=true;HoldReason::Publish}};
        assert_eq!(hold_reasons(&proof),vec![expected]);
    }
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
    {
      id: "dependency-release-dossier-batch-transfer",
      kind: "apply",
      title: "Zdecyduj o partii dossier",
      prompt:
        "Napisz `struct CandidateDossier<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, archive: &'a str, config: &'a str, consumer: bool, publish: bool }` i `fn releasable_indices(rows: &[CandidateDossier<'_>]) -> Vec<usize>`. Każdy rekord rozpatrz niezależnie: Release wymaga wszystkich pięciu niepustych pól tekstowych, consumer=true i publish=false. Zwróć indeksy wyłącznie gotowych rekordów w kolejności wejścia, zachowując każde poprawne powtórzenie; brak dowodu w sąsiedzie nie może być uzupełniony przez poprawny rekord.",
      solution: `struct CandidateDossier<'a> { manifest: &'a str, lock: &'a str, audit: &'a str, archive: &'a str, config: &'a str, consumer: bool, publish: bool }
fn releasable_indices(rows: &[CandidateDossier<'_>]) -> Vec<usize> {
    rows.iter().enumerate().filter_map(|(i,row)| {
        ([row.manifest,row.lock,row.audit,row.archive,row.config].iter().all(|s| !s.is_empty()) && row.consumer && !row.publish).then_some(i)
    }).collect()
}`,
      evaluator: {
        kind: "tests",
        tests: `#[test]
fn evaluates_each_dossier_without_borrowing_proofs_from_neighbors() {
    let good=|| CandidateDossier {manifest:"m",lock:"l",audit:"a",archive:"z",config:"c",consumer:true,publish:false};
    let mut rows:Vec<_>=(0..9).map(|_|good()).collect();
    rows[1].manifest=""; rows[2].lock=""; rows[3].audit=""; rows[4].archive=""; rows[5].config=""; rows[6].consumer=false; rows[7].publish=true;
    assert_eq!(releasable_indices(&rows),vec![0,8]);
    rows[0].manifest=""; rows[8].consumer=false;
    assert!(releasable_indices(&rows).is_empty());
    assert_eq!(releasable_indices(&[good(),good()]),vec![0,1]);
    assert!(releasable_indices(&[]).is_empty());
}`,
      },
      evidenceKind: "transfer",
      evidenceGate: true,
    },
  ],
};
