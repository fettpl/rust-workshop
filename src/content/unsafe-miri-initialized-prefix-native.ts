import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { appendHiddenTests } from "../runner";
import {
  initializedPrefixEquivalent,
  initializedPrefixSafeVariants,
  initializedPrefixSolution,
  initializedPrefixTests,
} from "./unsafe-miri-initialized-prefix";
import type {
  PrefixCommandSpec,
  PrefixFileRef,
  PrefixMode,
  PrefixProofManifest,
  PrefixRecordedCommand,
  PrefixRecipeExpectation,
  PrefixVerificationResult,
} from "./unsafe-miri-initialized-prefix-proof";
import {
  loadInitializedPrefixObservedExpectations,
  verifyInitializedPrefixEvidence,
  verifyInitializedPrefixTamperControls,
} from "./unsafe-miri-initialized-prefix-proof";
import {
  createInitializedPrefixAttempt,
  qualifyInitializedPrefixToolchain,
  recordInitializedPrefixCommand,
} from "./unsafe-miri-initialized-prefix-recorder";

export type InitializedPrefixNativeMode = PrefixMode;
export interface VerifyInitializedPrefixNativeOptions {
  mode: PrefixMode;
  evidenceDirectory?: string;
}
export type InitializedPrefixNativeResult = PrefixVerificationResult & {
  mode: PrefixMode;
  phase: "capture" | "strict";
  attemptDirectory: string;
  manifestPath: string;
  expectedRecipes: readonly string[];
};

const FULL_TEST_NAMES = [
  "case01_empty_destination_and_source",
  "case02_empty_source_fresh_destination",
  "case03_empty_source_initialized_sentinel_no_write",
  "case04_one_byte_zero",
  "case05_one_byte_high",
  "case06_partial_array_prefix",
  "case07_partial_vec_prefix",
  "case08_exact_capacity",
  "case09_oversized_source_returns_error",
  "case10_oversized_source_does_not_write",
  "case11_arbitrary_zero_high_bytes",
  "case12_invalid_utf8_bytes",
  "case13_nonempty_pointer_identity_array",
  "case14_nonempty_pointer_identity_vec",
  "case15_output_length_one",
  "case16_output_length_partial",
  "case17_empty_result_has_no_identity_requirement",
  "case18_source_lifetime_independence",
  "case19_destination_reusable_after_last_borrow",
  "case20_array_capacity_one",
  "case21_vec_capacity_one",
  "case22_destination_longer_than_source",
  "case23_nonempty_destination_empty_source",
  "case24_empty_destination_oversized_source",
  "case25_prefix_order",
  "case26_prefix_exact_values",
  "case27_initialized_suffix_preserved",
  "case28_too_long_preserves_first_sentinel",
  "case29_too_long_preserves_last_sentinel",
  "case30_repeated_calls",
  "case31_two_independent_backings",
  "case32_high_byte_255_survives",
  "case33_zero_byte_in_middle_survives",
  "case34_output_is_destination_slice",
  "case35_initialized_prefix_only_is_read",
  "intended_reverse_order",
  "intended_wrong_prefix_value",
  "intended_returned_length",
  "intended_exact_capacity",
  "intended_oversized_no_write",
  "intended_suffix_preservation",
  "intended_destination_identity",
] as const;

const INTENDED_ASSERTIONS: Readonly<
  Record<string, { occurrence: number; expression: string; message: string }>
> = {
  intended_reverse_order: {
    occurrence: 0,
    expression: "crate::fill_prefix(&mut dst, &[1, 2, 3]).unwrap(), &[1, 2, 3]",
    message: "reverse mutant must preserve source order",
  },
  intended_wrong_prefix_value: {
    occurrence: 0,
    expression: "crate::fill_prefix(&mut dst, &[7, 8]).unwrap(), &[7, 8]",
    message: "prefix bytes must equal source",
  },
  intended_returned_length: {
    occurrence: 0,
    expression: "crate::fill_prefix(&mut dst, &[7, 8, 9]).unwrap().len(), 3",
    message: "returned length must equal source length",
  },
  intended_exact_capacity: {
    occurrence: 0,
    expression: "result.is_ok()",
    message: "exact nonempty capacity must succeed",
  },
  intended_oversized_no_write: {
    occurrence: 1,
    expression:
      "unsafe { [dst[0].assume_init(), dst[1].assume_init()] }, [0x5a; 2]",
    message: "TooLong must not alter sentinel",
  },
  intended_suffix_preservation: {
    occurrence: 1,
    expression:
      "unsafe { [dst[2].assume_init(), dst[3].assume_init(), dst[4].assume_init()] }, [0x5a; 3]",
    message: "mutant must not write beyond prefix",
  },
  intended_destination_identity: {
    occurrence: 0,
    expression: "out.as_ptr(), start",
    message: "nonempty output must borrow destination rather than leak a copy",
  },
};

const BOUNDARIES = [
  {
    id: "owner-escape",
    negative: `fn main() { let view = { let mut owner = [MaybeUninit::uninit(); 3]; fill_prefix(&mut owner, b"abc").unwrap() }; assert_eq!(view, b"abc"); }`,
    corrected: `fn main() { let mut owner = [MaybeUninit::uninit(); 3]; let view = fill_prefix(&mut owner, b"abc").unwrap(); assert_eq!(view, b"abc"); }`,
    lifetime: `fn main() { let mut owner = [MaybeUninit::uninit(); 3]; let view = { let source = vec![0, 255, 128]; fill_prefix(&mut owner, &source).unwrap() }; assert_eq!(view, &[0, 255, 128]); }`,
  },
  {
    id: "reborrow",
    negative: `fn main() { let mut owner = [MaybeUninit::uninit(); 3]; let view = fill_prefix(&mut owner, b"abc").unwrap(); owner[0].write(b'Z'); assert_eq!(view[0], b'a'); }`,
    corrected: `fn main() { let mut owner = [MaybeUninit::new(0); 3]; { let view = fill_prefix(&mut owner, b"abc").unwrap(); assert_eq!(view, b"abc"); } owner[0].write(b'Z'); assert_eq!(unsafe { owner[0].assume_init() }, b'Z'); }`,
    lifetime: `fn main() { let mut owner = [MaybeUninit::uninit(); 3]; let view = { let source = vec![0, 255, 128]; fill_prefix(&mut owner, &source).unwrap() }; assert_eq!(view, &[0, 255, 128]); }`,
  },
  {
    id: "static-demand",
    negative: `fn require_static(_: &'static [u8]) {} fn main() { let mut owner = [MaybeUninit::uninit(); 3]; require_static(fill_prefix(&mut owner, b"abc").unwrap()); }`,
    corrected: `fn consume_local(view: &[u8]) { assert_eq!(view, b"abc"); } fn main() { let mut owner = [MaybeUninit::uninit(); 3]; let view = fill_prefix(&mut owner, b"abc").unwrap(); consume_local(view); }`,
    lifetime: `fn main() { let mut owner = [MaybeUninit::uninit(); 3]; let view = { let source = vec![0, 255, 128]; fill_prefix(&mut owner, &source).unwrap() }; assert_eq!(view, &[0, 255, 128]); }`,
  },
] as const;

