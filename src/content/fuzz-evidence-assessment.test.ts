import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { lessons, reviewExercises } from "./course";
import {
  fuzzEvidenceAssessmentFixtures,
  fuzzEvidenceRetrievalFixtures,
  decodeCase,
  compareOutputs,
  chooseWitness,
  classifyReport,
} from "./fuzz-evidence-assessment-fixtures";
import { fuzzEvidenceLessons } from "./fuzz-evidence";

const compileAndRun = (
  id: string,
  source: string,
  tests: string,
  expected: boolean,
) => {
  const directory = mkdtempSync(join(tmpdir(), "fuzz-evidence-assessment-"));
  try {
    const file = join(directory, `${id}.rs`);
    const binary = join(directory, id);
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error, `${id}: compiler`).toBeUndefined();
    expect(compiled.status, `${id}: ${compiled.stderr}`).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(executed.error, `${id}: runner`).toBeUndefined();
    const output = `${executed.stdout}${executed.stderr}`;
    if (expected) {
      expect(executed.status, `${id}: ${output}`).toBe(0);
    } else {
      expect(executed.status, `${id}: ${output}`).toBe(101);
      expect(output, `${id}: missing named assertion marker`).toMatch(
        /test __rust_workshop_hidden_tests::[A-Za-z0-9_]+ \.\.\. FAILED/,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const codeOf = (reference: string) =>
  reference.slice(0, reference.indexOf("\n#[test]"));

const campaignReport = () => ({
  schemaVersion: 1 as const,
  runId: "opaque run/id",
  archiveSha256: "opaque archive",
  manifestSha256: "opaque manifest",
  instrumentation: true,
  normalCompletion: true,
  observedRuns: 1000,
  status: "failed" as const,
  phase: "campaign" as const,
});

it("publishes the learner-facing Rust signatures without hiding the contract", () => {
  const gates = fuzzEvidenceLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evidenceGate),
  );
  const input = gates.find((step) => step.id === "fuzz-input-domain-gate");
  const oracle = gates.find(
    (step) => step.id === "fuzz-oracle-sensitivity-gate",
  );
  const oracleBlank = gates.find(
    (step) => step.id === "fuzz-oracle-sensitivity-blank",
  );
  const reducer = gates.find(
    (step) => step.id === "fuzz-counterexample-regression-gate",
  );
  const campaign = gates.find(
    (step) => step.id === "fuzz-campaign-evidence-gate",
  );
  expect(input?.code).toContain("struct Case<'a>");
  expect(input?.code).toContain(
    "fn decode_case(bytes: &[u8]) -> Option<Case<'_>>",
  );
  expect(
    fuzzEvidenceLessons
      .find((lesson) => lesson.id === "fuzz-input-domain")
      ?.steps.find((step) => step.id === "fuzz-input-domain-blank")?.prompt,
  ).toContain("decode_command(bytes: &[u8]) -> Option<(&[u8], &[u8])>");
  expect(
    fuzzEvidenceLessons
      .find((lesson) => lesson.id === "fuzz-input-domain")
      ?.steps.find((step) => step.id === "fuzz-input-domain-blank")?.prompt,
  ).toContain("bytes.len() < length + 1");
  const inputGate = gates.find((step) => step.id === "fuzz-input-domain-gate");
  expect(inputGate?.prompt).toContain("3 <= bytes.len() <= 4096");
  expect(inputGate?.prompt).toContain("context = bytes[0] % 20");
  expect(inputGate?.prompt).toContain("big-endian `u16`");
  const inputRecall = fuzzEvidenceLessons
    .find((lesson) => lesson.id === "fuzz-input-domain")
    ?.steps.find((step) => step.id === "fuzz-input-domain-recall");
  expect(inputRecall?.evaluator?.kind).toBe("choice");
  if (inputRecall?.evaluator?.kind === "choice")
    expect(inputRecall.evaluator.correct).toBe("0");
  expect(oracle?.code).toContain("fn same_result(");
  expect(oracleBlank?.solution).toContain(
    "fn decode_frame(bytes: &[u8]) -> Option<Frame<'_>>",
  );
  expect(oracleBlank?.solution).toContain("bytes.len() > 4096");
  expect(oracleBlank?.solution).toContain("query: String");
  expect(oracleBlank?.solution).toContain("body: &'a [u8]");
  expect(oracleBlank?.solution).toContain("bytes[0] % 20");
  expect(reducer?.code).toContain("struct Observation");
  expect(reducer?.code).toContain(
    "fn executable_regression(bytes: &[u8]) -> bool",
  );
  expect(reducer?.code).toContain(
    "fn choose_witness(original: &[u8], candidates: &[Observation])",
  );
  expect(
    fuzzEvidenceAssessmentFixtures[
      "fuzz-counterexample-regression-gate"
    ].reference.slice(
      fuzzEvidenceAssessmentFixtures[
        "fuzz-counterexample-regression-gate"
      ].reference.indexOf("\n#[test]") + 1,
    ),
  ).toContain("fn never_regresses");
  expect(
    fuzzEvidenceLessons
      .find((lesson) => lesson.id === "fuzz-counterexample-regression")
      ?.steps.find((step) => step.id === "fuzz-counterexample-regression-blank")
      ?.prompt,
  ).toContain(
    "reduce_frame(original: &[u8], candidate: &[u8], failure_class: &str) -> Vec<u8>",
  );
  expect(campaign?.code).toContain("struct Dossier");
  expect(campaign?.code).toContain(
    "fn classify_report(dossier: &Dossier, _: &str, _: &str, _: &str)",
  );
  expect(
    fuzzEvidenceLessons
      .find((lesson) => lesson.id === "fuzz-campaign-evidence")
      ?.steps.find((step) => step.id === "fuzz-campaign-evidence-blank")
      ?.prompt,
  ).toContain("triage_report(report: &Triage) -> &'static str");
  expect(reviewExercises["fuzz-input-domain"]?.prompt ?? "").toContain(
    "decode_tagged(bytes: &[u8]) -> Option<(&[u8], &[u8])>",
  );
  expect(reviewExercises["fuzz-input-domain"]?.prompt ?? "").toContain(
    "tag: u8 = 7",
  );
  expect(
    reviewExercises["fuzz-counterexample-regression"]?.prompt ?? "",
  ).toContain(
    "shrink_window(original: &Window, candidate: Window, outcome: &str) -> Window",
  );
  expect(
    reviewExercises["fuzz-counterexample-regression"]?.prompt ?? "",
  ).toContain("declared as usize == payload.len()");
  expect(
    reviewExercises["fuzz-counterexample-regression"]?.prompt ?? "",
  ).toContain('outcome == "LengthMismatch"');
  expect(reviewExercises["fuzz-campaign-evidence"]?.prompt ?? "").toContain(
    "classify_dossier(report: &Triage) -> &'static str",
  );
  expect(reviewExercises["fuzz-campaign-evidence"]?.prompt ?? "").toContain(
    "toolchain, expected_toolchain",
  );
  expect(reviewExercises["fuzz-campaign-evidence"]?.prompt ?? "").toContain(
    "runs < 1000",
  );
  expect(reviewExercises["fuzz-campaign-evidence"]?.code ?? "").toContain(
    "expected_archive_hash",
  );
  expect(oracleBlank?.evaluator?.kind).toBe("tests");
  expect(
    oracleBlank?.evaluator?.kind === "tests" ? oracleBlank.evaluator.tests : "",
  ).toContain("decode_frame");
});

it("keeps the raw-byte decoder boundary and lossy-query semantics", () => {
  const parsed = decodeCase(new Uint8Array([0, 0, 1, 120, 0xff]));
  expect(parsed?.query).toBe("x");
  expect([...(parsed?.body ?? new Uint8Array())]).toEqual([0xff]);
  expect(decodeCase(new Uint8Array([0, 0]))).toBeUndefined();
  expect(decodeCase(new Uint8Array(4097))).toBeUndefined();
});

it("compiles and runs every correct gate, blank and retrieval reference, then rejects its semantic mutant", () => {
  const steps = fuzzEvidenceLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evidenceGate),
  );
  const retrievals = fuzzEvidenceLessons.map(
    (lesson) => reviewExercises[lesson.conceptIds[0]],
  );
  expect(steps).toHaveLength(9);
  expect(retrievals).toHaveLength(4);
  for (const step of [...steps, ...retrievals]) {
    expect(step.evaluator?.kind, step.id).toBe("tests");
    if (step.evaluator?.kind !== "tests" || !step.solution) continue;
    compileAndRun(step.id, step.solution, step.evaluator.tests, true);
  }
  const reducerGate = steps.find(
    (step) => step.id === "fuzz-counterexample-regression-gate",
  );
  if (reducerGate?.evaluator?.kind === "tests" && reducerGate.code)
    compileAndRun(
      "fuzz-counterexample-regression-starter",
      reducerGate.code,
      reducerGate.evaluator.tests,
      false,
    );
  for (const [id, fixture] of Object.entries(fuzzEvidenceAssessmentFixtures)) {
    const lessonStep = [
      ...lessons.flatMap((lesson) => lesson.steps),
      ...retrievals,
    ].find((step) => step.id === id);
    expect(lessonStep?.evaluator?.kind, id).toBe("tests");
    if (!lessonStep || lessonStep.evaluator?.kind !== "tests") continue;
    compileAndRun(
      `${id}-mutant`,
      codeOf(fixture.mutant),
      lessonStep.evaluator.tests,
      false,
    );
    for (const [index, mutant] of ("mutants" in fixture
      ? fixture.mutants
      : []
    ).entries())
      compileAndRun(
        `${id}-mutant-${index}`,
        codeOf(mutant),
        lessonStep.evaluator.tests,
        false,
      );
  }
  for (const [id, fixture] of Object.entries(fuzzEvidenceRetrievalFixtures)) {
    const retrieval = retrievals.find((step) => step.id === `${id}-review`);
    expect(retrieval?.evaluator?.kind, `${id}-retrieval`).toBe("tests");
    if (!retrieval || retrieval.evaluator?.kind !== "tests") continue;
    for (const [index, mutant] of fixture.mutants.entries())
      compileAndRun(
        `${id}-retrieval-mutant-${index}`,
        codeOf(mutant),
        retrieval.evaluator.tests,
        false,
      );
  }
}, 45_000);

