import type { CapstoneContract } from "./contracts";

export interface CapstoneTransfer {
  primaryId: string;
  lessonId: string;
  title: string;
  prompt: string;
  hints: [string, string];
  contract: CapstoneContract;
}

// Bounded alternatives retain each criterion's behavior in a different domain/API.
// Existing lifecycle recall already exercises settlement and needs no new task.
export const capstoneTransfers: CapstoneTransfer[] = [
  {
    primaryId: "capstone-domain-validate",
    lessonId: "capstone-domain-boundary",
    title: "Transfer: granica pomiaru",
    prompt:
      "Przyjmij pomiar tylko gdy tag ma 1–6 bajtów ASCII [A-Za-z0-9_], a notatka 1–12 bajtów UTF-8 bez tab, CR i LF. Sprawdź osobno oba pola, równość limitów i Unicode.",
    hints: [
      "Tag ma ograniczony alfabet, natomiast notatka może zawierać polskie litery.",
      "Mierz bajty obu pól i odrzuć każdy z trzech zabronionych separatorów.",
    ],
    contract: {
      id: "capstone-domain-validate-transfer",
      solution: String.raw`fn measurement_ok(tag: &str, note: &str) -> bool { !tag.is_empty() && tag.len() <= 6 && tag.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_') && !note.is_empty() && note.len() <= 12 && !note.bytes().any(|b| matches!(b, b'\t' | b'\r' | b'\n')) }`,
      equivalent: String.raw`fn measurement_ok(tag: &str, note: &str) -> bool { if tag.is_empty() || tag.len() > 6 || note.is_empty() || note.len() > 12 { return false; } tag.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') && note.chars().all(|c| !['\t', '\r', '\n'].contains(&c)) }`,
      mutant: String.raw`fn measurement_ok(tag: &str, note: &str) -> bool { !tag.is_empty() && tag.len() <= 6 && tag.is_ascii() && !note.is_empty() && note.chars().count() <= 12 }`,
      tests: String.raw`#[test]
fn measurement_enforces_alphabet_bytes_and_all_separators() {
    assert!(measurement_ok("A_1234", "123456789012"));
    assert!(measurement_ok("x", "żżżżżż"));
    assert!(!measurement_ok("A_12345", "ok"));
    for tag in ["", "a-b", "a b", "ż"] { assert!(!measurement_ok(tag, "ok")); }
    for note in ["", "1234567890123", "żżżżżżż", "a\tb", "a\rb", "a\nb"] { assert!(!measurement_ok("x", note)); }
}`,
    },
  },
  {
    primaryId: "capstone-domain-errors",
    lessonId: "capstone-domain-boundary",
    title: "Transfer: publiczny błąd importera",
    prompt:
      "Zamień cztery warianty błędu importera na stałe BAD_INPUT, ALREADY_EXISTS, TRY_LATER i UNCONFIRMED. Szczegóły mogą zawierać SQL lub prywatną treść; wynik nie może od nich zależeć.",
    hints: [
      "Każdy wariant ma własny stały kod publiczny.",
      "Wzorzec wariantu może zignorować detail; nie kopiuj jego zawartości do odpowiedzi.",
    ],
    contract: {
      id: "capstone-domain-errors-transfer",
      solution: String.raw`enum ImportError<'a> { Malformed(&'a str), DuplicateKey(&'a str), Saturated(&'a str), Indeterminate(&'a str) }
fn external_code(error: ImportError<'_>) -> &'static str { match error { ImportError::Malformed(_) => "BAD_INPUT", ImportError::DuplicateKey(_) => "ALREADY_EXISTS", ImportError::Saturated(_) => "TRY_LATER", ImportError::Indeterminate(_) => "UNCONFIRMED" } }`,
      equivalent: String.raw`enum ImportError<'a> { Malformed(&'a str), DuplicateKey(&'a str), Saturated(&'a str), Indeterminate(&'a str) }
fn external_code(error: ImportError<'_>) -> &'static str { let codes = ["BAD_INPUT", "ALREADY_EXISTS", "TRY_LATER", "UNCONFIRMED"]; let index = match error { ImportError::Malformed(_) => 0, ImportError::DuplicateKey(_) => 1, ImportError::Saturated(_) => 2, ImportError::Indeterminate(_) => 3 }; codes[index] }`,
      mutant: String.raw`enum ImportError<'a> { Malformed(&'a str), DuplicateKey(&'a str), Saturated(&'a str), Indeterminate(&'a str) }
fn external_code(error: ImportError<'_>) -> &'static str { match error { ImportError::Malformed(_) | ImportError::DuplicateKey(_) => "BAD_INPUT", ImportError::Saturated(_) => "TRY_LATER", ImportError::Indeterminate(_) => "UNCONFIRMED" } }`,
      tests: String.raw`#[test]
fn importer_codes_preserve_four_categories_without_private_detail() {
    for detail in ["SQL secret", "private payload", ""] {
        assert_eq!(external_code(ImportError::Malformed(detail)), "BAD_INPUT");
        assert_eq!(external_code(ImportError::DuplicateKey(detail)), "ALREADY_EXISTS");
        assert_eq!(external_code(ImportError::Saturated(detail)), "TRY_LATER");
        assert_eq!(external_code(ImportError::Indeterminate(detail)), "UNCONFIRMED");
    }
}`,
    },
  },
  {
    primaryId: "capstone-commit-replay",
    lessonId: "capstone-idempotent-commit",
    title: "Transfer: receipt dostawy",
    prompt:
      "Wyszukaj dostawę po (tenant, token). Nowa tożsamość daje New, identyczna zawartość Replay z zachowanym numerem receipt, a zmieniona zawartość Conflict. Nie zmieniaj zapisanej dostawy.",
    hints: [
      "Najpierw porównaj oba składniki tożsamości, następnie treść.",
      "Replay zwraca receipt z magazynu, nawet gdy klient przesłał inny numer.",
    ],
    contract: {
      id: "capstone-commit-replay-transfer",
      solution: String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)] struct Delivery { tenant: &'static str, token: &'static str, content: &'static str, receipt: u64 }
#[derive(Debug, PartialEq, Eq)] enum Replay { New, Existing(u64), Conflict }
fn delivery_replay(saved: &[Delivery], incoming: Delivery) -> Replay { match saved.iter().find(|old| (old.tenant, old.token) == (incoming.tenant, incoming.token)) { None => Replay::New, Some(old) if old.content == incoming.content => Replay::Existing(old.receipt), Some(_) => Replay::Conflict } }`,
      equivalent: String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)] struct Delivery { tenant: &'static str, token: &'static str, content: &'static str, receipt: u64 }
#[derive(Debug, PartialEq, Eq)] enum Replay { New, Existing(u64), Conflict }
fn delivery_replay(saved: &[Delivery], incoming: Delivery) -> Replay { for old in saved { if old.tenant == incoming.tenant && old.token == incoming.token { return if old.content != incoming.content { Replay::Conflict } else { Replay::Existing(old.receipt) }; } } Replay::New }`,
      mutant: String.raw`#[derive(Clone, Copy, Debug, PartialEq, Eq)] struct Delivery { tenant: &'static str, token: &'static str, content: &'static str, receipt: u64 }
#[derive(Debug, PartialEq, Eq)] enum Replay { New, Existing(u64), Conflict }
fn delivery_replay(saved: &[Delivery], incoming: Delivery) -> Replay { match saved.iter().find(|old| old.token == incoming.token) { Some(_) => Replay::Existing(incoming.receipt), None => Replay::New } }`,
      tests: String.raw`#[test]
fn delivery_identity_content_and_original_receipt_survive_retry() {
    let original = Delivery { tenant: "shop", token: "t", content: "box", receipt: 41 };
    let saved = [Delivery { tenant: "other", token: "noise", content: "x", receipt: 1 }, original];
    assert_eq!(delivery_replay(&[], original), Replay::New);
    assert_eq!(delivery_replay(&saved, Delivery { receipt: 999, ..original }), Replay::Existing(41));
    assert_eq!(delivery_replay(&saved, Delivery { content: "crate", ..original }), Replay::Conflict);
    assert_eq!(delivery_replay(&saved, Delivery { tenant: "other", ..original }), Replay::New);
    assert_eq!(delivery_replay(&saved, Delivery { token: "new", ..original }), Replay::New);
    assert_eq!(saved[1], original);
}`,
    },
  },
  {
    primaryId: "capstone-commit-atomicity",
    lessonId: "capstone-idempotent-commit",
    title: "Transfer: atomowy import paczki",
    prompt:
      "Paczka zwiększa items i receipts o count, a serial o jeden. Zwróć nowy serial dopiero przy commit_ok i braku overflow każdego pola. Odrzucenie zachowuje cały BatchState, także gdy przepełni się dopiero ostatnie pole.",
    hints: [
      "Wylicz trzy nowe wartości przez checked_add przed mutacją.",
      "Błąd commit i overflow oznaczają None bez częściowego zapisu.",
    ],
    contract: {
      id: "capstone-commit-atomicity-transfer",
      solution: String.raw`#[derive(Debug, PartialEq, Eq)] struct BatchState { items: u16, receipts: u16, serial: u32 }
fn commit_batch(state: &mut BatchState, count: u16, commit_ok: bool) -> Option<u32> { if !commit_ok { return None; } let items = state.items.checked_add(count)?; let receipts = state.receipts.checked_add(count)?; let serial = state.serial.checked_add(1)?; *state = BatchState { items, receipts, serial }; Some(serial) }`,
      equivalent: String.raw`#[derive(Debug, PartialEq, Eq)] struct BatchState { items: u16, receipts: u16, serial: u32 }
fn commit_batch(state: &mut BatchState, count: u16, commit_ok: bool) -> Option<u32> { match (commit_ok, state.items.checked_add(count), state.receipts.checked_add(count), state.serial.checked_add(1)) { (true, Some(items), Some(receipts), Some(serial)) => { *state = BatchState { items, receipts, serial }; Some(serial) }, _ => None } }`,
      mutant: String.raw`#[derive(Debug, PartialEq, Eq)] struct BatchState { items: u16, receipts: u16, serial: u32 }
fn commit_batch(state: &mut BatchState, count: u16, commit_ok: bool) -> Option<u32> { state.items = state.items.saturating_add(count); state.receipts = state.receipts.saturating_add(count); state.serial = state.serial.saturating_add(1); commit_ok.then_some(state.serial) }`,
      tests: String.raw`#[test]
fn batch_failure_never_leaves_a_partial_record_or_receipt() {
    let mut state = BatchState { items: 2, receipts: 3, serial: 7 };
    assert_eq!(commit_batch(&mut state, 2, false), None);
    assert_eq!(state, BatchState { items: 2, receipts: 3, serial: 7 });
    assert_eq!(commit_batch(&mut state, 2, true), Some(8));
    assert_eq!(state, BatchState { items: 4, receipts: 5, serial: 8 });
    for (items, receipts, serial) in [(u16::MAX, 0, 7), (0, u16::MAX, 7), (0, 0, u32::MAX)] {
        let mut bounded = BatchState { items, receipts, serial };
        assert_eq!(commit_batch(&mut bounded, 1, true), None);
        assert_eq!(bounded, BatchState { items, receipts, serial });
    }
}`,
    },
  },
  {
    primaryId: "capstone-lifecycle-admit",
    lessonId: "capstone-bounded-lifecycle",
    title: "Transfer: admission renderera",
    prompt:
      "Przyjmij render tylko gdy renderer nie jest closing, active < connection_limit oraz queued < queue_limit. Zwiększ admitted raz po przyjęciu. Każde odrzucenie, również overflow admitted, zachowuje licznik.",
    hints: [
      "Limity połączeń i kolejki mają osobne warunki, także dla limitu zero.",
      "Sprawdź wszystkie warunki i checked_add przed przypisaniem admitted.",
    ],
    contract: {
      id: "capstone-lifecycle-admit-transfer",
      solution: String.raw`fn reserve_render(active: usize, connection_limit: usize, queued: usize, queue_limit: usize, closing: bool, admitted: &mut usize) -> bool { if closing || active >= connection_limit || queued >= queue_limit { return false; } if let Some(next) = admitted.checked_add(1) { *admitted = next; true } else { false } }`,
      equivalent: String.raw`fn reserve_render(active: usize, connection_limit: usize, queued: usize, queue_limit: usize, closing: bool, admitted: &mut usize) -> bool { match (closing, active < connection_limit, queued < queue_limit, admitted.checked_add(1)) { (false, true, true, Some(next)) => { *admitted = next; true }, _ => false } }`,
      mutant: String.raw`fn reserve_render(active: usize, connection_limit: usize, queued: usize, queue_limit: usize, closing: bool, admitted: &mut usize) -> bool { if closing || active + queued >= connection_limit { return false; } *admitted = admitted.saturating_add(1); true }`,
      tests: String.raw`#[test]
fn renderer_limits_are_independent_and_only_admission_counts() {
    let mut admitted = 10;
    assert!(reserve_render(2, 3, 4, 5, false, &mut admitted));
    assert_eq!(admitted, 11);
    for (active, cl, queued, ql, closing) in [(3,3,0,5,false),(0,3,5,5,false),(0,3,0,5,true),(0,0,0,5,false),(0,3,0,0,false)] {
        assert!(!reserve_render(active, cl, queued, ql, closing, &mut admitted));
        assert_eq!(admitted, 11);
    }
    admitted = usize::MAX;
    assert!(!reserve_render(0,3,0,5,false,&mut admitted));
    assert_eq!(admitted, usize::MAX);
}`,
    },
  },
  {
    primaryId: "capstone-protocol-decode",
    lessonId: "capstone-protocol-evolution",
    title: "Transfer: wersjonowany bilet eksportu",
    prompt:
      "Znormalizuj bilet: V1 ma dokładnie [job,label], V2 dokładnie [job,priority,label]. V1 i sentinel - w priority dają None. Zachowaj pozostałe pola i odrzuć niewłaściwą liczbę pól oraz każdą nieznaną wersję.",
    hints: [
      "Dopasuj jednocześnie wersję i pełny kształt slice.",
      'Sentinel oznacza brak priorytetu; nie jest tekstową wartością Some("-").',
    ],
    contract: {
      id: "capstone-protocol-decode-transfer",
      solution: String.raw`#[derive(Debug, PartialEq, Eq)] struct Ticket { job: String, priority: Option<String>, label: String }
fn export_ticket(version: u8, fields: &[&str]) -> Option<Ticket> { match (version, fields) { (1, [job, label]) => Some(Ticket { job: (*job).into(), priority: None, label: (*label).into() }), (2, [job, priority, label]) => Some(Ticket { job: (*job).into(), priority: (*priority != "-").then(|| (*priority).into()), label: (*label).into() }), _ => None } }`,
      equivalent: String.raw`#[derive(Debug, PartialEq, Eq)] struct Ticket { job: String, priority: Option<String>, label: String }
fn export_ticket(version: u8, fields: &[&str]) -> Option<Ticket> { let (job, priority, label) = if version == 1 && fields.len() == 2 { (fields[0], None, fields[1]) } else if version == 2 && fields.len() == 3 { (fields[0], if fields[1] == "-" { None } else { Some(fields[1].to_owned()) }, fields[2]) } else { return None; }; Some(Ticket { job: job.to_owned(), priority, label: label.to_owned() }) }`,
      mutant: String.raw`#[derive(Debug, PartialEq, Eq)] struct Ticket { job: String, priority: Option<String>, label: String }
fn export_ticket(version: u8, fields: &[&str]) -> Option<Ticket> { match fields { [job, label] => Some(Ticket { job: (*job).into(), priority: None, label: (*label).into() }), [job, priority, label, ..] => Some(Ticket { job: (*job).into(), priority: Some((*priority).into()), label: (*label).into() }), _ => None } }`,
      tests: String.raw`#[test]
fn ticket_normalization_preserves_legacy_meaning_and_rejects_bad_shapes() {
    assert_eq!(export_ticket(1, &["job", "archive"]), Some(Ticket { job: "job".into(), priority: None, label: "archive".into() }));
    assert_eq!(export_ticket(2, &["job", "-", "archive"]), export_ticket(1, &["job", "archive"]));
    assert_eq!(export_ticket(2, &["job", "urgent", "archive"]), Some(Ticket { job: "job".into(), priority: Some("urgent".into()), label: "archive".into() }));
    for version in [0,3,255] { assert_eq!(export_ticket(version, &["job", "archive"]), None); }
    for (version, fields) in [(1, vec!["job"]), (1, vec!["job","x","extra"]), (2, vec!["job","x"]), (2, vec!["job","-","x","extra"])] { assert_eq!(export_ticket(version, &fields), None); }
}`,
    },
  },
  {
    primaryId: "capstone-protocol-migrate",
    lessonId: "capstone-protocol-evolution",
    title: "Transfer: migracja indeksu eksportów",
    prompt:
      "Marker indeksu jest bieżącą wersją. Downgrade odrzuć bez zmiany, równa wersja daje Unchanged niezależnie od wyniku DDL. Dla wyższej wersji ustaw marker i zwróć Applied dopiero po Ok(()); Err(()) zachowuje marker.",
    hints: [
      "Najpierw porównaj marker z target.",
      "Nie publikuj target przed sprawdzeniem wyniku DDL.",
    ],
    contract: {
      id: "capstone-protocol-migrate-transfer",
      solution: String.raw`#[derive(Debug, PartialEq, Eq)] enum Upgrade { Applied, Unchanged, Rejected }
fn upgrade_index(marker: &mut u16, target: u16, ddl_result: Result<(), ()>) -> Upgrade { if *marker > target { Upgrade::Rejected } else if *marker == target { Upgrade::Unchanged } else if ddl_result.is_ok() { *marker = target; Upgrade::Applied } else { Upgrade::Rejected } }`,
      equivalent: String.raw`#[derive(Debug, PartialEq, Eq)] enum Upgrade { Applied, Unchanged, Rejected }
fn upgrade_index(marker: &mut u16, target: u16, ddl_result: Result<(), ()>) -> Upgrade { match (*marker < target, *marker == target, ddl_result) { (_, true, _) => Upgrade::Unchanged, (true, false, Ok(())) => { *marker = target; Upgrade::Applied }, _ => Upgrade::Rejected } }`,
      mutant: String.raw`#[derive(Debug, PartialEq, Eq)] enum Upgrade { Applied, Unchanged, Rejected }
fn upgrade_index(marker: &mut u16, target: u16, ddl_result: Result<(), ()>) -> Upgrade { if *marker == target { return Upgrade::Unchanged; } if *marker > target { return Upgrade::Rejected; } *marker = target; if ddl_result.is_ok() { Upgrade::Applied } else { Upgrade::Rejected } }`,
      tests: String.raw`#[test]
fn index_marker_is_published_only_after_successful_upgrade() {
    let mut marker = 4;
    assert_eq!(upgrade_index(&mut marker, 5, Err(())), Upgrade::Rejected);
    assert_eq!(marker, 4);
    assert_eq!(upgrade_index(&mut marker, 3, Ok(())), Upgrade::Rejected);
    assert_eq!(marker, 4);
    assert_eq!(upgrade_index(&mut marker, 4, Err(())), Upgrade::Unchanged);
    assert_eq!(marker, 4);
    assert_eq!(upgrade_index(&mut marker, 5, Ok(())), Upgrade::Applied);
    assert_eq!(marker, 5);
}`,
    },
  },
  {
    primaryId: "capstone-incident-correlate",
    lessonId: "capstone-incident-recovery",
    title: "Transfer: ślady importu faktur",
    prompt:
      "Zlicz osobno Started, Stored i Replied wyłącznie dla wskazanego (batch,item). Zachowaj wielokrotne próby, ignoruj Other i sygnały innych tożsamości. Sam Replied nie dodaje Stored.",
    hints: [
      "Filtruj po obu składnikach tożsamości.",
      "Każdy typ sygnału zwiększa wyłącznie własny licznik.",
    ],
    contract: {
      id: "capstone-incident-correlate-transfer",
      solution: String.raw`#[derive(Clone, Copy)] enum Mark { Started, Stored, Replied, Other }
struct Trace { batch: u32, item: u32, mark: Mark }
fn invoice_counts(traces: &[Trace], batch: u32, item: u32) -> (usize, usize, usize) { let mut counts = (0,0,0); for trace in traces { if (trace.batch, trace.item) != (batch,item) { continue; } match trace.mark { Mark::Started => counts.0 += 1, Mark::Stored => counts.1 += 1, Mark::Replied => counts.2 += 1, Mark::Other => {} } } counts }`,
      equivalent: String.raw`#[derive(Clone, Copy)] enum Mark { Started, Stored, Replied, Other }
struct Trace { batch: u32, item: u32, mark: Mark }
fn invoice_counts(traces: &[Trace], batch: u32, item: u32) -> (usize, usize, usize) { let selected: Vec<_> = traces.iter().filter(|t| t.batch == batch && t.item == item).collect(); (selected.iter().filter(|t| matches!(t.mark, Mark::Started)).count(), selected.iter().filter(|t| matches!(t.mark, Mark::Stored)).count(), selected.iter().filter(|t| matches!(t.mark, Mark::Replied)).count()) }`,
      mutant: String.raw`#[derive(Clone, Copy)] enum Mark { Started, Stored, Replied, Other }
struct Trace { batch: u32, item: u32, mark: Mark }
fn invoice_counts(traces: &[Trace], batch: u32, item: u32) -> (usize, usize, usize) { let selected: Vec<_> = traces.iter().filter(|t| t.item == item).collect(); (selected.iter().filter(|t| matches!(t.mark, Mark::Started)).count(), selected.iter().filter(|t| matches!(t.mark, Mark::Stored | Mark::Replied)).count(), selected.iter().filter(|t| matches!(t.mark, Mark::Replied)).count()) }`,
      tests: String.raw`#[test]
fn invoice_correlation_is_scoped_and_keeps_transport_separate() {
    let traces = [Trace { batch: 1, item: 2, mark: Mark::Started }, Trace { batch: 1, item: 2, mark: Mark::Started }, Trace { batch: 1, item: 2, mark: Mark::Stored }, Trace { batch: 1, item: 2, mark: Mark::Replied }, Trace { batch: 9, item: 2, mark: Mark::Stored }, Trace { batch: 1, item: 9, mark: Mark::Replied }, Trace { batch: 1, item: 2, mark: Mark::Other }];
    assert_eq!(invoice_counts(&traces, 1, 2), (2,1,1));
    assert_eq!(invoice_counts(&traces, 1, 9), (0,0,1));
    assert_eq!(invoice_counts(&traces, 7, 7), (0,0,0));
    assert_eq!(invoice_counts(&[], 1, 2), (0,0,0));
}`,
    },
  },
  {
    primaryId: "capstone-incident-decide",
    lessonId: "capstone-incident-recovery",
    title: "Transfer: wynik zlecenia archiwizacji",
    prompt:
      "ArchiveFacts zawiera cztery opcjonalne sygnały. Brak dowolnego daje Unknown. Przy pełnym dowodzie najpierw rozpoznaj odrzucenie admission, potem commit z/bez odpowiedzi, potem jawny rollback. Bez commit ani rollback pozostaw Unknown.",
    hints: [
      "None jest brakiem dowodu, a nie false; sprawdź kompletność wszystkich czterech pól.",
      "Dowód commit i delivery to osobne fakty; rollback wymaga jawnego sygnału.",
    ],
    contract: {
      id: "capstone-incident-decide-transfer",
      solution: String.raw`struct ArchiveFacts { admitted: Option<bool>, stored: Option<bool>, replied: Option<bool>, rollback: Option<bool> }
#[derive(Debug, PartialEq, Eq)] enum ArchiveOutcome { Unknown, Rejected, Confirmed, StoredNoReply, RolledBack }
fn archive_outcome(facts: ArchiveFacts) -> ArchiveOutcome { let (Some(admitted), Some(stored), Some(replied), Some(rollback)) = (facts.admitted, facts.stored, facts.replied, facts.rollback) else { return ArchiveOutcome::Unknown; }; if !admitted { ArchiveOutcome::Rejected } else if stored { if replied { ArchiveOutcome::Confirmed } else { ArchiveOutcome::StoredNoReply } } else if rollback { ArchiveOutcome::RolledBack } else { ArchiveOutcome::Unknown } }`,
      equivalent: String.raw`struct ArchiveFacts { admitted: Option<bool>, stored: Option<bool>, replied: Option<bool>, rollback: Option<bool> }
#[derive(Debug, PartialEq, Eq)] enum ArchiveOutcome { Unknown, Rejected, Confirmed, StoredNoReply, RolledBack }
fn archive_outcome(facts: ArchiveFacts) -> ArchiveOutcome { match (facts.admitted, facts.stored, facts.replied, facts.rollback) { (None,_,_,_) | (_,None,_,_) | (_,_,None,_) | (_,_,_,None) => ArchiveOutcome::Unknown, (Some(false),_,_,_) => ArchiveOutcome::Rejected, (_,Some(true),Some(true),_) => ArchiveOutcome::Confirmed, (_,Some(true),Some(false),_) => ArchiveOutcome::StoredNoReply, (_,Some(false),_,Some(true)) => ArchiveOutcome::RolledBack, _ => ArchiveOutcome::Unknown } }`,
      mutant: String.raw`struct ArchiveFacts { admitted: Option<bool>, stored: Option<bool>, replied: Option<bool>, rollback: Option<bool> }
#[derive(Debug, PartialEq, Eq)] enum ArchiveOutcome { Unknown, Rejected, Confirmed, StoredNoReply, RolledBack }
fn archive_outcome(facts: ArchiveFacts) -> ArchiveOutcome { match (facts.admitted, facts.stored) { (Some(false),_) => ArchiveOutcome::Rejected, (_,Some(true)) => ArchiveOutcome::Confirmed, _ => ArchiveOutcome::Unknown } }`,
      tests: String.raw`#[test]
fn archival_decision_requires_every_signal_and_explicit_storage_evidence() {
    let decide = |a,s,r,b| archive_outcome(ArchiveFacts { admitted:a, stored:s, replied:r, rollback:b });
    assert_eq!(decide(None,Some(true),Some(true),Some(false)), ArchiveOutcome::Unknown);
    assert_eq!(decide(Some(false),None,Some(false),Some(false)), ArchiveOutcome::Unknown);
    assert_eq!(decide(Some(true),Some(true),None,Some(false)), ArchiveOutcome::Unknown);
    assert_eq!(decide(Some(true),Some(true),Some(true),None), ArchiveOutcome::Unknown);
    assert_eq!(decide(Some(false),Some(false),Some(false),Some(false)), ArchiveOutcome::Rejected);
    assert_eq!(decide(Some(true),Some(true),Some(true),Some(false)), ArchiveOutcome::Confirmed);
    assert_eq!(decide(Some(true),Some(true),Some(false),Some(false)), ArchiveOutcome::StoredNoReply);
    assert_eq!(decide(Some(true),Some(false),Some(false),Some(true)), ArchiveOutcome::RolledBack);
    assert_eq!(decide(Some(true),Some(false),Some(true),Some(false)), ArchiveOutcome::Unknown);
}`,
    },
  },
  {
    primaryId: "capstone-release-bind",
    lessonId: "capstone-release-evidence",
    title: "Transfer: dowód archiwum eksportera",
    prompt:
      "Zwiąż ArchiveEvidence z expected digest: wszystkie kontrole muszą istnieć i przejść, digest musi pasować, a obserwacja mieć wiek 0–5 dni. Odrzuć przyszłą datę, niekompletność oraz inny artefakt.",
    hints: [
      "Pusta lista nie jest kompletnym dowodem kontroli.",
      "Sprawdź datę przed odejmowaniem; piąty dzień jest jeszcze poprawny.",
    ],
    contract: {
      id: "capstone-release-bind-transfer",
      solution: String.raw`struct ArchiveEvidence<'a> { digest: &'a str, checks: &'a [bool], observed_day: u64 }
fn archive_evidence_ok(report: ArchiveEvidence<'_>, expected: &str, today: u64) -> bool { report.digest == expected && !report.checks.is_empty() && report.checks.iter().all(|ok| *ok) && today.checked_sub(report.observed_day).is_some_and(|age| age <= 5) }`,
      equivalent: String.raw`struct ArchiveEvidence<'a> { digest: &'a str, checks: &'a [bool], observed_day: u64 }
fn archive_evidence_ok(report: ArchiveEvidence<'_>, expected: &str, today: u64) -> bool { if report.digest != expected || report.checks.is_empty() || report.checks.contains(&false) { return false; } match today.checked_sub(report.observed_day) { Some(0..=5) => true, _ => false } }`,
      mutant: String.raw`struct ArchiveEvidence<'a> { digest: &'a str, checks: &'a [bool], observed_day: u64 }
fn archive_evidence_ok(report: ArchiveEvidence<'_>, expected: &str, today: u64) -> bool { report.checks.iter().all(|ok| *ok) && today.saturating_sub(report.observed_day) <= 5 }`,
      tests: String.raw`#[test]
fn archive_report_requires_matching_complete_and_fresh_evidence() {
    let check = |digest, checks, observed_day, today| archive_evidence_ok(ArchiveEvidence { digest, checks, observed_day }, "sha:a", today);
    assert!(check("sha:a", &[true,true], 10, 15));
    assert!(check("sha:a", &[true], 10, 10));
    assert!(!check("sha:b", &[true], 10, 11));
    assert!(!check("sha:a", &[], 10, 11));
    assert!(!check("sha:a", &[true,false], 10, 11));
    assert!(!check("sha:a", &[true], 10, 16));
    assert!(!check("sha:a", &[true], 11, 10));
}`,
    },
  },
  {
    primaryId: "capstone-release-decide",
    lessonId: "capstone-release-evidence",
    title: "Transfer: decyzja wydania eksportera",
    prompt:
      "FreshBoundEvidence potwierdza wcześniejszą bramkę artefaktu. Zwróć Candidate tylko gdy compatibility i recovery są true, a supply chain ma KnownClean. Unknown oraz KnownBlocked utrzymują Hold, tak jak brak dowolnego wymaganego testu.",
    hints: [
      "Wcześniejszy dowód artefaktu nie zastępuje kompatybilności i recovery.",
      "Dopuszczony jest wyłącznie jawny KnownClean; Unknown nie daje pozytywnego dowodu.",
    ],
    contract: {
      id: "capstone-release-decide-transfer",
      solution: String.raw`struct FreshBoundEvidence;
#[derive(Clone, Copy)] enum Supply { Unknown, KnownBlocked, KnownClean }
#[derive(Debug, PartialEq, Eq)] enum ExportRelease { Candidate, Hold }
fn exporter_release(_: FreshBoundEvidence, compatibility: bool, recovery: bool, supply: Supply) -> ExportRelease { if compatibility && recovery && matches!(supply, Supply::KnownClean) { ExportRelease::Candidate } else { ExportRelease::Hold } }`,
      equivalent: String.raw`struct FreshBoundEvidence;
#[derive(Clone, Copy)] enum Supply { Unknown, KnownBlocked, KnownClean }
#[derive(Debug, PartialEq, Eq)] enum ExportRelease { Candidate, Hold }
fn exporter_release(_: FreshBoundEvidence, compatibility: bool, recovery: bool, supply: Supply) -> ExportRelease { match (compatibility, recovery, supply) { (true,true,Supply::KnownClean) => ExportRelease::Candidate, _ => ExportRelease::Hold } }`,
      mutant: String.raw`struct FreshBoundEvidence;
#[derive(Clone, Copy)] enum Supply { Unknown, KnownBlocked, KnownClean }
#[derive(Debug, PartialEq, Eq)] enum ExportRelease { Candidate, Hold }
fn exporter_release(_: FreshBoundEvidence, compatibility: bool, recovery: bool, supply: Supply) -> ExportRelease { if compatibility && recovery { ExportRelease::Candidate } else { ExportRelease::Hold } }`,
      tests: String.raw`#[test]
fn exporter_release_needs_compatibility_recovery_and_known_clean_supply() {
    assert_eq!(exporter_release(FreshBoundEvidence,true,true,Supply::KnownClean), ExportRelease::Candidate);
    for supply in [Supply::Unknown, Supply::KnownBlocked] { assert_eq!(exporter_release(FreshBoundEvidence,true,true,supply), ExportRelease::Hold); }
    for (compatibility,recovery) in [(false,true),(true,false),(false,false)] { assert_eq!(exporter_release(FreshBoundEvidence,compatibility,recovery,Supply::KnownClean), ExportRelease::Hold); }
}`,
    },
  },
];
