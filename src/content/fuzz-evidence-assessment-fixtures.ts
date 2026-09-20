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
  const queryBytes = bytes.slice(3, 3 + Math.min(declared, bytes.length - 3));
  const query = new TextDecoder("utf-8", { fatal: false }).decode(queryBytes);
  if (query.length === 0 || query.length > 1024) return undefined;
  return { context, query, body: bytes.slice(3 + queryBytes.length) };
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
    if query.is_empty() || query.len() > 1024 { return None; }
    Some(Case { context, query, body: &bytes[3 + query_len..] })
}`,
  oracle: String.raw`fn same_output(actual: &[(usize, String, bool)], expected: &[(usize, String, bool)]) -> bool {
    actual == expected // kolejność, numer, tekst i flaga matched są obserwowane
}
fn classify_error(left: Result<(), &'static str>, right: Result<(), &'static str>) -> bool {
    left == right // Err nie może stać się cichym sukcesem
}`,
  reducer: String.raw`fn choose_witness(original: &[u8], candidates: &[Vec<u8>], observations: &[(Vec<u8>, &str)]) -> Vec<u8> {
    candidates.iter().filter(|candidate| candidate.len() < original.len())
        .filter(|candidate| observations.iter().any(|(bytes, class)| bytes == *candidate && *class == "SelectionMismatch"))
        .min_by_key(|candidate| candidate.len()).cloned().unwrap_or_else(|| original.to_vec())
}`,
  campaign: String.raw`fn classify_report(instrumentation: bool, replay_only: bool, normal: bool, runs: usize) -> &'static str {
    if replay_only { return "failed"; }
    if !instrumentation || !normal || runs < 1000 { return "infrastructure"; }
    "passed"
}`,
};

export const fuzzEvidenceAssessmentFixtures = {
  "fuzz-input-domain-gate": { reference: fuzzEvidenceRustReferences.inputDomain, mistakes: ["String::from_utf8_lossy(&bytes[3..])", "bytes[3..5].to_vec()", "unwrap()"] },
  "fuzz-oracle-sensitivity-gate": { reference: fuzzEvidenceRustReferences.oracle, mistakes: ["actual.len() == expected.len()", ".sort()", "is_ok()"] },
  "fuzz-counterexample-regression-gate": { reference: fuzzEvidenceRustReferences.reducer, mistakes: ["candidate.len() <= original.len()", "unwrap_or_default()", "Timeout"] },
  "fuzz-campaign-evidence-gate": { reference: fuzzEvidenceRustReferences.campaign, mistakes: ["replay_only", "runs > 0", "status = \"passed\""] },
};