it("compares complete output, retains typed findings and classifies dossiers", () => {
  const rows = [
    { lineNumber: 1, text: "ax", matched: true },
    { lineNumber: 1, text: "ax", matched: true },
  ];
  expect(compareOutputs(rows, rows)).toBe(true);
  expect(compareOutputs(rows, rows.slice(0, 1))).toBe(false);
  const original = new Uint8Array([1, 2, 3, 4]);
  const candidate = new Uint8Array([1, 2, 3]);
  expect(
    chooseWitness(
      original,
      [candidate],
      [{ bytes: candidate, failure: "SelectionMismatch" }],
    ),
  ).toEqual(candidate);
  expect(
    chooseWitness(
      original,
      [candidate],
      [{ bytes: candidate, failure: "Timeout" }],
    ),
  ).toEqual(original);
  expect(
    classifyReport({
      schemaVersion: 1,
      runId: "r",
      archiveSha256: "a",
      manifestSha256: "m",
      instrumentation: true,
      normalCompletion: true,
      observedRuns: 1000,
      status: "passed",
      phase: "campaign",
    }),
  ).toBe("passed");
  expect(
    classifyReport({
      schemaVersion: 1,
      runId: "r",
      archiveSha256: "a",
      manifestSha256: "m",
      instrumentation: true,
      normalCompletion: true,
      observedRuns: 1000,
      status: "passed",
      phase: "replay",
      replayOnly: true,
    }),
  ).toBe("failed");
  expect(
    classifyReport({
      schemaVersion: 1,
      runId: "r",
      archiveSha256: "a",
      manifestSha256: "m",
      instrumentation: false,
      normalCompletion: true,
      observedRuns: 1000,
      status: "passed",
      phase: "campaign",
    }),
  ).toBe("infrastructure");
});

