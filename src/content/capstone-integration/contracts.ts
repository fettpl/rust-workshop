export interface CapstoneContract {
  id: string;
  solution: string;
  equivalent: string;
  mutant: string;
  tests: string;
}

const contract = (
  id: string,
  solution: string,
  equivalent: string,
  mutant: string,
  tests: string,
): CapstoneContract => ({ id, solution, equivalent, mutant, tests });

export const capstoneContracts: Record<string, CapstoneContract> = {
  "capstone-domain-validate": contract(
    "capstone-domain-validate",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Verdict { Accept, Reject }
fn validate(source: &str, message: &str) -> Verdict {
    let identifier = !source.is_empty() && source.len() <= 4 && source.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_');
    let message_ok = !message.is_empty() && message.len() <= 8 && !message.bytes().any(|byte| matches!(byte, b'\t' | b'\r' | b'\n'));
    if identifier && message_ok { Verdict::Accept } else { Verdict::Reject }
}`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Verdict { Accept, Reject }
fn validate(source: &str, message: &str) -> Verdict {
    let source_ok = match source { "" => false, value => value.len() <= 4 && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') };
    let message_ok = !message.is_empty() && message.as_bytes().len() <= 8 && message.chars().all(|c| c != '\t' && c != '\r' && c != '\n');
    match (source_ok, message_ok) { (true, true) => Verdict::Accept, _ => Verdict::Reject }
}`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Verdict { Accept, Reject }
fn validate(source: &str, message: &str) -> Verdict {
    let identifier = !source.is_empty() && source.len() < 4 && source.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_');
    let message_ok = !message.is_empty() && message.len() <= 8 && !message.bytes().any(|byte| matches!(byte, b'\t' | b'\r' | b'\n'));
    if identifier && message_ok { Verdict::Accept } else { Verdict::Reject }
}`,
    String.raw`#[test]
fn validates_domain_boundaries() {
    assert_eq!(validate("a1_", "ok"), Verdict::Accept);
    assert_eq!(validate("abcd", "12345678"), Verdict::Accept);
    assert_eq!(validate("abcde", "ok"), Verdict::Reject);
    assert_eq!(validate("a-b", "ok"), Verdict::Reject);
    assert_eq!(validate("a1", "żżżżż"), Verdict::Reject);
    assert_eq!(validate("a1", "a\tb"), Verdict::Reject);
}`,
  ),
  "capstone-domain-errors": contract(
    "capstone-domain-errors",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Failure { Invalid, Conflict, Busy, Unknown }
fn public_code(failure: Failure) -> &'static str { match failure { Failure::Invalid => "INVALID", Failure::Conflict => "CONFLICT", Failure::Busy => "BUSY", Failure::Unknown => "UNKNOWN" } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Failure { Invalid, Conflict, Busy, Unknown }
fn public_code(failure: Failure) -> &'static str {
    let index = match failure { Failure::Invalid => 0, Failure::Conflict => 1, Failure::Busy => 2, Failure::Unknown => 3 };
    ["INVALID", "CONFLICT", "BUSY", "UNKNOWN"][index]
}`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Failure { Invalid, Conflict, Busy, Unknown }
fn public_code(failure: Failure) -> &'static str { match failure { Failure::Invalid => "INVALID", Failure::Conflict => "INVALID", Failure::Busy => "BUSY", Failure::Unknown => "UNKNOWN" } }`,
    String.raw`#[test]
fn maps_domain_failures_to_stable_codes() {
    assert_eq!(public_code(Failure::Invalid), "INVALID");
    assert_eq!(public_code(Failure::Conflict), "CONFLICT");
    assert_eq!(public_code(Failure::Busy), "BUSY");
    assert_eq!(public_code(Failure::Unknown), "UNKNOWN");
}`,
  ),
  "capstone-commit-replay": contract(
    "capstone-commit-replay",
    String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Record { source: &'static str, key: &'static str, body: &'static str, sequence: u64 }
#[derive(Debug, PartialEq, Eq)] enum Decision { Insert, Duplicate(u64), Conflict }
fn decide(old: Option<Record>, incoming: Record) -> Decision { match old { None => Decision::Insert, Some(previous) if previous.source == incoming.source && previous.key == incoming.key && previous.body == incoming.body => Decision::Duplicate(previous.sequence), Some(_) => Decision::Conflict } }`,
    String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Record { source: &'static str, key: &'static str, body: &'static str, sequence: u64 }
#[derive(Debug, PartialEq, Eq)] enum Decision { Insert, Duplicate(u64), Conflict }
fn decide(old: Option<Record>, incoming: Record) -> Decision {
    old.map_or(Decision::Insert, |previous| if (previous.source, previous.key, previous.body) == (incoming.source, incoming.key, incoming.body) { Decision::Duplicate(previous.sequence) } else { Decision::Conflict })
}`,
    String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Record { source: &'static str, key: &'static str, body: &'static str, sequence: u64 }
#[derive(Debug, PartialEq, Eq)] enum Decision { Insert, Duplicate(u64), Conflict }
fn decide(old: Option<Record>, incoming: Record) -> Decision { let _ = incoming; old.map_or(Decision::Insert, |previous| Decision::Duplicate(previous.sequence + 1)) }`,
    String.raw`#[test]
fn distinguishes_first_insert_replay_and_changed_payload() {
    let first = Record { source: "api", key: "k", body: "one", sequence: 7 };
    assert_eq!(decide(None, first), Decision::Insert);
    assert_eq!(decide(Some(first), Record { source: "api", key: "k", body: "one", sequence: 99 }), Decision::Duplicate(7));
    assert_eq!(decide(Some(first), Record { source: "api", key: "k", body: "two", sequence: 99 }), Decision::Conflict);
    assert_eq!(decide(None, Record { source: "other", key: "k", body: "one", sequence: 99 }), Decision::Insert);
}`,
  ),
  "capstone-commit-atomicity": contract(
    "capstone-commit-atomicity",
    String.raw`#[derive(Debug, PartialEq, Eq)] struct State { rows: u32, receipts: u32, next_sequence: u64 }
fn apply(state: &mut State, commit: bool) -> Option<u64> { if !commit { return None; } let rows = state.rows.checked_add(1)?; let receipts = state.receipts.checked_add(1)?; let sequence = state.next_sequence.checked_add(1)?; state.rows = rows; state.receipts = receipts; state.next_sequence = sequence; Some(sequence) }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] struct State { rows: u32, receipts: u32, next_sequence: u64 }
fn apply(state: &mut State, commit: bool) -> Option<u64> { if !commit { return None; } match (state.rows.checked_add(1), state.receipts.checked_add(1), state.next_sequence.checked_add(1)) { (Some(rows), Some(receipts), Some(sequence)) => { state.rows = rows; state.receipts = receipts; state.next_sequence = sequence; Some(sequence) }, _ => None } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] struct State { rows: u32, receipts: u32, next_sequence: u64 }
fn apply(state: &mut State, commit: bool) -> Option<u64> { state.rows += 1; state.receipts += 1; state.next_sequence += 1; commit.then_some(state.next_sequence) }`,
    String.raw`#[test]
fn failed_commit_leaves_records_and_receipts_unchanged() {
    let mut state = State { rows: 2, receipts: 2, next_sequence: 7 };
    assert_eq!(apply(&mut state, false), None);
    assert_eq!(state, State { rows: 2, receipts: 2, next_sequence: 7 });
    assert_eq!(apply(&mut state, true), Some(8));
    assert_eq!(state, State { rows: 3, receipts: 3, next_sequence: 8 });
    let mut bounded = State { rows: 0, receipts: 0, next_sequence: u64::MAX };
    assert_eq!(apply(&mut bounded, true), None);
    assert_eq!(bounded, State { rows: 0, receipts: 0, next_sequence: u64::MAX });
    let mut full_rows = State { rows: u32::MAX, receipts: 0, next_sequence: 7 };
    assert_eq!(apply(&mut full_rows, true), None);
    assert_eq!(full_rows, State { rows: u32::MAX, receipts: 0, next_sequence: 7 });
}`,
  ),
  "capstone-lifecycle-admit": contract(
    "capstone-lifecycle-admit",
    String.raw`fn admit(active_connections: usize, connection_limit: usize, queued_storage: usize, queue_limit: usize, closing: bool, accepted: usize) -> (bool, usize) { if closing || active_connections >= connection_limit || queued_storage >= queue_limit { (false, accepted) } else { (true, accepted + 1) } }`,
    String.raw`fn admit(active_connections: usize, connection_limit: usize, queued_storage: usize, queue_limit: usize, closing: bool, accepted: usize) -> (bool, usize) { match (closing, active_connections < connection_limit, queued_storage < queue_limit) { (false, true, true) => (true, accepted.checked_add(1).expect("bounded")), _ => (false, accepted) } }`,
    String.raw`fn admit(active_connections: usize, connection_limit: usize, queued_storage: usize, queue_limit: usize, closing: bool, accepted: usize) -> (bool, usize) { let _ = (connection_limit, queue_limit); if closing || active_connections + queued_storage >= 8 { (false, accepted + 1) } else { (true, accepted + 1) } }`,
    String.raw`#[test]
fn admission_counts_active_and_queue_and_closes_cleanly() {
    assert_eq!(admit(0, 8, 0, 16, false, 3), (true, 4));
    assert_eq!(admit(7, 8, 15, 16, false, 4), (true, 5));
    assert_eq!(admit(8, 8, 0, 16, false, 5), (false, 5));
    assert_eq!(admit(0, 8, 16, 16, false, 5), (false, 5));
    assert_eq!(admit(0, 8, 0, 16, true, 5), (false, 5));
}`,
  ),
  "capstone-lifecycle-settle": contract(
    "capstone-lifecycle-settle",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum State { Draining, Pending, Stopped }
fn settle(accepted: usize, completed: usize, worker_joined: bool) -> State { if worker_joined && accepted == completed { State::Stopped } else if accepted > completed { State::Pending } else { State::Draining } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum State { Draining, Pending, Stopped }
fn settle(accepted: usize, completed: usize, worker_joined: bool) -> State { match (worker_joined, accepted.cmp(&completed)) { (true, std::cmp::Ordering::Equal) => State::Stopped, (_, std::cmp::Ordering::Greater) => State::Pending, _ => State::Draining } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum State { Draining, Pending, Stopped }
fn settle(accepted: usize, completed: usize, worker_joined: bool) -> State { if accepted == completed { State::Stopped } else if accepted > completed { State::Pending } else if worker_joined { State::Draining } else { State::Draining } }`,
    String.raw`#[test]
fn stopping_requires_join_and_balanced_accounting() {
    assert_eq!(settle(3, 3, true), State::Stopped);
    assert_eq!(settle(3, 2, true), State::Pending);
    assert_eq!(settle(3, 3, false), State::Draining);
    assert_eq!(settle(2, 3, true), State::Draining);
}`,
  ),
  "capstone-protocol-decode": contract(
    "capstone-protocol-decode",
    String.raw`#[derive(Debug, PartialEq, Eq)] struct Record { source: String, key: String, correlation: Option<String>, message: String }
fn normalize(version: u8, fields: &[&str]) -> Option<Record> { match (version, fields) { (1, [source, key, message]) => Some(Record { source: source.to_string(), key: key.to_string(), correlation: None, message: message.to_string() }), (2, [source, key, correlation, message]) if *correlation != "-" => Some(Record { source: source.to_string(), key: key.to_string(), correlation: Some(correlation.to_string()), message: message.to_string() }), (2, [source, key, "-", message]) => Some(Record { source: source.to_string(), key: key.to_string(), correlation: None, message: message.to_string() }), _ => None } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] struct Record { source: String, key: String, correlation: Option<String>, message: String }
fn normalize(version: u8, fields: &[&str]) -> Option<Record> { if version == 1 && fields.len() == 3 { return Some(Record { source: fields[0].into(), key: fields[1].into(), correlation: None, message: fields[2].into() }); } if version == 2 && fields.len() == 4 { return Some(Record { source: fields[0].into(), key: fields[1].into(), correlation: (fields[2] != "-").then(|| fields[2].into()), message: fields[3].into() }); } None }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] struct Record { source: String, key: String, correlation: Option<String>, message: String }
fn normalize(version: u8, fields: &[&str]) -> Option<Record> { match (version, fields) { (1, [source, key, message]) => Some(Record { source: source.to_string(), key: key.to_string(), correlation: Some("-".to_string()), message: message.to_string() }), (2, [source, key, correlation, message]) => Some(Record { source: source.to_string(), key: key.to_string(), correlation: Some(correlation.to_string()), message: message.to_string() }), _ => None } }`,
    String.raw`#[test]
fn normalizes_supported_versions_and_rejects_shape_or_version() {
    assert_eq!(normalize(1, &["s", "k", "m"]), Some(Record { source: "s".into(), key: "k".into(), correlation: None, message: "m".into() }));
    assert_eq!(normalize(2, &["s", "k", "corr", "m"]), Some(Record { source: "s".into(), key: "k".into(), correlation: Some("corr".into()), message: "m".into() }));
    assert_eq!(normalize(2, &["s", "k", "-", "m"]), Some(Record { source: "s".into(), key: "k".into(), correlation: None, message: "m".into() }));
    assert_eq!(normalize(3, &["s", "k", "m"]), None);
    assert_eq!(normalize(2, &["s", "k", "c", "m", "extra"]), None);
}`,
  ),
  "capstone-protocol-migrate": contract(
    "capstone-protocol-migrate",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Migration { Upgrade, Noop, Reject }
fn migrate(current: u32, target: u32, schema_marker: &mut u32, alter_succeeds: bool) -> Migration { if current > target { Migration::Reject } else if current == target { Migration::Noop } else if alter_succeeds { *schema_marker = target; Migration::Upgrade } else { Migration::Reject } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Migration { Upgrade, Noop, Reject }
fn migrate(current: u32, target: u32, schema_marker: &mut u32, alter_succeeds: bool) -> Migration { match current.cmp(&target) { std::cmp::Ordering::Greater => Migration::Reject, std::cmp::Ordering::Equal => Migration::Noop, std::cmp::Ordering::Less if alter_succeeds => { *schema_marker = target; Migration::Upgrade }, std::cmp::Ordering::Less => Migration::Reject } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Migration { Upgrade, Noop, Reject }
fn migrate(current: u32, target: u32, schema_marker: &mut u32, alter_succeeds: bool) -> Migration { if current < target { *schema_marker = target; if alter_succeeds { Migration::Upgrade } else { Migration::Reject } } else if current == target { Migration::Noop } else { Migration::Reject } }`,
    String.raw`#[test]
fn migration_is_transactional_in_its_decision() {
    let mut marker = 1;
    assert_eq!(migrate(1, 2, &mut marker, true), Migration::Upgrade);
    assert_eq!(marker, 2);
    assert_eq!(migrate(2, 2, &mut marker, true), Migration::Noop);
    assert_eq!(migrate(3, 2, &mut marker, true), Migration::Reject);
    marker = 1;
    assert_eq!(migrate(1, 2, &mut marker, false), Migration::Reject);
    assert_eq!(marker, 1);
}`,
  ),
  "capstone-incident-correlate": contract(
    "capstone-incident-correlate",
    String.raw`#[derive(Clone, Copy)] struct Signal { request: &'static str, kind: &'static str }
fn correlate(signals: &[Signal], request: &str) -> (usize, usize, usize) { signals.iter().filter(|signal| signal.request == request).fold((0, 0, 0), |(attempts, committed, delivered), signal| (attempts + (signal.kind == "attempt") as usize, committed + (signal.kind == "committed") as usize, delivered + (signal.kind == "delivered") as usize)) }`,
    String.raw`#[derive(Clone, Copy)] struct Signal { request: &'static str, kind: &'static str }
fn correlate(signals: &[Signal], request: &str) -> (usize, usize, usize) { let matching: Vec<_> = signals.iter().filter(|signal| signal.request == request).collect(); (matching.iter().filter(|signal| signal.kind == "attempt").count(), matching.iter().filter(|signal| signal.kind == "committed").count(), matching.iter().filter(|signal| signal.kind == "delivered").count()) }`,
    String.raw`#[derive(Clone, Copy)] struct Signal { request: &'static str, kind: &'static str }
fn correlate(signals: &[Signal], request: &str) -> (usize, usize, usize) { let _ = request; signals.iter().fold((0, 0, 0), |(attempts, committed, delivered), signal| (attempts + (signal.kind == "attempt") as usize, committed + (signal.kind == "committed") as usize, delivered + (signal.kind == "delivered") as usize)) }`,
    String.raw`#[test]
fn correlation_keeps_attempt_and_storage_counts_separate() {
    let signals = [Signal { request: "a", kind: "attempt" }, Signal { request: "a", kind: "committed" }, Signal { request: "a", kind: "delivered" }, Signal { request: "b", kind: "attempt" }, Signal { request: "a", kind: "attempt" }];
    assert_eq!(correlate(&signals, "a"), (2, 1, 1));
    assert_eq!(correlate(&signals, "missing"), (0, 0, 0));
}`,
  ),
  "capstone-incident-decide": contract(
    "capstone-incident-decide",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Decision { Unknown, Committed, CommittedUndelivered, RolledBack, Rejected }
fn decide(admitted: Option<bool>, committed: Option<bool>, delivered: Option<bool>, rolled_back: Option<bool>) -> Decision { match (admitted, committed, delivered, rolled_back) { (None, _, _, _) | (_, None, _, _) | (_, _, None, _) | (_, _, _, None) => Decision::Unknown, (Some(false), _, _, _) => Decision::Rejected, (Some(true), Some(true), Some(true), _) => Decision::Committed, (Some(true), Some(true), Some(false), _) => Decision::CommittedUndelivered, (Some(true), Some(false), _, Some(true)) => Decision::RolledBack, _ => Decision::Unknown } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Decision { Unknown, Committed, CommittedUndelivered, RolledBack, Rejected }
fn decide(admitted: Option<bool>, committed: Option<bool>, delivered: Option<bool>, rolled_back: Option<bool>) -> Decision { if [admitted, committed, delivered, rolled_back].iter().any(Option::is_none) { return Decision::Unknown; } if admitted == Some(false) { return Decision::Rejected; } match (committed, delivered, rolled_back) { (Some(true), Some(true), _) => Decision::Committed, (Some(true), Some(false), _) => Decision::CommittedUndelivered, (Some(false), _, Some(true)) => Decision::RolledBack, _ => Decision::Unknown } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Decision { Unknown, Committed, CommittedUndelivered, RolledBack, Rejected }
fn decide(admitted: Option<bool>, committed: Option<bool>, delivered: Option<bool>, rolled_back: Option<bool>) -> Decision { match (admitted, committed, delivered, rolled_back) { (Some(false), _, _, _) => Decision::Rejected, (Some(true), Some(true), _, _) => Decision::Committed, (Some(true), Some(false), Some(false), Some(true)) => Decision::RolledBack, _ => Decision::Unknown } }`,
    String.raw`#[test]
fn missing_commit_evidence_stays_unknown() {
    assert_eq!(decide(None, Some(true), Some(true), Some(false)), Decision::Unknown);
    assert_eq!(decide(Some(false), Some(false), Some(false), Some(false)), Decision::Rejected);
    assert_eq!(decide(Some(true), Some(true), Some(true), Some(false)), Decision::Committed);
    assert_eq!(decide(Some(true), Some(true), Some(false), Some(false)), Decision::CommittedUndelivered);
    assert_eq!(decide(Some(true), Some(false), Some(false), Some(true)), Decision::RolledBack);
    assert_eq!(decide(Some(true), Some(false), Some(false), Some(false)), Decision::Unknown);
}`,
  ),
  "capstone-release-bind": contract(
    "capstone-release-bind",
    String.raw`fn bind(actual: &str, expected: &str, checks_complete: bool, observed_at: u64, now: u64) -> bool { checks_complete && actual == expected && observed_at <= now && now - observed_at <= 7 }`,
    String.raw`fn bind(actual: &str, expected: &str, checks_complete: bool, observed_at: u64, now: u64) -> bool { matches!((checks_complete, actual.as_bytes() == expected.as_bytes()), (true, true)) && now.checked_sub(observed_at).is_some_and(|age| age <= 7) }`,
    String.raw`fn bind(actual: &str, expected: &str, checks_complete: bool, observed_at: u64, now: u64) -> bool { checks_complete && actual == expected && now.saturating_sub(observed_at) <= 7 }`,
    String.raw`#[test]
fn release_evidence_is_bound_to_digest_and_complete_checks() {
    assert!(bind("sha256:a", "sha256:a", true, 10, 17));
    assert!(!bind("sha256:b", "sha256:a", true, 10, 17));
    assert!(!bind("sha256:a", "sha256:a", false, 10, 17));
    assert!(!bind("sha256:a", "sha256:a", true, 10, 18));
    assert!(!bind("sha256:a", "sha256:a", true, 20, 19));
}`,
  ),
  "capstone-release-decide": contract(
    "capstone-release-decide",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Status { Candidate, Hold }
fn decide(compatibility: bool, recovery: bool, supply_chain_known: bool) -> Status { if compatibility && recovery && supply_chain_known { Status::Candidate } else { Status::Hold } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Status { Candidate, Hold }
fn decide(compatibility: bool, recovery: bool, supply_chain_known: bool) -> Status { match (compatibility, recovery, supply_chain_known) { (true, true, true) => Status::Candidate, _ => Status::Hold } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Status { Candidate, Hold }
fn decide(compatibility: bool, recovery: bool, supply_chain_known: bool) -> Status { if compatibility && recovery { Status::Candidate } else { Status::Hold } }`,
    String.raw`#[test]
fn unknown_supply_chain_keeps_public_release_on_hold() {
    assert_eq!(decide(true, true, true), Status::Candidate);
    assert_eq!(decide(true, true, false), Status::Hold);
    assert_eq!(decide(false, true, true), Status::Hold);
    assert_eq!(decide(true, false, true), Status::Hold);
}`,
  ),
  "capstone-domain-recall": contract(
    "capstone-domain-recall",
    String.raw`fn shipment_ok(reference: &str, destination: &str) -> bool { !reference.is_empty() && reference.len() <= 6 && reference.is_ascii() && !destination.is_empty() && destination.len() <= 10 }`,
    String.raw`fn shipment_ok(reference: &str, destination: &str) -> bool { match (reference.is_empty(), destination.is_empty()) { (false, false) => reference.as_bytes().len() <= 6 && reference.chars().all(|character| character.is_ascii()) && destination.as_bytes().len() <= 10, _ => false } }`,
    String.raw`fn shipment_ok(reference: &str, destination: &str) -> bool { !reference.is_empty() && reference.len() < 6 && reference.is_ascii() && !destination.is_empty() && destination.len() <= 10 }`,
    String.raw`#[test]
fn shipment_reference_and_destination_have_independent_bounds() {
    assert!(shipment_ok("AB1234", "Warszawa"));
    assert!(!shipment_ok("AB12345", "Warszawa"));
    assert!(!shipment_ok("AB1234", ""));
    assert!(!shipment_ok("ĄB1234", "Warszawa"));
    assert!(shipment_ok("AB1234", "Łódź"));
    assert!(!shipment_ok("AB1234", "Łódź12345"));
}`,
  ),
  "capstone-commit-recall": contract(
    "capstone-commit-recall",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Payment { New, Duplicate, Conflict }
fn import_notice(old: Option<&str>, incoming: &str) -> Payment { match old { None => Payment::New, Some(value) if value == incoming => Payment::Duplicate, Some(_) => Payment::Conflict } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Payment { New, Duplicate, Conflict }
fn import_notice(old: Option<&str>, incoming: &str) -> Payment { old.map_or(Payment::New, |value| if value == incoming { Payment::Duplicate } else { Payment::Conflict }) }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Payment { New, Duplicate, Conflict }
fn import_notice(old: Option<&str>, incoming: &str) -> Payment { match old { None => Payment::New, Some(_) => Payment::Duplicate } }`,
    String.raw`#[test]
fn payment_replay_keeps_duplicate_distinct_from_conflict() {
    assert_eq!(import_notice(None, "€10"), Payment::New);
    assert_eq!(import_notice(Some("€10"), "€10"), Payment::Duplicate);
    assert_eq!(import_notice(Some("€10"), "€11"), Payment::Conflict);
}`,
  ),
  "capstone-lifecycle-recall": contract(
    "capstone-lifecycle-recall",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Export { Running, Pending, Done }
fn export_state(accepted: usize, completed: usize, worker_joined: bool) -> Export { if worker_joined && accepted == completed { Export::Done } else if accepted > completed { Export::Pending } else { Export::Running } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Export { Running, Pending, Done }
fn export_state(accepted: usize, completed: usize, worker_joined: bool) -> Export { match (worker_joined, accepted == completed, accepted > completed) { (true, true, _) => Export::Done, (_, _, true) => Export::Pending, _ => Export::Running } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Export { Running, Pending, Done }
fn export_state(accepted: usize, completed: usize, worker_joined: bool) -> Export { if accepted == completed { Export::Done } else if accepted > completed { Export::Pending } else if worker_joined { Export::Running } else { Export::Running } }`,
    String.raw`#[test]
fn export_completion_requires_joined_worker() {
    assert_eq!(export_state(2, 2, true), Export::Done);
    assert_eq!(export_state(2, 2, false), Export::Running);
    assert_eq!(export_state(2, 1, true), Export::Pending);
}`,
  ),
  "capstone-protocol-recall": contract(
    "capstone-protocol-recall",
    String.raw`fn job_version(version: u8, route: &str) -> Option<&str> { match version { 1 => Some("default"), 2 if route != "-" => Some(route), 2 => Some("default"), _ => None } }`,
    String.raw`fn job_version(version: u8, route: &str) -> Option<&str> { if version == 1 { return Some("default"); } if version == 2 { return Some(if route == "-" { "default" } else { route }); } None }`,
    String.raw`fn job_version(version: u8, route: &str) -> Option<&str> { match version { 1 | 2 => Some(route), _ => None } }`,
    String.raw`#[test]
fn job_ticket_versions_normalize_optional_route() {
    assert_eq!(job_version(1, "ignored"), Some("default"));
    assert_eq!(job_version(2, "-"), Some("default"));
    assert_eq!(job_version(2, "fast"), Some("fast"));
    assert_eq!(job_version(3, "fast"), None);
}`,
  ),
  "capstone-incident-recall": contract(
    "capstone-incident-recall",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Printer { Unknown, Printed, CommittedUndelivered, NotCommitted }
fn printer_status(committed: Option<bool>, delivered: Option<bool>) -> Printer { match (committed, delivered) { (None, _) | (_, None) => Printer::Unknown, (Some(true), Some(true)) => Printer::Printed, (Some(true), Some(false)) => Printer::CommittedUndelivered, (Some(false), Some(_)) => Printer::NotCommitted } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Printer { Unknown, Printed, CommittedUndelivered, NotCommitted }
fn printer_status(committed: Option<bool>, delivered: Option<bool>) -> Printer { if committed.is_none() || delivered.is_none() { Printer::Unknown } else if committed == Some(true) { if delivered == Some(true) { Printer::Printed } else { Printer::CommittedUndelivered } } else { Printer::NotCommitted } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Printer { Unknown, Printed, CommittedUndelivered, NotCommitted }
fn printer_status(committed: Option<bool>, delivered: Option<bool>) -> Printer { match (committed, delivered) { (Some(true), Some(true)) => Printer::Printed, (Some(true), Some(false)) => Printer::NotCommitted, _ => Printer::Unknown } }`,
    String.raw`#[test]
fn printer_delivery_does_not_prove_commit_without_evidence() {
    assert_eq!(printer_status(None, Some(true)), Printer::Unknown);
    assert_eq!(printer_status(Some(true), Some(true)), Printer::Printed);
    assert_eq!(printer_status(Some(true), Some(false)), Printer::CommittedUndelivered);
    assert_eq!(printer_status(Some(false), Some(false)), Printer::NotCommitted);
}`,
  ),
  "capstone-release-recall": contract(
    "capstone-release-recall",
    String.raw`fn candidate(checks: &[bool], observed_at: u64, today: u64) -> bool { !checks.is_empty() && checks.iter().all(|check| *check) && today >= observed_at && today - observed_at <= 7 }`,
    String.raw`fn candidate(checks: &[bool], observed_at: u64, today: u64) -> bool { checks.iter().copied().reduce(|left, right| left && right).unwrap_or(false) && today >= observed_at && today - observed_at <= 7 }`,
    String.raw`fn candidate(checks: &[bool], observed_at: u64, today: u64) -> bool { checks.iter().all(|check| *check) && today.saturating_sub(observed_at) <= 7 }`,
    String.raw`#[test]
fn release_candidate_requires_checks_and_fresh_observation() {
    assert!(candidate(&[true, true], 10, 17));
    assert!(!candidate(&[], 10, 10));
    assert!(!candidate(&[true, false], 10, 11));
    assert!(!candidate(&[true], 10, 18));
    assert!(!candidate(&[true], 20, 19));
}`,
  ),
  "review-capstone-domain": contract(
    "review-capstone-domain",
    String.raw`fn shipment_reference(reference: &str, destination: &str) -> bool { let reference_ok = match reference.as_bytes() { [] => false, bytes if bytes.len() <= 6 => reference.is_ascii(), _ => false }; let destination_ok = !destination.is_empty() && destination.len() <= 10; reference_ok && destination_ok }`,
    String.raw`fn shipment_reference(reference: &str, destination: &str) -> bool { if reference.is_empty() || destination.is_empty() { return false; } let reference_ok = reference.len() <= 6 && reference.chars().all(|character| character.is_ascii()); let destination_ok = destination.as_bytes().len() <= 10; reference_ok && destination_ok }`,
    String.raw`fn shipment_reference(reference: &str, destination: &str) -> bool { !reference.is_empty() && reference.len() < 6 && reference.is_ascii() && !destination.is_empty() && destination.len() <= 10 }`,
    String.raw`#[test]
fn shipment_review_enforces_reference_ascii_and_destination_bytes() {
    assert!(shipment_reference("AB1234", "Warszawa10"));
    assert!(shipment_reference("AB1234", "Łódź"));
    assert!(!shipment_reference("AB12345", "Warszawa"));
    assert!(!shipment_reference("AB1234", "Warszawa123"));
    assert!(!shipment_reference("ĄB1234", "Warszawa"));
    assert!(!shipment_reference("AB1234", "Łódź12345"));
}`,
  ),
  "review-capstone-commit": contract(
    "review-capstone-commit",
    String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Notice { account: &'static str, external_id: &'static str, cents: u64 }
#[derive(Debug, PartialEq, Eq)] enum Outcome { Inserted, Duplicate, Conflict }
fn import_payment(records: &[Notice], incoming: Notice) -> Outcome { match records.iter().find(|old| old.account == incoming.account && old.external_id == incoming.external_id) { None => Outcome::Inserted, Some(old) if old.cents == incoming.cents => Outcome::Duplicate, Some(_) => Outcome::Conflict } }`,
    String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Notice { account: &'static str, external_id: &'static str, cents: u64 }
#[derive(Debug, PartialEq, Eq)] enum Outcome { Inserted, Duplicate, Conflict }
fn import_payment(records: &[Notice], incoming: Notice) -> Outcome { records.iter().find(|old| (old.account, old.external_id) == (incoming.account, incoming.external_id)).map_or(Outcome::Inserted, |old| if old.cents == incoming.cents { Outcome::Duplicate } else { Outcome::Conflict }) }`,
    String.raw`#[derive(Debug, PartialEq, Eq, Clone, Copy)] struct Notice { account: &'static str, external_id: &'static str, cents: u64 }
#[derive(Debug, PartialEq, Eq)] enum Outcome { Inserted, Duplicate, Conflict }
fn import_payment(records: &[Notice], incoming: Notice) -> Outcome { match records.iter().find(|old| old.external_id == incoming.external_id) { None => Outcome::Inserted, Some(_) => Outcome::Duplicate } }`,
    String.raw`#[test]
fn payment_review_uses_composite_identity() {
    let original = Notice { account: "a", external_id: "1", cents: 100 };
    let records = [original];
    assert_eq!(import_payment(&records, original), Outcome::Duplicate);
    assert_eq!(import_payment(&records, Notice { account: "a", external_id: "1", cents: 101 }), Outcome::Conflict);
    assert_eq!(import_payment(&records, Notice { account: "b", external_id: "1", cents: 100 }), Outcome::Inserted);
    assert_eq!(import_payment(&records, Notice { account: "a", external_id: "2", cents: 100 }), Outcome::Inserted);
}`,
  ),
  "review-capstone-lifecycle": contract(
    "review-capstone-lifecycle",
    String.raw`fn reconcile(accepted: usize, completed: usize, worker_joined: bool) -> bool { worker_joined && accepted == completed }`,
    String.raw`fn reconcile(accepted: usize, completed: usize, worker_joined: bool) -> bool { match worker_joined { true => accepted.cmp(&completed).is_eq(), false => false } }`,
    String.raw`fn reconcile(accepted: usize, completed: usize, worker_joined: bool) -> bool { accepted == completed }`,
    String.raw`#[test]
fn export_review_accounts_dropped_subscribers_and_worker() {
    assert!(reconcile(4, 4, true));
    assert!(!reconcile(4, 3, true));
    assert!(!reconcile(4, 4, false));
}`,
  ),
  "review-capstone-protocol": contract(
    "review-capstone-protocol",
    String.raw`fn normalize_ticket(version: u8, route: &str) -> Option<&str> { match version { 1 => Some("default"), 2 => Some(if route == "-" { "default" } else { route }), _ => None } }`,
    String.raw`fn normalize_ticket(version: u8, route: &str) -> Option<&str> { match (version, route) { (1, _) => Some("default"), (2, "-") => Some("default"), (2, value) => Some(value), _ => None } }`,
    String.raw`fn normalize_ticket(version: u8, route: &str) -> Option<&str> { match version { 1 | 2 => Some(route), _ => None } }`,
    String.raw`#[test]
fn routing_label_review_preserves_v1_and_sentinel_normalization() {
    assert_eq!(normalize_ticket(1, "legacy"), Some("default"));
    assert_eq!(normalize_ticket(2, "-"), Some("default"));
    assert_eq!(normalize_ticket(2, "fast"), Some("fast"));
    assert_eq!(normalize_ticket(9, "fast"), None);
}`,
  ),
  "review-capstone-incident": contract(
    "review-capstone-incident",
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Diagnosis { Unknown, Delivered, CommittedNoDelivery }
fn diagnose_receipt(committed: Option<bool>, delivered: Option<bool>) -> Diagnosis { match (committed, delivered) { (None, _) | (_, None) => Diagnosis::Unknown, (Some(true), Some(false)) => Diagnosis::CommittedNoDelivery, (Some(true), Some(true)) => Diagnosis::Delivered, (Some(false), _) => Diagnosis::Unknown } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Diagnosis { Unknown, Delivered, CommittedNoDelivery }
fn diagnose_receipt(committed: Option<bool>, delivered: Option<bool>) -> Diagnosis { if committed == Some(true) && delivered == Some(false) { Diagnosis::CommittedNoDelivery } else if committed == Some(true) && delivered == Some(true) { Diagnosis::Delivered } else { Diagnosis::Unknown } }`,
    String.raw`#[derive(Debug, PartialEq, Eq)] enum Diagnosis { Unknown, Delivered, CommittedNoDelivery }
fn diagnose_receipt(committed: Option<bool>, delivered: Option<bool>) -> Diagnosis { match delivered { Some(true) => Diagnosis::Delivered, _ => Diagnosis::Unknown } }`,
    String.raw`#[test]
fn receipt_printer_review_separates_commit_from_delivery() {
    assert_eq!(diagnose_receipt(None, Some(true)), Diagnosis::Unknown);
    assert_eq!(diagnose_receipt(Some(true), Some(false)), Diagnosis::CommittedNoDelivery);
    assert_eq!(diagnose_receipt(Some(true), Some(true)), Diagnosis::Delivered);
}`,
  ),
  "review-capstone-release": contract(
    "review-capstone-release",
    String.raw`fn release_ready(digest_matches: bool, checks_complete: bool, observed_at: u64, today: u64) -> bool { digest_matches && checks_complete && today >= observed_at && today - observed_at <= 3 }`,
    String.raw`fn release_ready(digest_matches: bool, checks_complete: bool, observed_at: u64, today: u64) -> bool { if !digest_matches || !checks_complete { false } else { today >= observed_at && today - observed_at <= 3 } }`,
    String.raw`fn release_ready(digest_matches: bool, checks_complete: bool, observed_at: u64, today: u64) -> bool { digest_matches || checks_complete && today.saturating_sub(observed_at) <= 3 }`,
    String.raw`#[test]
fn migration_candidate_review_requires_current_bound_evidence() {
    assert!(release_ready(true, true, 20, 23));
    assert!(!release_ready(false, true, 20, 21));
    assert!(!release_ready(true, false, 20, 21));
    assert!(!release_ready(true, true, 20, 24));
    assert!(!release_ready(true, true, 21, 20));
}`,
  ),
};
