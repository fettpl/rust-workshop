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
    assert!(same_result(Err("invalid-body"), Err("invalid-body")));
    assert!(!same_result(Err("invalid-body"), Ok(expected)));
}`,
  oracleBlank: String.raw`fn duplicate_selection_matches(actual: &[(usize, bool)], expected: &[(usize, bool)]) -> bool {
    actual == expected
}
#[test]
fn duplicate_rows_and_order_are_part_of_the_contract() {
    let expected = [(1, true), (1, true), (2, false)];
    assert!(duplicate_selection_matches(&expected, &expected));
    assert!(!duplicate_selection_matches(&expected[..2], &expected));
    assert!(!duplicate_selection_matches(&[(1, true), (2, false), (1, true)], &expected));
}`,
  reducer: String.raw`fn choose_witness(original: &[u8], candidates: &[Vec<u8>], observations: &[(Vec<u8>, &str)]) -> Vec<u8> {
    candidates.iter()
        .filter(|candidate| candidate.len() < original.len())
        .filter(|candidate| observations.iter().any(|(bytes, class)| bytes == *candidate && *class == "SelectionMismatch"))
        .min_by_key(|candidate| candidate.len())
        .cloned()
        .unwrap_or_else(|| original.to_vec())
}
#[test]
fn reducer_requires_strict_size_and_named_failure() {
    let original = b"ABCDE";
    let candidates = vec![b"ABCDE".to_vec(), b"ABC".to_vec(), b"BC".to_vec()];
    let observations = vec![(b"ABC".to_vec(), "Timeout"), (b"BC".to_vec(), "SelectionMismatch")];
    assert_eq!(choose_witness(original, &candidates, &observations), b"BC");
    assert_eq!(choose_witness(original, &candidates, &[(b"BC".to_vec(), "CompileError")]), original);
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
struct Dossier { instrumented: bool, normal: bool, runs: usize, replay_only: bool, status: &'static str }
fn classify_report(dossier: &Dossier) -> &'static str {
    if dossier.replay_only { return "failed"; }
    if !dossier.instrumented || !dossier.normal || dossier.runs < 1000 { return "infrastructure"; }
    dossier.status
}
#[test]
fn dossier_requires_campaign_phases() {
    assert_eq!(classify_report(&Dossier { instrumented: true, normal: true, runs: 1000, replay_only: false, status: "passed" }), "passed");
    assert_eq!(classify_report(&Dossier { instrumented: true, normal: true, runs: 1, replay_only: false, status: "passed" }), "infrastructure");
    assert_eq!(classify_report(&Dossier { instrumented: true, normal: true, runs: 1000, replay_only: true, status: "passed" }), "failed");
}`,
  campaignBlank: String.raw`#[derive(Debug, PartialEq, Eq)]
struct Triage { instrumented: bool, tool_ok: bool, finding: bool }
fn triage_report(report: &Triage) -> &'static str {
    if !report.instrumented || !report.tool_ok { "infrastructure" } else if report.finding { "failed" } else { "passed" }
}
#[test]
fn triage_distinguishes_tool_failure_from_oracle_finding() {
    assert_eq!(triage_report(&Triage { instrumented: false, tool_ok: true, finding: true }), "infrastructure");
    assert_eq!(triage_report(&Triage { instrumented: true, tool_ok: false, finding: false }), "infrastructure");
    assert_eq!(triage_report(&Triage { instrumented: true, tool_ok: true, finding: true }), "failed");
    assert_eq!(triage_report(&Triage { instrumented: true, tool_ok: true, finding: false }), "passed");
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
    let expected = vec![(1, "ax".to_owned(), true), (1, "ax".to_owned(), true)];
    assert!(compare_duplicate_rows(&expected, &expected));
    assert!(!compare_duplicate_rows(&[(1, "ax".to_owned(), true)], &expected));
}`,
  frameRetrieval: String.raw`fn retain_named_failure(original: &[u8], candidate: &[u8], failure: &str) -> Vec<u8> {
    if candidate.len() < original.len() && failure == "SelectionMismatch" { candidate.to_vec() } else { original.to_vec() }
}
#[test]
fn frame_retrieval_rejects_timeout_and_nonshrinking_candidates() {
    assert_eq!(retain_named_failure(b"ABCDE", b"BC", "SelectionMismatch"), b"BC");
    assert_eq!(retain_named_failure(b"ABCDE", b"BC", "Timeout"), b"ABCDE");
    assert_eq!(retain_named_failure(b"ABCDE", b"ABCDE", "SelectionMismatch"), b"ABCDE");
}`,
  dossierRetrieval: String.raw`fn classify_dossier(instrumented: bool, normal: bool, runs: usize, replay_only: bool) -> &'static str {
    if replay_only { "failed" } else if !instrumented || !normal || runs < 1000 { "infrastructure" } else { "passed" }
}
#[test]
fn dossier_retrieval_requires_fresh_instrumented_runs() {
    assert_eq!(classify_dossier(true, true, 1000, false), "passed");
    assert_eq!(classify_dossier(true, true, 1, false), "infrastructure");
    assert_eq!(classify_dossier(true, true, 1000, true), "failed");
}`,
};

export const fuzzEvidenceAssessmentFixtures = {
  "fuzz-input-domain-gate": { reference: fuzzEvidenceRustReferences.inputDomain, mutant: fuzzEvidenceRustReferences.inputDomain.replace("if !(3..=4096).contains(&bytes.len()) { return None; }", "if bytes.len() < 2 { return None; }") },
  "fuzz-input-domain-blank": { reference: fuzzEvidenceRustReferences.inputDomainBlank, mutant: fuzzEvidenceRustReferences.inputDomainBlank.replace("bytes.len() >= length + 1", "bytes.len() >= 1") },
  "fuzz-oracle-sensitivity-gate": { reference: fuzzEvidenceRustReferences.oracle, mutant: fuzzEvidenceRustReferences.oracle.replace("actual == expected", "actual.len() == expected.len()") },
  "fuzz-oracle-sensitivity-blank": { reference: fuzzEvidenceRustReferences.oracleBlank, mutant: fuzzEvidenceRustReferences.oracleBlank.replace("actual == expected", "actual.len() == expected.len()") },
  "fuzz-counterexample-regression-gate": { reference: fuzzEvidenceRustReferences.reducer, mutant: fuzzEvidenceRustReferences.reducer.replace("*class == \"SelectionMismatch\"", "*class == \"Timeout\"") },
  "fuzz-counterexample-regression-blank": { reference: fuzzEvidenceRustReferences.reducerBlank, mutant: fuzzEvidenceRustReferences.reducerBlank.replace("failure_class == \"LengthMismatch\"", "failure_class == \"Timeout\"") },
  "fuzz-campaign-evidence-gate": { reference: fuzzEvidenceRustReferences.campaign, mutant: fuzzEvidenceRustReferences.campaign.replace("if !dossier.instrumented || !dossier.normal || dossier.runs < 1000 { return \"infrastructure\"; }", "if dossier.runs > 0 { return \"passed\"; }") },
  "fuzz-campaign-evidence-blank": { reference: fuzzEvidenceRustReferences.campaignBlank, mutant: fuzzEvidenceRustReferences.campaignBlank.replace("!report.instrumented || !report.tool_ok", "false") },
};

export const fuzzEvidenceRetrievalFixtures = {
  "fuzz-input-domain": { reference: fuzzEvidenceRustReferences.taggedRetrieval, mutant: fuzzEvidenceRustReferences.taggedRetrieval.replace("tag == 7 && payload.len() >= length as usize", "payload.len() >= length as usize") },
  "fuzz-oracle-sensitivity": { reference: fuzzEvidenceRustReferences.duplicateRetrieval, mutant: fuzzEvidenceRustReferences.duplicateRetrieval.replace("actual == expected", "actual.len() == expected.len()") },
  "fuzz-counterexample-regression": { reference: fuzzEvidenceRustReferences.frameRetrieval, mutant: fuzzEvidenceRustReferences.frameRetrieval.replace("failure == \"SelectionMismatch\"", "failure == \"Timeout\"") },
  "fuzz-campaign-evidence": { reference: fuzzEvidenceRustReferences.dossierRetrieval, mutant: fuzzEvidenceRustReferences.dossierRetrieval.replace("if replay_only { \"failed\" }", "if false { \"failed\" }") },
};