it("fuzz-ts-all-empty-identities-infrastructure", () => {
  expect(
    classifyReport({
      ...campaignReport(),
      runId: "",
      archiveSha256: "",
      manifestSha256: "",
    }),
  ).toBe("infrastructure");
});

it("fuzz-ts-empty-run-id-infrastructure", () => {
  expect(classifyReport({ ...campaignReport(), runId: "" })).toBe(
    "infrastructure",
  );
});

it("fuzz-ts-empty-archive-sha256-infrastructure", () => {
  expect(classifyReport({ ...campaignReport(), archiveSha256: "" })).toBe(
    "infrastructure",
  );
});

it("fuzz-ts-empty-manifest-sha256-infrastructure", () => {
  expect(classifyReport({ ...campaignReport(), manifestSha256: "" })).toBe(
    "infrastructure",
  );
});

it("fuzz-ts-replay-plus-empty-identities-infrastructure", () => {
  expect(
    classifyReport({
      ...campaignReport(),
      runId: "",
      archiveSha256: "",
      manifestSha256: "",
      phase: "replay",
      replayOnly: true,
    }),
  ).toBe("infrastructure");
});

it("fuzz-ts-valid-opaque-identities-status-passthrough", () => {
  expect(classifyReport(campaignReport())).toBe("failed");
});