/** The maintained inventory is intentionally finite and reviewable. */
export const initializedPrefixNativePlan = Object.freeze({
  fullHarnessTests: FULL_TEST_NAMES.length,
  positiveMechanisms: ["element", "bulk"] as const,
  safeVariantCount: 14,
  compilerModes: ["stable", "msrv", "miri"] as const,
  boundaries: BOUNDARIES.map((boundary) => boundary.id),
  miriFixtures: ["skipped-write-ub", "sound-twin"] as const,
});

const FULL_QUALIFIED_TEST_NAMES = FULL_TEST_NAMES.map(qualified);
const STABLE_CONTROL_IDS = [
  "baseline-valid",
  "mutate-outcome",
  "mutate-stream",
  "mutate-source",
  "mutate-manifest-inventory",
  "diagnostic-code",
  "diagnostic-primary-same-line",
  "diagnostic-multiplicity",
  "diagnostic-collateral",
] as const;
const MIRI_CONTROL_IDS = [
  ...STABLE_CONTROL_IDS,
  "miri-wrong-read",
  "miri-category",
] as const;
const CONTROL_REASON_ALLOWLIST: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    "mutate-outcome": ["exit-code-mismatch"],
    "mutate-stream": ["unexpected-collateral"],
    "mutate-source": ["source-binding-mismatch"],
    "mutate-manifest-inventory": ["recipe-inventory-mismatch"],
    "diagnostic-code": ["diagnostic-code-mismatch"],
    "diagnostic-primary-same-line": ["diagnostic-primary-mismatch"],
    "diagnostic-multiplicity": ["diagnostic-multiplicity"],
    "diagnostic-collateral": ["unexpected-collateral"],
    "miri-wrong-read": ["miri-read-mismatch"],
    "miri-category": ["miri-category-mismatch"],
  });
const WHOLE_CAPTURE_DEADLINE_MS = 8 * 60 * 1000;

type InitializedPrefixControlResult = {
  id: string;
  rejected: boolean;
  reasons: readonly { code: string }[];
};

/**
 * Control acceptance is deliberately an exact finite-set check. An intended
 * semantic reason cannot hide an unrelated hash, link, closure, or transport
 * fault in the same mutation result. This one feature-specific Node-only seam
 * is intentionally internal to the native proof module so its pure policy can
 * be tested without widening any shared proof/recorder interface.
 */
export function isInitializedPrefixControlAccepted(
  control: InitializedPrefixControlResult,
): boolean {
  const allowed = CONTROL_REASON_ALLOWLIST[control.id];
  if (!allowed || !control.rejected || control.reasons.length === 0)
    return false;
  const codes = control.reasons.map((reason) => reason.code);
  const uniqueCodes = new Set(codes);
  return (
    codes.every((code) => allowed.includes(code)) &&
    allowed.every((code) => uniqueCodes.has(code))
  );
}

const UB_SOURCE = `use std::mem::MaybeUninit;
#[derive(Debug, PartialEq, Eq)]
struct TooLong;
fn fill_prefix<'dst>(dst: &'dst mut [MaybeUninit<u8>], src: &[u8]) -> Result<&'dst [u8], TooLong> {
    if src.len() > dst.len() { return Err(TooLong); }
    // Maintainer-only target-boundary defect: the required prefix write is skipped.
    unsafe { Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len())) }
}
fn main() {
    let mut dst = [MaybeUninit::uninit(); 1];
    let view = fill_prefix(&mut dst, &[7]).unwrap();
    let forced_read = view[0];
    println!("forced target-boundary read: {forced_read}");
}
`;
const SOUND_SOURCE = `use std::mem::MaybeUninit;
#[derive(Debug, PartialEq, Eq)]
struct TooLong;
fn fill_prefix<'dst>(dst: &'dst mut [MaybeUninit<u8>], src: &[u8]) -> Result<&'dst [u8], TooLong> {
    if src.len() > dst.len() { return Err(TooLong); }
    for i in 0..src.len() { dst[i].write(src[i]); }
    unsafe { Ok(std::slice::from_raw_parts(dst.as_ptr().cast::<u8>(), src.len())) }
}
fn main() {
    let mut dst = [MaybeUninit::uninit(); 1];
    let view = fill_prefix(&mut dst, &[7]).unwrap();
    assert_eq!(view[0], 7);
}
`;

