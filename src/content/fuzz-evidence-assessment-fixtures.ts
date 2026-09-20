export type FuzzCase = { context: number; query: string; body: Uint8Array };
export type OutputRow = { lineNumber: number; text: string; matched: boolean };
export type FailureKind =
  | "QueryAcceptance"
  | "ContextAcceptance"
  | "BodyAcceptance"
  | "SelectionMismatch"
  | "ReaderMismatch";

/** Independent, deterministic model used by the authored browser references. */
export function decodeCase(bytes: Uint8Array): FuzzCase | undefined {
  if (bytes.length < 3 || bytes.length > 4096) return undefined;
  const context = bytes[0] % 20;
  const declared = (bytes[1] << 8) | bytes[2];
  const queryLength = Math.min(declared, bytes.length - 3);
  const queryBytes = bytes.slice(3, 3 + queryLength);
  const query = new TextDecoder("utf-8", { fatal: false }).decode(queryBytes);
  return { context, query, body: bytes.slice(3 + queryLength) };
}

export function compareOutputs(actual: OutputRow[], expected: OutputRow[]): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function chooseWitness(
  original: Uint8Array,
  candidates: Uint8Array[],
  observations: Array<{ bytes: Uint8Array; failure: FailureKind | "Timeout" | "CompileError" }>,
): Uint8Array {
  const valid = observations
    .filter((observation) => observation.failure === "SelectionMismatch")
    .map((observation) => observation.bytes)
    .filter((candidate) => candidate.length < original.length);
  return candidates
    .filter((candidate) => valid.some((item) => Buffer.from(item).equals(Buffer.from(candidate))))
    .sort((a, b) => a.length - b.length)[0] ?? original;
}

export type CampaignReport = {
  schemaVersion: 1;
  runId: string;
  archiveSha256: string;
  manifestSha256: string;
  target: string;
  toolchain: string;
  status: "passed" | "failed" | "infrastructure";
  instrumentation: boolean;
  normalCompletion: boolean;
  observedRuns: number;
  phase: "campaign" | "replay" | "infrastructure";
  replayOnly?: boolean;
  archiveIdentity?: string;
  limitations: string[];
};

export function classifyReport(report: Partial<CampaignReport>): CampaignReport["status"] {
  if (report.schemaVersion !== 1 || !report.runId || !report.archiveSha256 || !report.manifestSha256) return "infrastructure";
  if (report.replayOnly || report.phase === "replay") return "failed";
  if (!report.instrumentation || !report.normalCompletion || (report.observedRuns ?? 0) < 1000) return "infrastructure";
  return report.status === "passed" ? "passed" : "failed";
}