type NativeControl = { name: string; reference: string; tests: string };

const dedicatedNativeTest = (
  name: string,
  reference: string,
  assertion: string,
): NativeControl => ({
  name,
  reference,
  tests: `#[test]\nfn ${name.replace(/-/g, "_")}() {\n    ${assertion}\n}`,
});

const campaignDossier = (
  runId = '"run-1"',
  archive = '"archive-a"',
  manifest = '"manifest-a"',
  status = '"passed"',
  replayOnly = "false",
) =>
  `Dossier { run_id: ${runId}, archive_hash: ${archive}, manifest_hash: ${manifest}, instrumented: true, normal: true, runs: 1000, replay_only: ${replayOnly}, status: ${status} }`;

const campaignControl = (
  name: string,
  dossier: string,
  currentRun = '"run-1"',
  currentArchive = '"archive-a"',
  currentManifest = '"manifest-a"',
  result = '"infrastructure"',
) =>
  dedicatedNativeTest(
    name,
    fuzzEvidenceAssessmentFixtures["fuzz-campaign-evidence-gate"].reference,
    `assert_eq!(classify_report(&${dossier}, ${currentRun}, ${currentArchive}, ${currentManifest}), ${result});`,
  );

const triageReport = (
  archive = '"archive-a"',
  expectedArchive = '"archive-a"',
  manifest = '"manifest-a"',
  expectedManifest = '"manifest-a"',
  instrumented = "true",
  toolOk = "true",
  finding = "false",
) =>
  `Triage { archive_hash: ${archive}, expected_archive_hash: ${expectedArchive}, manifest_hash: ${manifest}, expected_manifest_hash: ${expectedManifest}, instrumented: ${instrumented}, tool_ok: ${toolOk}, finding: ${finding} }`;

const triageControl = (
  name: string,
  report: string,
  result = '"infrastructure"',
) =>
  dedicatedNativeTest(
    name,
    fuzzEvidenceAssessmentFixtures["fuzz-campaign-evidence-blank"].reference,
    `assert_eq!(triage_report(&${report}), ${result});`,
  );

const reviewReport = (
  archive = '"archive-a"',
  expectedArchive = '"archive-a"',
  manifest = '"manifest-a"',
  expectedManifest = '"manifest-a"',
  toolchain = '"stable"',
  expectedToolchain = '"stable"',
  instrumented = "true",
  normal = "true",
  runs = "1000",
  replayOnly = "false",
) =>
  `Triage { archive_hash: ${archive}, expected_archive_hash: ${expectedArchive}, manifest_hash: ${manifest}, expected_manifest_hash: ${expectedManifest}, toolchain: ${toolchain}, expected_toolchain: ${expectedToolchain}, instrumented: ${instrumented}, normal: ${normal}, runs: ${runs}, replay_only: ${replayOnly} }`;

const reviewControl = (
  name: string,
  report: string,
  result = '"infrastructure"',
) =>
  dedicatedNativeTest(
    name,
    fuzzEvidenceRetrievalFixtures["fuzz-campaign-evidence"].reference,
    `assert_eq!(classify_dossier(&${report}), ${result});`,
  );