const hash = (bytes: string | Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const refOf = (path: string): PrefixFileRef => {
  const bytes = readFileSync(path);
  return { path: resolve(path), bytes: bytes.byteLength, sha256: hash(bytes) };
};

function writeInput(
  attempt: string,
  id: string,
  source: string,
): PrefixFileRef {
  const path = join(attempt, "artifacts", "sources", `${id}.rs`);
  mkdirSync(join(attempt, "artifacts", "sources"), { recursive: true });
  writeFileSync(path, source, { flag: "wx" });
  return refOf(path);
}

function sourceIdForRef(attempt: string, ref: PrefixFileRef): string {
  const path = relative(resolve(attempt), resolve(ref.path))
    .split("\\")
    .join("/");
  if (
    !path ||
    path === "." ||
    path === ".." ||
    path.startsWith("../") ||
    path.includes("/../") ||
    path.endsWith("/..")
  )
    throw new CaptureAbort(`source escaped attempt directory: ${ref.path}`);
  return path;
}

function rememberSource(
  attempt: string,
  sources: Map<string, PrefixFileRef>,
  ref: PrefixFileRef,
): string {
  const id = sourceIdForRef(attempt, ref);
  const prior = sources.get(id);
  if (
    prior &&
    (prior.path !== ref.path ||
      prior.bytes !== ref.bytes ||
      prior.sha256 !== ref.sha256)
  )
    throw new CaptureAbort(`ambiguous source identity for ${id}`);
  sources.set(id, ref);
  return id;
}

function sourceWithHarness(body: string) {
  if ((initializedPrefixTests.match(/#\[test\]/g) ?? []).length !== 42)
    throw new Error("initialized-prefix harness must contain exactly 42 tests");
  const names = Array.from(
    initializedPrefixTests.matchAll(/^\s*fn\s+([A-Za-z0-9_]+)/gm),
    (match) => match[1],
  );
  if (
    names.length !== FULL_TEST_NAMES.length + 1 ||
    !FULL_TEST_NAMES.every((name) => names.includes(name)) ||
    names.includes("fresh") === false
  )
    throw new Error("initialized-prefix harness test identity changed");
  return `${appendHiddenTests(body, initializedPrefixTests)}\n`;
}

function sourceIdForVariant(id: string, restored = false) {
  return `${id}${restored ? "-restored" : ""}`;
}
function qualified(name: string) {
  return `__rust_workshop_hidden_tests::${name}`;
}
function crateName(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_");
  if (!/^[A-Za-z_]/.test(normalized)) return `initialized_prefix_${normalized}`;
  return normalized;
}

function assertionFor(source: string, name: string) {
  const reviewed = INTENDED_ASSERTIONS[name];
  if (!reviewed)
    throw new Error(`missing reviewed assertion mapping for ${name}`);
  const start = source.indexOf(`fn ${name}`);
  if (start < 0) throw new Error(`missing intended test ${name}`);
  const end = source.indexOf("\n#[test]", start + 3);
  const body = source.slice(start, end < 0 ? source.length : end);
  const assertions = [
    ...body.matchAll(/\bassert(?:_eq|_ne)?!\(([\s\S]*?)\);/g),
  ];
  const assertion = assertions[reviewed.occurrence];
  if (!assertion)
    throw new Error(`missing reviewed assertion occurrence for ${name}`);
  const assertionBody = assertion[1];
  const messageMatch = assertionBody.match(/,\s*"([^"]+)"\s*$/);
  const expression = (
    messageMatch ? assertionBody.slice(0, messageMatch.index) : assertionBody
  ).trim();
  const message = messageMatch?.[1] ?? "assertion failed";
  if (expression !== reviewed.expression || message !== reviewed.message) {
    throw new Error(`reviewed assertion mapping changed for ${name}`);
  }
  const expressionOffset = start + body.indexOf(expression);
  return {
    expression,
    message,
    byteStart: Buffer.byteLength(source.slice(0, expressionOffset)),
    byteEnd: Buffer.byteLength(
      source.slice(0, expressionOffset + expression.length),
    ),
  };
}

function recipe(
  input: Omit<PrefixRecipeExpectation, "mode"> & { mode: PrefixMode },
): PrefixRecipeExpectation {
  return input;
}

function commandSpec(
  binding: Awaited<ReturnType<typeof qualifyInitializedPrefixToolchain>>,
  qualification: PrefixFileRef,
  id: string,
  recipeId: string,
  mode: PrefixMode,
  operation: PrefixCommandSpec["operation"],
  executable: PrefixFileRef,
  argv: readonly string[],
  attempt: string,
  inputs: readonly PrefixFileRef[],
): PrefixCommandSpec {
  const consumedInputs: PrefixFileRef[] = [];
  const inputsByPath = new Map<string, PrefixFileRef>();
  for (const input of [...inputs, binding.ref, qualification]) {
    const prior = inputsByPath.get(input.path);
    if (prior && (prior.bytes !== input.bytes || prior.sha256 !== input.sha256))
      throw new CaptureAbort(
        `conflicting consumed input ref for ${input.path}`,
      );
    if (!prior) {
      inputsByPath.set(input.path, input);
      consumedInputs.push(input);
    }
  }
  return {
    id,
    recipeId,
    mode,
    operation,
    executable,
    argv,
    cwd: attempt,
    env: binding.env,
    inputs: consumedInputs,
    externalInputs: binding.sysroot
      ? [binding.sysroot.manifest, ...binding.sysroot.files]
      : [],
    toolchainBinding: binding.ref,
    timeoutMs: 180_000,
    maxBytesPerStream: 4 * 1024 * 1024,
  };
}

function fullExpectation(
  id: string,
  mode: PrefixMode,
  sourceId: string,
  source: PrefixFileRef,
  operation: PrefixCommandSpec["operation"],
  exit: number,
): PrefixRecipeExpectation {
  return recipe({
    id,
    mode,
    operation,
    sourceId,
    sourceSha256: source.sha256,
    expectedExitCode: exit,
    testNames: FULL_QUALIFIED_TEST_NAMES,
  });
}

function writeManifest(path: string, manifest: PrefixProofManifest) {
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
}

function writePartialManifest(path: string, value: unknown): PrefixFileRef {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  return refOf(path);
}

function inventoryAttempt(
  attempt: string,
  excluded: ReadonlySet<string>,
  onProgress?: (stage: string) => void,
): PrefixFileRef[] {
  const files: PrefixFileRef[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      onProgress?.(`before inventory entry ${path}`);
      if (entry.isSymbolicLink())
        throw new CaptureAbort(`attempt inventory contains symlink: ${path}`);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && !excluded.has(resolve(path))) {
        files.push(refOf(path));
        onProgress?.(`after inventory entry ${path}`);
      } else if (!entry.isFile())
        throw new CaptureAbort(
          `attempt inventory contains unsupported entry: ${path}`,
        );
    }
  };
  visit(attempt);
  return files;
}

function sourceBindings(sources: ReadonlyMap<string, PrefixFileRef>) {
  return Object.fromEntries(
    Array.from(sources, ([id, ref]) => [id, ref.sha256]),
  );
}

function compiledOutput(attempt: string, commandId: string): PrefixFileRef {
  const path = join(attempt, "commands", commandId, "compiled-output.json");
  if (!existsSync(path) || !statSync(path).isFile())
    throw new CaptureAbort(`successful compile did not produce ${path}`);
  return refOf(path);
}

class CaptureAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureAbort";
  }
}

function writeAuthoredRecipeInventory(
  attempt: string,
  mode: PrefixMode,
  bindings: Readonly<Record<string, string>>,
  expected: readonly PrefixRecipeExpectation[],
): PrefixFileRef {
  const path = join(attempt, "artifacts", "authored-recipes.json");
  writeFileSync(
    path,
    `${JSON.stringify({ schema: "initialized-prefix-authored-recipes-v1", mode, sourceBindings: bindings, recipes: expected }, null, 2)}\n`,
    { flag: "wx" },
  );
  return refOf(path);
}