export const fuzzEvidenceRustReferences = {
  inputDomain: String.raw`#[derive(Debug, PartialEq, Eq)]
struct Case<'a> { context: u8, query: String, body: &'a [u8] }
fn decode_case(bytes: &[u8]) -> Option<Case<'_>> {
    if !(3..=4096).contains(&bytes.len()) { return None; }
    let context = bytes[0] % 20;
    let declared = usize::from(u16::from_be_bytes([bytes[1], bytes[2]]));
    let query_len = declared.min(bytes.len() - 3);
    let query = String::from_utf8_lossy(&bytes[3..3 + query_len]).into_owned();
    Some(Case { context, query, body: &bytes[3 + query_len..] })
}
#[test]
fn domain_contract_preserves_header_and_raw_body() {
    let parsed = decode_case(&[0, 0, 1, b'x', 0xff]).expect("framed input");
    assert_eq!(parsed.context, 0);
    assert_eq!(parsed.query, "x");
    assert_eq!(parsed.body, &[0xff]);
    let multibyte = decode_case(&[0, 0, 2, 0xc3, 0xa9, b'z']).expect("byte-length query");
    assert_eq!(multibyte.query, "é");
    assert_eq!(multibyte.body, b"z");
    assert!(decode_case(&[0, 0]).is_none());
    assert!(decode_case(&vec![0; 4097]).is_none());
}`,
  inputDomainBlank: String.raw`fn decode_command(bytes: &[u8]) -> Option<(&[u8], &[u8])> {
    let length = usize::from(*bytes.first()?);
    (bytes.len() >= length + 1).then(|| (&bytes[1..1 + length], &bytes[1 + length..]))
}
#[test]
fn length_prefix_has_a_local_boundary_and_keeps_payload_bytes() {
    assert_eq!(decode_command(&[2, b'a', 0xff, b'z']), Some((&[b'a', 0xff][..], &[b'z'][..])));
    assert!(decode_command(&[3, b'a']).is_none());
}`,
  oracle: String.raw`fn same_output(actual: &[(usize, String, bool)], expected: &[(usize, String, bool)]) -> bool {
    actual == expected
}
fn same_result(actual: Result<Vec<(usize, String, bool)>, &'static str>, expected: Result<Vec<(usize, String, bool)>, &'static str>) -> bool {
    actual == expected
}
#[test]
fn oracle_checks_order_text_match_flags_and_error_class() {
    let expected = vec![(1, "ax".to_owned(), true), (2, "ax".to_owned(), true)];
    assert!(same_output(&expected, &expected));
    assert!(!same_output(&expected, &expected[..1]));
    assert!(!same_output(&expected, &vec![(2, "ax".to_owned(), true), (1, "ax".to_owned(), true)]));
    let unmatched = vec![(1, "ax".to_owned(), false), (2, "ax".to_owned(), true)];
    assert!(same_output(&unmatched, &unmatched));
    assert!(!same_output(&unmatched, &expected));
    assert!(same_result(Err("invalid-body"), Err("invalid-body")));
    assert!(!same_result(Err("invalid-query"), Err("invalid-body")));
    assert!(!same_result(Err("invalid-body"), Ok(expected.clone())));
    let different_text = vec![(1, "bx".to_owned(), true), (2, "ax".to_owned(), true)];
    assert!(!same_output(&different_text, &expected));
}`,
  oracleBlank: String.raw`#[derive(Debug, PartialEq, Eq)]
struct Frame<'a> { context: u8, query: String, body: &'a [u8] }
fn decode_frame(bytes: &[u8]) -> Option<Frame<'_>> {
    if bytes.len() < 3 || bytes.len() > 4096 { return None; }
    let context = bytes[0] % 20;
    let query_len = usize::from(u16::from_be_bytes([bytes[1], bytes[2]])).min(bytes.len() - 3);
    let query = String::from_utf8_lossy(&bytes[3..3 + query_len]).into_owned();
    Some(Frame { context, query, body: &bytes[3 + query_len..] })
}
fn duplicate_selection_matches(actual: &[(usize, bool)], expected: &[(usize, bool)]) -> bool {
    actual == expected
}
#[test]
fn bounded_frame_and_duplicate_selection_are_part_of_the_contract() {
    let frame = decode_frame(&[0, 0, 1, b'a', 0xff, b'z']).expect("valid frame");
    assert_eq!(frame.context, 0);
    assert_eq!(frame.query, "a");
    assert_eq!(frame.body, &[0xff, b'z']);
    let clamped = decode_frame(&[255, 0xff, 0xff, b'a', 0xff]).expect("clamped query");
    assert_eq!(clamped.query, "a�");
    assert!(clamped.body.is_empty());
    let invalid_query = decode_frame(&[255, 0, 2, b'a', 0xff, 0xff]).expect("lossy query");
    assert_eq!(invalid_query.context, 15);
    assert_eq!(invalid_query.query, "a�");
    assert_eq!(invalid_query.body, &[0xff]);
    let at_limit = vec![0u8; 4096];
    let at_limit = decode_frame(&at_limit).expect("4096-byte frame");
    assert_eq!(at_limit.context, 0);
    assert_eq!(at_limit.body.len(), 4093);
    assert!(decode_frame(&[0, 0]).is_none());
    let oversize = vec![0u8; 4097];
    assert!(decode_frame(&oversize).is_none());
    let expected = [(1, true), (1, true), (2, false)];
    assert!(duplicate_selection_matches(&expected, &expected));
    assert!(!duplicate_selection_matches(&expected[..2], &expected));
    assert!(!duplicate_selection_matches(&[(1, true), (2, false), (1, true)], &expected));
    assert!(!duplicate_selection_matches(&[(1, false), (1, true), (2, false)], &expected));
}`,
  reducer: String.raw`type Regression = fn(&[u8]) -> bool;
struct Observation { bytes: Vec<u8>, failure: &'static str, restored_replay: Option<&'static str>, regression: Option<Regression> }
fn executable_regression(bytes: &[u8]) -> bool { bytes.is_empty() || bytes == b"A" || bytes == b"BC" }
fn never_regresses(_: &[u8]) -> bool { false }
fn choose_witness(original: &[u8], candidates: &[Observation]) -> Vec<u8> {
    candidates.iter()
        .filter(|candidate| !candidate.bytes.is_empty() && candidate.bytes.len() < original.len())
        .filter(|candidate| candidate.failure == "SelectionMismatch")
        .filter(|candidate| candidate.restored_replay == Some("passed"))
        .filter(|candidate| candidate.regression.is_some_and(|regression| regression(&candidate.bytes)))
        .min_by_key(|candidate| candidate.bytes.len())
        .map(|candidate| candidate.bytes.clone())
        .unwrap_or_else(|| original.to_vec())
}
#[test]
fn reducer_requires_strict_size_named_failure_replay_and_regression() {
    let original = b"ABCDE";
    let candidates = vec![
        Observation { bytes: Vec::new(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) },
        Observation { bytes: b"ABC".to_vec(), failure: "Timeout", restored_replay: Some("passed"), regression: Some(executable_regression) },
        Observation { bytes: b"A".to_vec(), failure: "SelectionMismatch", restored_replay: None, regression: Some(executable_regression) },
        Observation { bytes: b"A".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: None },
        Observation { bytes: b"A".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(never_regresses) },
        Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: None, regression: Some(executable_regression) },
        Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: None },
        Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) },
        Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("failed"), regression: Some(executable_regression) },
    ];
    assert_eq!(choose_witness(original, &candidates), b"BC");
    assert_eq!(choose_witness(original, &[Observation { bytes: b"BC".to_vec(), failure: "CompileError", restored_replay: Some("passed"), regression: Some(executable_regression) }]), original);
    assert_eq!(choose_witness(original, &[Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("failed"), regression: Some(executable_regression) }]), original);
    assert_eq!(choose_witness(original, &[Observation { bytes: b"A".to_vec(), failure: "SelectionMismatch", restored_replay: None, regression: Some(executable_regression) }, Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) }]), b"BC");
    assert_eq!(choose_witness(original, &[Observation { bytes: b"A".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: None }, Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) }]), b"BC");
    assert_eq!(choose_witness(original, &[Observation { bytes: b"A".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(never_regresses) }, Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) }]), b"BC");
    assert_eq!(choose_witness(original, &[Observation { bytes: Vec::new(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) }, Observation { bytes: b"BC".to_vec(), failure: "SelectionMismatch", restored_replay: Some("passed"), regression: Some(executable_regression) }]), b"BC");
}`,
  reducerBlank: String.raw`fn reduce_frame(original: &[u8], candidate: &[u8], failure_class: &str) -> Vec<u8> {
    if candidate.len() < original.len() && failure_class == "LengthMismatch" { candidate.to_vec() } else { original.to_vec() }
}
#[test]
fn frame_reduction_keeps_named_error_and_rejects_timeout() {
    assert_eq!(reduce_frame(b"frame-long", b"frame", "LengthMismatch"), b"frame");
    assert_eq!(reduce_frame(b"frame-long", b"frame", "Timeout"), b"frame-long");
}`,
  campaign: String.raw`#[derive(Debug, PartialEq, Eq)]
struct Dossier { run_id: &'static str, archive_hash: &'static str, manifest_hash: &'static str, instrumented: bool, normal: bool, runs: usize, replay_only: bool, status: &'static str }
fn classify_report(dossier: &Dossier, current_run: &str, current_archive: &str, current_manifest: &str) -> &'static str {
    if dossier.replay_only { return "failed"; }
    if dossier.run_id != current_run || dossier.archive_hash != current_archive || dossier.manifest_hash != current_manifest { return "infrastructure"; }
    if !dossier.instrumented || !dossier.normal || dossier.runs < 1000 { return "infrastructure"; }
    dossier.status
}
#[test]
fn dossier_requires_fresh_identity_and_campaign_phases() {
    let current = ("run-1", "archive-a", "manifest-a");
    assert_eq!(classify_report(&Dossier { run_id: "run-1", archive_hash: "archive-a", manifest_hash: "manifest-a", instrumented: true, normal: true, runs: 1000, replay_only: false, status: "passed" }, current.0, current.1, current.2), "passed");
    assert_eq!(classify_report(&Dossier { run_id: "run-1", archive_hash: "stale", manifest_hash: "manifest-a", instrumented: true, normal: true, runs: 1000, replay_only: false, status: "passed" }, current.0, current.1, current.2), "infrastructure");
    assert_eq!(classify_report(&Dossier { run_id: "", archive_hash: "archive-a", manifest_hash: "manifest-a", instrumented: true, normal: true, runs: 1000, replay_only: false, status: "passed" }, current.0, current.1, current.2), "infrastructure");
    assert_eq!(classify_report(&Dossier { run_id: "run-1", archive_hash: "archive-a", manifest_hash: "manifest-a", instrumented: true, normal: true, runs: 1, replay_only: false, status: "passed" }, current.0, current.1, current.2), "infrastructure");
    assert_eq!(classify_report(&Dossier { run_id: "run-1", archive_hash: "archive-a", manifest_hash: "manifest-a", instrumented: true, normal: true, runs: 1000, replay_only: true, status: "passed" }, current.0, current.1, current.2), "failed");
    assert_eq!(classify_report(&Dossier { run_id: "run-1", archive_hash: "archive-a", manifest_hash: "manifest-a", instrumented: false, normal: true, runs: 1000, replay_only: false, status: "passed" }, current.0, current.1, current.2), "infrastructure");
    assert_eq!(classify_report(&Dossier { run_id: "run-1", archive_hash: "archive-a", manifest_hash: "manifest-a", instrumented: true, normal: false, runs: 1000, replay_only: false, status: "passed" }, current.0, current.1, current.2), "infrastructure");
}`,
  campaignBlank: String.raw`#[derive(Debug, PartialEq, Eq)]
struct Triage { archive_hash: &'static str, expected_archive_hash: &'static str, manifest_hash: &'static str, expected_manifest_hash: &'static str, instrumented: bool, tool_ok: bool, finding: bool }
fn triage_report(report: &Triage) -> &'static str {
    if report.archive_hash != report.expected_archive_hash || report.manifest_hash != report.expected_manifest_hash || !report.instrumented || !report.tool_ok { "infrastructure" } else if report.finding { "failed" } else { "passed" }
}
#[test]
fn triage_distinguishes_hash_mismatch_tool_failure_and_oracle_finding() {
    let good = ("archive-a", "manifest-a");
    assert_eq!(triage_report(&Triage { archive_hash: "stale", expected_archive_hash: "archive-a", manifest_hash: "manifest-a", expected_manifest_hash: "manifest-a", instrumented: true, tool_ok: true, finding: true }), "infrastructure");
    assert_eq!(triage_report(&Triage { archive_hash: good.0, expected_archive_hash: good.0, manifest_hash: good.1, expected_manifest_hash: good.1, instrumented: false, tool_ok: true, finding: true }), "infrastructure");
    assert_eq!(triage_report(&Triage { archive_hash: good.0, expected_archive_hash: good.0, manifest_hash: good.1, expected_manifest_hash: good.1, instrumented: true, tool_ok: false, finding: false }), "infrastructure");
    assert_eq!(triage_report(&Triage { archive_hash: good.0, expected_archive_hash: good.0, manifest_hash: good.1, expected_manifest_hash: good.1, instrumented: true, tool_ok: true, finding: true }), "failed");
    assert_eq!(triage_report(&Triage { archive_hash: good.0, expected_archive_hash: good.0, manifest_hash: good.1, expected_manifest_hash: good.1, instrumented: true, tool_ok: true, finding: false }), "passed");
}`,
  taggedRetrieval: String.raw`fn decode_tagged(bytes: &[u8]) -> Option<(&[u8], &[u8])> {
    let (&tag, rest) = bytes.split_first()?;
    let (&length, payload) = rest.split_first()?;
    (tag == 7 && payload.len() >= length as usize).then(|| (&payload[..length as usize], &payload[length as usize..]))
}
#[test]
fn tagged_decoder_checks_tag_length_and_remainder() {
    assert_eq!(decode_tagged(&[7, 2, b'a', 0xff, b'z']), Some((&[b'a', 0xff][..], &[b'z'][..])));
    assert!(decode_tagged(&[8, 1, b'a']).is_none());
    assert!(decode_tagged(&[7, 2, b'a']).is_none());
}`,
  duplicateRetrieval: String.raw`fn compare_duplicate_rows(actual: &[(usize, String, bool)], expected: &[(usize, String, bool)]) -> bool { actual == expected }
#[test]
fn duplicate_retrieval_preserves_every_field_and_order() {
    let expected = vec![(1, "ax".to_owned(), true), (1, "ax".to_owned(), true), (2, "bx".to_owned(), false)];
    assert!(compare_duplicate_rows(&expected, &expected));
    assert!(!compare_duplicate_rows(&[(1, "ax".to_owned(), true)], &expected));
    assert!(!compare_duplicate_rows(&[(1, "ax".to_owned(), true), (2, "bx".to_owned(), false)], &expected));
    assert!(!compare_duplicate_rows(&[(2, "bx".to_owned(), false), (1, "ax".to_owned(), true), (1, "ax".to_owned(), true)], &expected));
    assert!(!compare_duplicate_rows(&[(1, "wrong".to_owned(), true), (1, "ax".to_owned(), true), (2, "bx".to_owned(), false)], &expected));
    assert!(!compare_duplicate_rows(&[(1, "ax".to_owned(), false), (1, "ax".to_owned(), true), (2, "bx".to_owned(), false)], &expected));
}`,
  frameRetrieval: String.raw`#[derive(Clone, Debug, PartialEq, Eq)]
struct Window { declared: u8, payload: Vec<u8>, checksum: u8 }
fn shrink_window(original: &Window, candidate: Window, outcome: &str) -> Window {
    let candidate_is_framed = candidate.declared as usize == candidate.payload.len();
    if outcome == "LengthMismatch" && candidate_is_framed && candidate.payload.len() < original.payload.len() { candidate } else { original.clone() }
}
#[test]
fn window_retrieval_requires_framed_payload_and_named_failure() {
    let original = Window { declared: 5, payload: b"ABCDE".to_vec(), checksum: 7 };
    let candidate = Window { declared: 2, payload: b"BC".to_vec(), checksum: 7 };
    assert_eq!(shrink_window(&original, candidate.clone(), "LengthMismatch"), candidate);
    assert_eq!(shrink_window(&original, candidate.clone(), "Timeout"), original);
    let one_byte_shorter = Window { declared: 4, payload: b"ABCD".to_vec(), checksum: 7 };
    assert_eq!(shrink_window(&original, one_byte_shorter.clone(), "LengthMismatch"), one_byte_shorter);
    assert_eq!(shrink_window(&original, Window { declared: 3, payload: b"BC".to_vec(), checksum: 7 }, "LengthMismatch"), original);
    assert_eq!(shrink_window(&original, Window { declared: 5, payload: b"ABCDE".to_vec(), checksum: 7 }, "LengthMismatch"), original);
}`,
  dossierRetrieval: String.raw`struct Triage { archive_hash: &'static str, expected_archive_hash: &'static str, manifest_hash: &'static str, expected_manifest_hash: &'static str, toolchain: &'static str, expected_toolchain: &'static str, instrumented: bool, normal: bool, runs: usize, replay_only: bool }
fn classify_dossier(report: &Triage) -> &'static str {
    if report.replay_only { "failed" } else if report.archive_hash != report.expected_archive_hash || report.manifest_hash != report.expected_manifest_hash || report.toolchain != report.expected_toolchain || !report.instrumented || !report.normal || report.runs < 1000 { "infrastructure" } else { "passed" }
}
#[test]
fn dossier_retrieval_requires_fresh_instrumented_runs() {
    let good = Triage { archive_hash: "archive-a", expected_archive_hash: "archive-a", manifest_hash: "manifest-a", expected_manifest_hash: "manifest-a", toolchain: "stable", expected_toolchain: "stable", instrumented: true, normal: true, runs: 1000, replay_only: false };
    assert_eq!(classify_dossier(&good), "passed");
    assert_eq!(classify_dossier(&Triage { archive_hash: "stale", ..good }), "infrastructure");
    assert_eq!(classify_dossier(&Triage { manifest_hash: "stale", ..good }), "infrastructure");
    assert_eq!(classify_dossier(&Triage { toolchain: "nightly", ..good }), "infrastructure");
    assert_eq!(classify_dossier(&Triage { runs: 1, ..good }), "infrastructure");
    assert_eq!(classify_dossier(&Triage { replay_only: true, ..good }), "failed");
    assert_eq!(classify_dossier(&Triage { instrumented: false, ..good }), "infrastructure");
    assert_eq!(classify_dossier(&Triage { normal: false, ..good }), "infrastructure");
}`,
};