const nativeControlReferences: NativeControl[] = [
  campaignControl(
    "fuzz-campaign-all-empty-identities-infrastructure",
    campaignDossier("\"\"", "\"\"", "\"\""),
    '""',
    '""',
    '""',
  ),
  campaignControl(
    "fuzz-campaign-empty-run-id-infrastructure",
    campaignDossier('""'),
  ),
  campaignControl(
    "fuzz-campaign-empty-archive-hash-infrastructure",
    campaignDossier('"run-1"', '""'),
  ),
  campaignControl(
    "fuzz-campaign-empty-manifest-hash-infrastructure",
    campaignDossier('"run-1"', '"archive-a"', '""'),
  ),
  campaignControl(
    "fuzz-campaign-mismatch-run-id-infrastructure",
    campaignDossier('"stale"'),
  ),
  campaignControl(
    "fuzz-campaign-mismatch-archive-hash-infrastructure",
    campaignDossier('"run-1"', '"stale"'),
  ),
  campaignControl(
    "fuzz-campaign-mismatch-manifest-hash-infrastructure",
    campaignDossier('"run-1"', '"archive-a"', '"stale"'),
  ),
  campaignControl(
    "fuzz-campaign-empty-current-run-id-infrastructure",
    campaignDossier(),
    '""',
  ),
  campaignControl(
    "fuzz-campaign-empty-current-archive-hash-infrastructure",
    campaignDossier(),
    '"run-1"',
    '""',
  ),
  campaignControl(
    "fuzz-campaign-empty-current-manifest-hash-infrastructure",
    campaignDossier(),
    '"run-1"',
    '"archive-a"',
    '""',
  ),
  campaignControl(
    "fuzz-campaign-mismatch-current-run-id-infrastructure",
    campaignDossier(),
    '"stale"',
  ),
  campaignControl(
    "fuzz-campaign-mismatch-current-archive-hash-infrastructure",
    campaignDossier(),
    '"run-1"',
    '"stale"',
  ),
  campaignControl(
    "fuzz-campaign-mismatch-current-manifest-hash-infrastructure",
    campaignDossier(),
    '"run-1"',
    '"archive-a"',
    '"stale"',
  ),
  campaignControl(
    "fuzz-campaign-replay-plus-empty-identities-failed",
    campaignDossier('""', '""', '""', '"passed"', "true"),
    '""',
    '""',
    '""',
    '"failed"',
  ),
  campaignControl(
    "fuzz-campaign-valid-opaque-status-passthrough",
    campaignDossier('"opaque run/id"', '"opaque archive"', '"opaque manifest"', '"failed"'),
    '"opaque run/id"',
    '"opaque archive"',
    '"opaque manifest"',
    '"failed"',
  ),
  triageControl(
    "fuzz-triage-all-empty-identities-infrastructure",
    triageReport('""', '""', '""', '""'),
  ),
  triageControl(
    "fuzz-triage-each-actual-and-expected-identity-empty-infrastructure",
    triageReport('""'),
  ),
  triageControl("fuzz-triage-empty-expected-archive-infrastructure", triageReport('"archive-a"', '""')),
  triageControl("fuzz-triage-empty-manifest-infrastructure", triageReport('"archive-a"', '"archive-a"', '""')),
  triageControl("fuzz-triage-empty-expected-manifest-infrastructure", triageReport('"archive-a"', '"archive-a"', '"manifest-a"', '""')),
  triageControl(
    "fuzz-triage-each-identity-mismatch-infrastructure",
    triageReport('"stale"'),
  ),
  triageControl("fuzz-triage-mismatch-expected-archive-infrastructure", triageReport('"archive-a"', '"stale"')),
  triageControl("fuzz-triage-mismatch-manifest-infrastructure", triageReport('"archive-a"', '"archive-a"', '"stale"')),
  triageControl("fuzz-triage-mismatch-expected-manifest-infrastructure", triageReport('"archive-a"', '"archive-a"', '"manifest-a"', '"stale"')),
  triageControl(
    "fuzz-triage-valid-opaque-identities-passed",
    triageReport('"opaque archive"', '"opaque archive"', '"opaque manifest"', '"opaque manifest"'),
    '"passed"',
  ),
  reviewControl(
    "fuzz-review-all-empty-identities-infrastructure",
    reviewReport('""', '""', '""', '""', '""', '""'),
  ),
  reviewControl(
    "fuzz-review-each-actual-and-expected-identity-empty-infrastructure",
    reviewReport('""'),
  ),
  reviewControl("fuzz-review-empty-expected-archive-infrastructure", reviewReport('"archive-a"', '""')),
  reviewControl("fuzz-review-empty-manifest-infrastructure", reviewReport('"archive-a"', '"archive-a"', '""')),
  reviewControl("fuzz-review-empty-expected-manifest-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"manifest-a"', '""')),
  reviewControl("fuzz-review-empty-toolchain-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"manifest-a"', '"manifest-a"', '""')),
  reviewControl("fuzz-review-empty-expected-toolchain-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"manifest-a"', '"manifest-a"', '"stable"', '""')),
  reviewControl(
    "fuzz-review-each-identity-mismatch-infrastructure",
    reviewReport('"stale"'),
  ),
  reviewControl("fuzz-review-mismatch-expected-archive-infrastructure", reviewReport('"archive-a"', '"stale"')),
  reviewControl("fuzz-review-mismatch-manifest-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"stale"')),
  reviewControl("fuzz-review-mismatch-expected-manifest-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"manifest-a"', '"stale"')),
  reviewControl("fuzz-review-mismatch-toolchain-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"manifest-a"', '"manifest-a"', '"nightly"')),
  reviewControl("fuzz-review-mismatch-expected-toolchain-infrastructure", reviewReport('"archive-a"', '"archive-a"', '"manifest-a"', '"manifest-a"', '"stable"', '"nightly"')),
  reviewControl(
    "fuzz-review-replay-plus-empty-identities-failed",
    reviewReport('""', '""', '""', '""', '""', '""', "true", "true", "1000", "true"),
    '"failed"',
  ),
  reviewControl(
    "fuzz-review-valid-opaque-identities-passed",
    reviewReport('"opaque archive"', '"opaque archive"', '"opaque manifest"', '"opaque manifest"', '"opaque toolchain"', '"opaque toolchain"'),
    '"passed"',
  ),
];

it.each(nativeControlReferences)("$name", ({ name, reference, tests }) => {
  const marker = reference.indexOf("\n#[test]");
  expect(marker).toBeGreaterThan(0);
  compileAndRun(name, reference.slice(0, marker), tests, true);
});

it("fuzz-triage-no-replay-branch", () => {
  expect(
    fuzzEvidenceAssessmentFixtures["fuzz-campaign-evidence-blank"].reference,
  ).not.toContain("replay");
});

it("tagged retrieval preserves empty payloads, short headers and raw borrowed bytes", () => {
  const reference =
    fuzzEvidenceRetrievalFixtures["fuzz-input-domain"].reference;
  const source = reference.slice(0, reference.indexOf("\n#[test]"));
  const tests = String.raw`#[test]
fn tagged_raw_boundaries() {
    assert_eq!(decode_tagged(&[]), None);
    assert_eq!(decode_tagged(&[7]), None);
    assert_eq!(decode_tagged(&[7, 0]), Some((&[][..], &[][..])));
    let raw = [7, 0, 0xff, 0x00];
    let (payload, remainder) = decode_tagged(&raw).unwrap();
    assert!(payload.is_empty());
    assert_eq!(remainder, &[0xff, 0x00]);
    assert_eq!(remainder.as_ptr(), raw[2..].as_ptr());
    let mut long = vec![7, 255];
    long.extend(std::iter::repeat_n(0xff, 5000));
    let (payload, remainder) = decode_tagged(&long).unwrap();
    assert_eq!(payload.len(), 255);
    assert_eq!(remainder.len(), 4745);
    assert_eq!(payload.as_ptr(), long[2..].as_ptr());
}`;
  compileAndRun("tagged-boundaries", source, tests, true);
  const rejectsEmpty = source.replace(
    "tag == 7 &&",
    "tag == 7 && length > 0 &&",
  );
  expect(rejectsEmpty).not.toBe(source);
  compileAndRun("tagged-empty-mutant", rejectsEmpty, tests, false);
});