function writeCaptureFailure(
  attempt: string,
  mode: PrefixMode,
  stage: string,
  error: unknown,
  partialManifestPath: string,
): PrefixFileRef {
  const path = join(attempt, "artifacts", "capture-failure.json");
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schema: "initialized-prefix-capture-failure-v1",
        mode,
        stage,
        error: error instanceof Error ? error.message : String(error),
        partialManifestPath,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  return refOf(path);
}

type RetentionCheckpoint = {
  phase: string;
  startedAt: string;
  finishedAt: string;
  actualElapsedMs: number;
  overrunMs: number;
  ok: boolean;
};

type RetentionFailure = {
  phase: string;
  message: string;
  actualElapsedMs: number;
  overrunMs: number;
};

type RetentionState = {
  startedAtMs: number;
  deadlineAtMs: number;
  checkpoints: RetentionCheckpoint[];
  failures: RetentionFailure[];
};

type IncompleteEvidence = {
  schema: "initialized-prefix-incomplete-evidence-v1";
  status: "incomplete";
  mode: PrefixMode;
  stage: string;
  attemptDirectory: string;
  partialManifestPath: string;
  captureFailure?: PrefixFileRef;
  authoredRecipes?: PrefixFileRef;
  originalManifest?: PrefixFileRef;
  partialManifest?: PrefixFileRef;
  retainedArtifacts: readonly PrefixFileRef[];
  failures: readonly RetentionFailure[];
  retention: {
    startedAt: string;
    deadlineAt: string;
    finalizedAt: string;
    actualElapsedMs: number;
    overrunMs: number;
    checkpoints: readonly RetentionCheckpoint[];
  };
};

type FinalFailureIndex = {
  schema: "initialized-prefix-final-failure-index-v1";
  status: "incomplete";
  mode: PrefixMode;
  stage: string;
  attemptDirectory: string;
  captureFailure?: PrefixFileRef;
  authoredRecipes?: PrefixFileRef;
  originalManifest?: PrefixFileRef;
  partialManifest?: PrefixFileRef;
  incompleteEvidence?: PrefixFileRef;
  retainedArtifacts: readonly PrefixFileRef[];
  failures: readonly RetentionFailure[];
  retention: ReturnType<typeof retentionSnapshot>;
  terminalArtifact: {
    path: string;
    selfExcludedFromInventory: true;
    writeBoundary: "final failure-index write";
    postWriteTimingRecorded: false;
  };
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retentionSnapshot(state: RetentionState) {
  const now = Date.now();
  return {
    startedAt: new Date(state.startedAtMs).toISOString(),
    deadlineAt: new Date(state.deadlineAtMs).toISOString(),
    finalizedAt: new Date(now).toISOString(),
    actualElapsedMs: Math.max(0, now - state.startedAtMs),
    overrunMs: Math.max(0, now - state.deadlineAtMs),
    checkpoints: [...state.checkpoints],
  };
}

function noteRetentionFailure(
  state: RetentionState,
  phase: string,
  error: unknown,
) {
  const now = Date.now();
  state.failures.push({
    phase,
    message: errorMessage(error),
    actualElapsedMs: Math.max(0, now - state.startedAtMs),
    overrunMs: Math.max(0, now - state.deadlineAtMs),
  });
}

function checkpointRetention(state: RetentionState, phase: string) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const finishedAtMs = Date.now();
  state.checkpoints.push({
    phase,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    actualElapsedMs: Math.max(0, finishedAtMs - state.startedAtMs),
    overrunMs: Math.max(0, finishedAtMs - state.deadlineAtMs),
    ok: true,
  });
}

function retain<T>(
  state: RetentionState,
  phase: string,
  operation: () => T,
): T | undefined {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  try {
    const value = operation();
    const finishedAtMs = Date.now();
    state.checkpoints.push({
      phase,
      startedAt,
      finishedAt: new Date(finishedAtMs).toISOString(),
      actualElapsedMs: Math.max(0, finishedAtMs - state.startedAtMs),
      overrunMs: Math.max(0, finishedAtMs - state.deadlineAtMs),
      ok: true,
    });
    return value;
  } catch (error) {
    const finishedAtMs = Date.now();
    noteRetentionFailure(state, phase, error);
    state.checkpoints.push({
      phase,
      startedAt,
      finishedAt: new Date(finishedAtMs).toISOString(),
      actualElapsedMs: Math.max(0, finishedAtMs - state.startedAtMs),
      overrunMs: Math.max(0, finishedAtMs - state.deadlineAtMs),
      ok: false,
    });
    return undefined;
  }
}

function inventoryAttemptForRetention(
  attempt: string,
  excluded: ReadonlySet<string>,
  state: RetentionState,
): PrefixFileRef[] {
  const files: PrefixFileRef[] = [];
  const visit = (directory: string): void => {
    const entries = retain(state, `retained inventory read ${directory}`, () =>
      readdirSync(directory, { withFileTypes: true }),
    );
    if (!entries) return;
    for (const entry of entries) {
      const path = join(directory, entry.name);
      checkpointRetention(state, `before retained inventory entry ${path}`);
      if (entry.isSymbolicLink()) {
        noteRetentionFailure(
          state,
          `retained inventory entry ${path}`,
          new CaptureAbort(`attempt inventory contains symlink: ${path}`),
        );
      } else if (entry.isDirectory()) {
        visit(path);
      } else if (entry.isFile() && !excluded.has(resolve(path))) {
        const ref = retain(state, `retained inventory hash ${path}`, () =>
          refOf(path),
        );
        if (ref) files.push(ref);
      } else if (!entry.isFile()) {
        noteRetentionFailure(
          state,
          `retained inventory entry ${path}`,
          new CaptureAbort(
            `attempt inventory contains unsupported entry: ${path}`,
          ),
        );
      }
      checkpointRetention(state, `after retained inventory entry ${path}`);
    }
  };
  visit(attempt);
  return files;
}