export const fuzzEvidenceAssessmentFixtures = {
  "fuzz-input-domain-gate": { reference: fuzzEvidenceRustReferences.inputDomain, mutant: fuzzEvidenceRustReferences.inputDomain.replace("if !(3..=4096).contains(&bytes.len()) { return None; }", "if bytes.len() < 2 { return None; }"), mutants: [fuzzEvidenceRustReferences.inputDomain.replace("let query_len = declared.min(bytes.len() - 3);", "let query_len = String::from_utf8_lossy(&bytes[3..]).chars().take(declared).map(char::len_utf8).sum::<usize>().min(bytes.len() - 3);")] },
  "fuzz-input-domain-blank": { reference: fuzzEvidenceRustReferences.inputDomainBlank, mutant: fuzzEvidenceRustReferences.inputDomainBlank.replace("bytes.len() >= length + 1", "bytes.len() >= 1") },
  "fuzz-oracle-sensitivity-gate": { reference: fuzzEvidenceRustReferences.oracle, mutant: fuzzEvidenceRustReferences.oracle.replace("actual == expected", "actual.iter().map(|(line, text, _)| (*line, text.clone())).eq(expected.iter().map(|(line, text, _)| (*line, text.clone())))"), mutants: [fuzzEvidenceRustReferences.oracle.replace("actual == expected", "actual.iter().zip(expected).all(|(a, b)| a.0 == b.0 && a.2 == b.2)"), fuzzEvidenceRustReferences.oracle.replace("actual == expected\n}\n#[test]", "match (actual, expected) { (Err(_), Err(_)) => true, (Ok(a), Ok(b)) => a == b, _ => false }\n}\n#[test]")] },
  "fuzz-oracle-sensitivity-blank": {
    reference: fuzzEvidenceRustReferences.oracleBlank,
    mutant: fuzzEvidenceRustReferences.oracleBlank.replace("bytes.len() < 3 || bytes.len() > 4096", "bytes.len() < 2"),
    mutants: [
      fuzzEvidenceRustReferences.oracleBlank.replace("bytes.len() > 4096", "bytes.len() > 64"),
      fuzzEvidenceRustReferences.oracleBlank.replace(".min(bytes.len() - 3)", ""),
      fuzzEvidenceRustReferences.oracleBlank.replace("String::from_utf8_lossy(&bytes[3..3 + query_len]).into_owned()", "String::from_utf8(bytes[3..3 + query_len].to_vec()).expect(\"valid query\")"),
      fuzzEvidenceRustReferences.oracleBlank.replace("bytes[0] % 20", "bytes[0]"),
      fuzzEvidenceRustReferences.oracleBlank.replace("actual == expected", "actual.len() == expected.len()"),
    ],
  },
  "fuzz-counterexample-regression-gate": { reference: fuzzEvidenceRustReferences.reducer, mutant: fuzzEvidenceRustReferences.reducer.replace("candidate.failure == \"SelectionMismatch\"", "candidate.failure == \"Timeout\""), mutants: [fuzzEvidenceRustReferences.reducer.replace(".filter(|candidate| candidate.restored_replay == Some(\"passed\"))", ""), fuzzEvidenceRustReferences.reducer.replace(".filter(|candidate| candidate.regression.is_some_and(|regression| regression(&candidate.bytes)))", ""), fuzzEvidenceRustReferences.reducer.replace("candidate.regression.is_some_and(|regression| regression(&candidate.bytes))", "candidate.regression.is_some()"), fuzzEvidenceRustReferences.reducer.replace("!candidate.bytes.is_empty() && candidate.bytes.len() < original.len()", "candidate.bytes.len() < original.len()") ] },
  "fuzz-counterexample-regression-blank": { reference: fuzzEvidenceRustReferences.reducerBlank, mutant: fuzzEvidenceRustReferences.reducerBlank.replace("failure_class == \"LengthMismatch\"", "failure_class == \"Timeout\"") },
  "fuzz-campaign-evidence-gate": { reference: fuzzEvidenceRustReferences.campaign, mutant: fuzzEvidenceRustReferences.campaign.replace("dossier.run_id != current_run || dossier.archive_hash != current_archive || dossier.manifest_hash != current_manifest", "false"), mutants: [fuzzEvidenceRustReferences.campaign.replace("!dossier.instrumented || ", ""), fuzzEvidenceRustReferences.campaign.replace("!dossier.normal || ", "")] },
  "fuzz-campaign-evidence-blank": { reference: fuzzEvidenceRustReferences.campaignBlank, mutant: fuzzEvidenceRustReferences.campaignBlank.replace("report.archive_hash != report.expected_archive_hash ||", "false ||") },
};

export const fuzzEvidenceRetrievalFixtures = {
  "fuzz-input-domain": { reference: fuzzEvidenceRustReferences.taggedRetrieval, mutants: [fuzzEvidenceRustReferences.taggedRetrieval.replace("tag == 7 &&", "true &&"), fuzzEvidenceRustReferences.taggedRetrieval.replace("payload.len() >= length as usize", "payload.len() >= 0")] },
  "fuzz-oracle-sensitivity": { reference: fuzzEvidenceRustReferences.duplicateRetrieval, mutants: [
    fuzzEvidenceRustReferences.duplicateRetrieval.replace("actual == expected", "actual.len() == expected.len()"),
    fuzzEvidenceRustReferences.duplicateRetrieval.replace("actual == expected", "actual.iter().zip(expected).all(|(a, b)| a.0 == b.0)"),
    fuzzEvidenceRustReferences.duplicateRetrieval.replace("actual == expected", "actual.iter().map(|row| row.0).collect::<std::collections::BTreeSet<_>>() == expected.iter().map(|row| row.0).collect::<std::collections::BTreeSet<_>>()"),
    fuzzEvidenceRustReferences.duplicateRetrieval.replace("actual == expected", "actual.iter().map(|row| (row.0, row.1.clone())).eq(expected.iter().map(|row| (row.0, row.1.clone())))"),
    fuzzEvidenceRustReferences.duplicateRetrieval.replace("actual == expected", "{ let mut actual = actual.to_vec(); actual.sort(); actual.dedup(); let mut expected = expected.to_vec(); expected.sort(); expected.dedup(); actual == expected }"),
  ] },
  "fuzz-counterexample-regression": { reference: fuzzEvidenceRustReferences.frameRetrieval, mutants: [fuzzEvidenceRustReferences.frameRetrieval.replace("outcome == \"LengthMismatch\"", "outcome == \"Timeout\"")] },
  "fuzz-campaign-evidence": { reference: fuzzEvidenceRustReferences.dossierRetrieval, mutants: [fuzzEvidenceRustReferences.dossierRetrieval.replace("if report.replay_only { \"failed\" }", "if false { \"failed\" }"), fuzzEvidenceRustReferences.dossierRetrieval.replace("!report.instrumented || ", ""), fuzzEvidenceRustReferences.dossierRetrieval.replace("!report.normal || ", ""), fuzzEvidenceRustReferences.dossierRetrieval.replace("report.archive_hash != report.expected_archive_hash || ", ""), fuzzEvidenceRustReferences.dossierRetrieval.replace("report.toolchain != report.expected_toolchain || ", "")] },
};