async function capture(
  options: VerifyInitializedPrefixNativeOptions,
  strict: boolean,
): Promise<InitializedPrefixNativeResult> {
  const wholeStartedAt = Date.now();
  const wholeDeadline = wholeStartedAt + WHOLE_CAPTURE_DEADLINE_MS;
  const attempt = createInitializedPrefixAttempt(options);
  let capturedBinding:
    Awaited<ReturnType<typeof qualifyInitializedPrefixToolchain>> | undefined;
  const commands: PrefixRecordedCommand[] = [];
  const expected: PrefixRecipeExpectation[] = [];
  const artifacts: PrefixFileRef[] = [refOf(join(attempt, "attempt.json"))];
  const sources = new Map<string, PrefixFileRef>();
  let authoredRecipes: PrefixFileRef | undefined;
  let stage = "qualification";
  const checkDeadline = (where: string): number => {
    const remaining = wholeDeadline - Date.now();
    if (remaining <= 0)
      throw new CaptureAbort(`whole native proof deadline expired ${where}`);
    return remaining;
  };
  try {
    checkDeadline("before qualification");
    const binding = await qualifyInitializedPrefixToolchain({
      mode: options.mode,
      attemptDirectory: attempt,
    });
    checkDeadline("after qualification");
    capturedBinding = binding;
    const qualificationPath =
      process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_TOOLCHAIN_QUALIFICATION;
    if (!qualificationPath)
      throw new CaptureAbort(
        "toolchain qualification path is missing after qualification",
      );
    const qualification = refOf(qualificationPath);
    for (const recorded of Object.values(binding.versions)) {
      if (
        !recorded.record.spec.inputs.some(
          (input) =>
            input.path === qualification.path &&
            input.bytes === qualification.bytes &&
            input.sha256 === qualification.sha256,
        )
      )
        throw new CaptureAbort(
          `metadata command ${recorded.record.spec.id} omitted the frozen qualification ref`,
        );
    }
    commands.push(...Object.values(binding.versions));
    artifacts.push(binding.ref);
    checkDeadline("after qualification finalization");
    const record = async (
      spec: PrefixCommandSpec,
      expectation: PrefixRecipeExpectation,
    ) => {
      stage = spec.id;
      const remaining = checkDeadline(`before command ${spec.id}`);
      const result = await recordInitializedPrefixCommand(attempt, {
        ...spec,
        timeoutMs: Math.min(spec.timeoutMs ?? 180_000, remaining),
      });
      checkDeadline(`after command ${spec.id}`);
      commands.push(result);
      expected.push(expectation);
      const outcome = result.record.outcome;
      if (
        !result.record.guard.ok ||
        result.record.guard.reasons.length > 0 ||
        outcome.exitCode !== expectation.expectedExitCode ||
        outcome.signal !== null ||
        outcome.spawnError !== null ||
        outcome.timedOut ||
        outcome.outputLimit ||
        outcome.drainTimedOut
      )
        throw new CaptureAbort(
          `command ${spec.id} did not satisfy its transport/exit contract`,
        );
      return result;
    };
    const rustc = binding.executables.rustc;
    const cargo = binding.executables.cargo;
    if (!rustc || !cargo)
      throw new CaptureAbort("qualified toolchain lacks rustc/cargo");
    const compile = async (
      id: string,
      sourceId: string,
      source: PrefixFileRef,
      crateName: string,
      operation: PrefixCommandSpec["operation"] = "compile",
    ) => {
      const binaryPath = join(attempt, "artifacts", "binaries", `${crateName}`);
      mkdirSync(join(attempt, "artifacts", "binaries"), { recursive: true });
      const argv = [
        "--edition=2024",
        "--crate-name",
        crateName,
        "--test",
        "--error-format=json",
        source.path,
        "-o",
        binaryPath,
      ] as const;
      const result = await record(
        commandSpec(
          binding,
          qualification,
          id,
          id,
          options.mode,
          operation,
          rustc,
          argv,
          attempt,
          [source, binding.config],
        ),
        recipe({
          id,
          mode: options.mode,
          operation,
          sourceId,
          sourceSha256: source.sha256,
          expectedExitCode: 0,
        }),
      );
      if (!existsSync(binaryPath) || !statSync(binaryPath).isFile())
        throw new Error(`successful compile did not produce ${binaryPath}`);
      const binary = refOf(binaryPath);
      artifacts.push(binary);
      const output = compiledOutput(attempt, id);
      artifacts.push(output);
      return { result, binaryPath, binary, output };
    };
    const tests = async (
      id: string,
      sourceId: string,
      source: PrefixFileRef,
      binary: PrefixFileRef,
      output: PrefixFileRef,
      names: readonly string[],
      exit: number,
      intendedTest?: string,
      assertion?: ReturnType<typeof assertionFor>,
    ) => {
      const named = names.length === 1;
      const operation = named ? "tests-named" : "tests-full";
      const argv = named
        ? ["--exact", names[0], "--test-threads=1", "--nocapture"]
        : ["--test-threads=1", "--nocapture"];
      const rid = id;
      const exp = recipe({
        id: rid,
        mode: options.mode,
        operation,
        sourceId,
        sourceSha256: source.sha256,
        expectedExitCode: exit,
        testNames: names,
        ...(intendedTest && assertion
          ? { intendedTest, intendedAssertion: assertion }
          : {}),
      });
      return record(
        commandSpec(
          binding,
          qualification,
          rid,
          rid,
          options.mode,
          operation,
          binary,
          argv,
          attempt,
          [source, binding.config, output],
        ),
        exp,
      );
    };
    for (const [mechanism, body] of [
      ["element", initializedPrefixSolution],
      ["bulk", initializedPrefixEquivalent],
    ] as const) {
      const sourceText = sourceWithHarness(body);
      const source = writeInput(attempt, `solution-${mechanism}`, sourceText);
      const sourceId = rememberSource(attempt, sources, source);
      const compiled = await compile(
        `${options.mode}-positive-${mechanism}-compile`,
        sourceId,
        source,
        `initialized_prefix_${mechanism}`,
      );
      await tests(
        `${options.mode}-positive-${mechanism}-full`,
        sourceId,
        source,
        compiled.binary,
        compiled.output,
        FULL_QUALIFIED_TEST_NAMES,
        0,
      );
    }
    for (const variant of initializedPrefixSafeVariants) {
      const sourceText = sourceWithHarness(variant.source);
      const sourceId = sourceIdForVariant(variant.id);
      const source = writeInput(attempt, sourceId, sourceText);
      const actualSourceId = rememberSource(attempt, sources, source);
      const crate = `initialized_prefix_${variant.id.replace(/[^A-Za-z0-9_]/g, "_")}`;
      const compiled = await compile(
        `${options.mode}-variant-${variant.id}-compile`,
        actualSourceId,
        source,
        crate,
      );
      const assertion = assertionFor(sourceText, variant.intendedAssertion);
      const intendedTest = qualified(variant.intendedAssertion);
      await tests(
        `${options.mode}-variant-${variant.id}-full`,
        actualSourceId,
        source,
        compiled.binary,
        compiled.output,
        FULL_QUALIFIED_TEST_NAMES,
        101,
        intendedTest,
        assertion,
      );
      await tests(
        `${options.mode}-variant-${variant.id}-named`,
        actualSourceId,
        source,
        compiled.binary,
        compiled.output,
        [intendedTest],
        101,
        intendedTest,
        assertion,
      );
      const restoredId = sourceIdForVariant(variant.id, true);
      const restored = writeInput(
        attempt,
        restoredId,
        sourceWithHarness(variant.restoredSource),
      );
      const restoredSourceId = rememberSource(attempt, sources, restored);
      const restoredCompiled = await compile(
        `${options.mode}-variant-${variant.id}-restored-compile`,
        restoredSourceId,
        restored,
        `${crate}_restored`,
      );
      await tests(
        `${options.mode}-variant-${variant.id}-restored-full`,
        restoredSourceId,
        restored,
        restoredCompiled.binary,
        restoredCompiled.output,
        FULL_QUALIFIED_TEST_NAMES,
        0,
      );
      await tests(
        `${options.mode}-variant-${variant.id}-restored-named`,
        restoredSourceId,
        restored,
        restoredCompiled.binary,
        restoredCompiled.output,
        [qualified(variant.intendedAssertion)],
        0,
      );
    }
    for (const [mechanism, body] of [
      ["element", initializedPrefixSolution],
      ["bulk", initializedPrefixEquivalent],
    ] as const) {
      for (const boundary of BOUNDARIES) {
        const base = `${mechanism}-${boundary.id}`;
        for (const [kind, client, operation, exit] of [
          ["negative", boundary.negative, "client-negative", 1],
          ["corrected", boundary.corrected, "client-positive", 0],
          ["lifetime", boundary.lifetime, "client-positive", 0],
        ] as const) {
          const sourceId = `client-${base}-${kind}`;
          const source = writeInput(attempt, sourceId, `${body}\n${client}\n`);
          const actualSourceId = rememberSource(attempt, sources, source);
          const crate = crateName(
            `initialized_prefix_client_${mechanism}_${boundary.id}_${kind}`,
          );
          const binaryPath = join(attempt, "artifacts", "binaries", crate);
          mkdirSync(join(attempt, "artifacts", "binaries"), {
            recursive: true,
          });
          const compileId = `${options.mode}-client-${base}-${kind}-compile`;
          const compileRecipe = recipe({
            id: compileId,
            mode: options.mode,
            operation,
            sourceId: actualSourceId,
            sourceSha256: source.sha256,
            expectedExitCode: exit,
          });
          const compiled = await record(
            commandSpec(
              binding,
              qualification,
              compileId,
              compileId,
              options.mode,
              operation,
              rustc,
              [
                "--edition=2024",
                "--crate-name",
                crate,
                "--crate-type",
                "bin",
                "--error-format=json",
                source.path,
                "-o",
                binaryPath,
              ],
              attempt,
              [source, binding.config],
            ),
            compileRecipe,
          );
          if (exit === 0) {
            const binary = refOf(binaryPath);
            artifacts.push(binary);
            const output = compiledOutput(attempt, compileId);
            artifacts.push(output);
            const runId = `${options.mode}-client-${base}-${kind}-run`;
            await record(
              commandSpec(
                binding,
                qualification,
                runId,
                runId,
                options.mode,
                "client-positive",
                binary,
                [],
                attempt,
                [source, binding.config, output],
              ),
              recipe({
                id: runId,
                mode: options.mode,
                operation: "client-positive",
                sourceId: actualSourceId,
                sourceSha256: source.sha256,
                expectedExitCode: 0,
              }),
            );
          }
          void compiled;
        }
      }
    }
    if (options.mode === "miri") {
      for (const [mechanism, body] of [
        ["element", initializedPrefixSolution],
        ["bulk", initializedPrefixEquivalent],
      ] as const) {
        const sourceId = `miri-positive-${mechanism}`;
        const source = writeInput(attempt, sourceId, sourceWithHarness(body));
        rememberSource(attempt, sources, source);
        const project = join(attempt, "artifacts", "miri", mechanism);
        mkdirSync(join(project, "src"), { recursive: true });
        const manifestPath = join(project, "Cargo.toml");
        const lockPath = join(project, "Cargo.lock");
        writeFileSync(
          manifestPath,
          `[package]\nname = "initialized_prefix_${mechanism}"\nversion = "0.0.0"\nedition = "2024"\n`,
          { flag: "wx" },
        );
        writeFileSync(
          lockPath,
          `version = 4\n\n[[package]]\nname = "initialized_prefix_${mechanism}"\nversion = "0.0.0"\n`,
          { flag: "wx" },
        );
        const manifest = refOf(manifestPath);
        const lock = refOf(lockPath);
        rememberSource(attempt, sources, manifest);
        rememberSource(attempt, sources, lock);
        writeFileSync(
          join(project, "src", "lib.rs"),
          readFileSync(source.path),
          { flag: "wx" },
        );
        const lib = refOf(join(project, "src", "lib.rs"));
        const libSourceId = rememberSource(attempt, sources, lib);
        const id = `${options.mode}-${sourceId}`;
        await record(
          commandSpec(
            binding,
            qualification,
            id,
            id,
            options.mode,
            "miri-positive",
            cargo,
            [
              "miri",
              "test",
              "--manifest-path",
              manifest.path,
              "--offline",
              "--locked",
              "--lib",
              "--",
              "--test-threads=1",
            ],
            attempt,
            [manifest, lock, lib, binding.config],
          ),
          fullExpectation(
            id,
            options.mode,
            libSourceId,
            lib,
            "miri-positive",
            0,
          ),
        );
      }
      for (const [id, sourceText, operation, exit] of [
        ["skipped-write-ub", UB_SOURCE, "miri-ub", 1],
        ["skipped-write-twin", SOUND_SOURCE, "miri-sound", 0],
      ] as const) {
        const sourceId = `miri-${id}`;
        const source = writeInput(attempt, sourceId, sourceText);
        rememberSource(attempt, sources, source);
        const project = join(attempt, "artifacts", "miri", id);
        mkdirSync(join(project, "src"), { recursive: true });
        const manifestPath = join(project, "Cargo.toml");
        const lockPath = join(project, "Cargo.lock");
        writeFileSync(
          manifestPath,
          `[package]\nname = "initialized_prefix_${id.replace(/-/g, "_")}"\nversion = "0.0.0"\nedition = "2024"\n`,
          { flag: "wx" },
        );
        writeFileSync(
          lockPath,
          `version = 4\n\n[[package]]\nname = "initialized_prefix_${id.replace(/-/g, "_")}"\nversion = "0.0.0"\n`,
          { flag: "wx" },
        );
        const manifest = refOf(manifestPath);
        const lock = refOf(lockPath);
        rememberSource(attempt, sources, manifest);
        rememberSource(attempt, sources, lock);
        writeFileSync(
          join(project, "src", "main.rs"),
          readFileSync(source.path),
          { flag: "wx" },
        );
        const main = refOf(join(project, "src", "main.rs"));
        const mainSourceId = rememberSource(attempt, sources, main);
        const recipeId = `${options.mode}-${sourceId}`;
        const miri: PrefixRecipeExpectation["miri"] | undefined =
          operation === "miri-ub"
            ? (() => {
                const expression = "view[0]";
                const offset = sourceText.indexOf(expression);
                const before = sourceText.slice(0, offset);
                return {
                  category: "uninitialized-read",
                  sourceId: mainSourceId,
                  sourceSha256: main.sha256,
                  expression,
                  line: before.split("\n").length,
                  column: offset - before.lastIndexOf("\n"),
                  byteStart: Buffer.byteLength(before),
                  byteEnd: Buffer.byteLength(before + expression),
                };
              })()
            : undefined;
        await record(
          commandSpec(
            binding,
            qualification,
            recipeId,
            recipeId,
            options.mode,
            operation,
            cargo,
            [
              "miri",
              "run",
              "--manifest-path",
              manifest.path,
              "--offline",
              "--locked",
            ],
            attempt,
            [manifest, lock, main, binding.config],
          ),
          recipe({
            id: recipeId,
            mode: options.mode,
            operation,
            sourceId: mainSourceId,
            sourceSha256: main.sha256,
            expectedExitCode: exit,
            ...(miri ? { miri } : {}),
          }),
        );
      }
    }
    authoredRecipes = writeAuthoredRecipeInventory(
      attempt,
      options.mode,
      sourceBindings(sources),
      expected,
    );
    checkDeadline("after authored recipe finalization");
    checkDeadline("before strict observation load");
    const observed = strict
      ? loadInitializedPrefixObservedExpectations(options.mode)
      : undefined;
    checkDeadline("after strict observation load");
    const manifestPath = join(attempt, "proof-manifest.json");
    checkDeadline("before final inventory");
    const manifestArtifacts = inventoryAttempt(
      attempt,
      new Set([resolve(manifestPath)]),
      checkDeadline,
    );
    checkDeadline("after final inventory");
    const manifest: PrefixProofManifest = {
      schema: "initialized-prefix-proof-v1",
      mode: options.mode,
      phase: strict && observed ? "strict" : "capture",
      attemptDirectory: attempt,
      sourceBindings: sourceBindings(sources),
      toolchain: binding,
      expectedRecipes: expected.map((item) => item.id),
      commands,
      artifacts: manifestArtifacts,
    };
    checkDeadline("before proof manifest finalization");
    writeManifest(manifestPath, manifest);
    checkDeadline("after proof manifest finalization");
    if (!strict || !observed) {
      checkDeadline("before capture result finalization");
      return {
        ok: false,
        mode: options.mode,
        phase: "capture",
        attemptDirectory: attempt,
        manifestPath,
        expectedRecipes: manifest.expectedRecipes,
        reasons: [
          {
            code: "observations-not-adjudicated",
            message:
              "Root-reviewed observed compiler/Miri expectations are not available; capture remains raw-only.",
            path: manifestPath,
          },
        ],
      };
    }
    checkDeadline("before strict verification");
    const result = verifyInitializedPrefixEvidence(manifestPath, observed);
    checkDeadline("after strict verification");
    if (result.ok) {
      checkDeadline("before tamper-control finalization");
      const controls = verifyInitializedPrefixTamperControls({
        manifestPath,
        expected: observed,
        evidenceDirectory: attempt,
        checkpoint: ({ controlID, phase }) =>
          checkDeadline(`${phase} tamper control ${controlID}`),
      });
      checkDeadline("after tamper-control finalization");
      const requiredControlIds =
        options.mode === "miri" ? MIRI_CONTROL_IDS : STABLE_CONTROL_IDS;
      const requiredControlSet = new Set<string>(requiredControlIds);
      const controlsById = new Map(
        controls.map((control) => [control.id, control]),
      );
      const duplicateControlIds = controls
        .map((control) => control.id)
        .filter((id, index, all) => all.indexOf(id) !== index);
      const unexpectedControlIds = controls
        .map((control) => control.id)
        .filter((id) => !requiredControlSet.has(id));
      const controlFailure = [
        ...(controls.length !== requiredControlIds.length
          ? [
              {
                code: "tamper-control-inventory",
                message:
                  "Tamper control inventory does not contain exactly the applicable controls.",
                path: manifestPath,
              },
            ]
          : []),
        ...(duplicateControlIds.length > 0
          ? [
              {
                code: "tamper-control-duplicate",
                message: `Tamper control inventory contains duplicate IDs: ${[...new Set(duplicateControlIds)].join(", ")}.`,
                path: manifestPath,
              },
            ]
          : []),
        ...(unexpectedControlIds.length > 0
          ? [
              {
                code: "tamper-control-unexpected",
                message: `Tamper control inventory contains non-applicable IDs: ${[...new Set(unexpectedControlIds)].join(", ")}.`,
                path: manifestPath,
              },
            ]
          : []),
        ...requiredControlIds.flatMap((id) => {
          const control = controlsById.get(id);
          if (!control)
            return [
              {
                code: "tamper-control-missing",
                message: `Required tamper control ${id} was not recorded.`,
                path: manifestPath,
              },
            ];
          if (id === "baseline-valid") {
            return control.rejected || control.reasons.length > 0
              ? [
                  {
                    code: "tamper-baseline-invalid",
                    message:
                      "The verified baseline control did not remain a valid non-mutated baseline.",
                    path: manifestPath,
                  },
                ]
              : [];
          }
          return isInitializedPrefixControlAccepted(control)
            ? []
            : [
                {
                  code: "tamper-control-failed",
                  message: `Tamper control ${id} did not produce a reason-specific rejection.`,
                  path: manifestPath,
                },
              ];
        }),
      ];
      checkDeadline("after tamper-control inventory finalization");
      if (controlFailure.length > 0) {
        return {
          ok: false,
          mode: options.mode,
          phase: "strict",
          attemptDirectory: attempt,
          manifestPath,
          expectedRecipes: manifest.expectedRecipes,
          reasons: controlFailure,
        };
      }
    }
    checkDeadline("before strict result finalization");
    return {
      ...result,
      mode: options.mode,
      phase: "strict",
      attemptDirectory: attempt,
      manifestPath,
      expectedRecipes: manifest.expectedRecipes,
    };
  } catch (error) {
    const retentionState: RetentionState = {
      startedAtMs: wholeStartedAt,
      deadlineAtMs: wholeDeadline,
      checkpoints: [],
      failures: [],
    };
    noteRetentionFailure(retentionState, "capture", error);
    const partialManifestPath = join(attempt, "partial-proof-manifest.json");
    const failure = retain(retentionState, "writeCaptureFailure", () =>
      writeCaptureFailure(
        attempt,
        options.mode,
        stage,
        error,
        partialManifestPath,
      ),
    );
    const retainedAuthoredRecipes =
      authoredRecipes ??
      retain(retentionState, "authored recipe inventory", () =>
        writeAuthoredRecipeInventory(
          attempt,
          options.mode,
          sourceBindings(sources),
          expected,
        ),
      );
    const originalManifestPath = join(attempt, "proof-manifest.json");
    const originalManifest = retain(
      retentionState,
      "original manifest hash",
      () =>
        existsSync(originalManifestPath)
          ? refOf(originalManifestPath)
          : undefined,
    );
    const retainedArtifacts = inventoryAttemptForRetention(
      attempt,
      new Set([resolve(partialManifestPath)]),
      retentionState,
    );
    const partialValue = {
      schema: "initialized-prefix-partial-manifest-v1" as const,
      status: "incomplete",
      mode: options.mode,
      phase: "capture-failure",
      attemptDirectory: attempt,
      stage,
      partialManifestPath,
      ...(failure ? { captureFailure: failure } : {}),
      ...(retainedAuthoredRecipes
        ? { authoredRecipes: retainedAuthoredRecipes }
        : {}),
      ...(originalManifest ? { originalManifest } : {}),
      artifacts: retainedArtifacts,
      failures: retentionState.failures,
      retention: retentionSnapshot(retentionState),
      sourceBindings: sourceBindings(sources),
      expectedRecipes: expected.map((item) => item.id),
      commands,
      ...(capturedBinding ? { toolchain: capturedBinding } : {}),
    };
    checkpointRetention(retentionState, "before partial manifest finalization");
    const partial = retain(
      retentionState,
      "partial manifest finalization",
      () => writePartialManifest(partialManifestPath, partialValue),
    );
    checkpointRetention(retentionState, "after partial manifest finalization");
    const incompleteEvidencePath = join(
      attempt,
      "artifacts",
      "incomplete-evidence.json",
    );
    const incompleteValue: IncompleteEvidence = {
      schema: "initialized-prefix-incomplete-evidence-v1",
      status: "incomplete",
      mode: options.mode,
      stage,
      attemptDirectory: attempt,
      partialManifestPath,
      ...(failure ? { captureFailure: failure } : {}),
      ...(retainedAuthoredRecipes
        ? { authoredRecipes: retainedAuthoredRecipes }
        : {}),
      ...(originalManifest ? { originalManifest } : {}),
      ...(partial ? { partialManifest: partial } : {}),
      retainedArtifacts: partial
        ? [...retainedArtifacts, partial]
        : retainedArtifacts,
      failures: retentionState.failures,
      retention: retentionSnapshot(retentionState),
    };
    const incompleteEvidence = retain(
      retentionState,
      "incomplete evidence finalization",
      () => {
        mkdirSync(join(attempt, "artifacts"), { recursive: true });
        writeFileSync(
          incompleteEvidencePath,
          `${JSON.stringify(incompleteValue, null, 2)}\n`,
          { flag: "wx" },
        );
        return refOf(incompleteEvidencePath);
      },
    );
    checkpointRetention(
      retentionState,
      "after incomplete evidence finalization",
    );
    const finalFailureIndexPath = join(attempt, "final-failure-index.json");
    const finalArtifacts = inventoryAttemptForRetention(
      attempt,
      new Set([resolve(finalFailureIndexPath)]),
      retentionState,
    );
    checkpointRetention(retentionState, "after post-write retained inventory");
    checkpointRetention(retentionState, "before final failure-index write");
    const finalFailureIndex: FinalFailureIndex = {
      schema: "initialized-prefix-final-failure-index-v1",
      status: "incomplete",
      mode: options.mode,
      stage,
      attemptDirectory: attempt,
      ...(failure ? { captureFailure: failure } : {}),
      ...(retainedAuthoredRecipes
        ? { authoredRecipes: retainedAuthoredRecipes }
        : {}),
      ...(originalManifest ? { originalManifest } : {}),
      ...(partial ? { partialManifest: partial } : {}),
      ...(incompleteEvidence ? { incompleteEvidence } : {}),
      retainedArtifacts: finalArtifacts,
      failures: retentionState.failures,
      retention: retentionSnapshot(retentionState),
      terminalArtifact: {
        path: finalFailureIndexPath,
        selfExcludedFromInventory: true,
        writeBoundary: "final failure-index write",
        postWriteTimingRecorded: false,
      },
    };
    const finalIndex = retain(
      retentionState,
      "final failure-index write",
      () => {
        writeFileSync(
          finalFailureIndexPath,
          `${JSON.stringify(finalFailureIndex, null, 2)}\n`,
          { flag: "wx" },
        );
        return refOf(finalFailureIndexPath);
      },
    );
    const finalManifestPath =
      finalIndex?.path ??
      partial?.path ??
      incompleteEvidence?.path ??
      partialManifestPath;
    return {
      ok: false,
      mode: options.mode,
      phase: "capture",
      attemptDirectory: attempt,
      manifestPath: finalManifestPath,
      expectedRecipes: expected.map((item) => item.id),
      reasons: [
        {
          code: capturedBinding
            ? "capture-aborted"
            : "toolchain-qualification-failed",
          message: errorMessage(error),
          path: finalManifestPath,
        },
      ],
    };
  }
}

export async function captureInitializedPrefixObservations(
  options: VerifyInitializedPrefixNativeOptions,
) {
  return capture(options, false);
}
export async function verifyInitializedPrefixNative(
  options: VerifyInitializedPrefixNativeOptions,
) {
  return capture(options, true);
}
