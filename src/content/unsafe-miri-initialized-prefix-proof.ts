import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import { readInitializedPrefixObservedExpectations } from "./unsafe-miri-initialized-prefix-observations";

export type PrefixMode = "stable" | "msrv" | "miri";
export type PrefixOperation =
  | "tool-locate"
  | "tool-version"
  | "compile"
  | "tests-full"
  | "tests-named"
  | "client-negative"
  | "client-positive"
  | "miri-positive"
  | "miri-ub"
  | "miri-sound";
export interface PrefixFileRef {
  path: string;
  bytes: number;
  sha256: string;
}
export interface PrefixOutcome {
  exitCode: number | null;
  signal: string | null;
  spawnError: string | null;
  timedOut: boolean;
  outputLimit: boolean;
  drainTimedOut: boolean;
}
export interface PrefixArchivedInput {
  input: PrefixFileRef;
  archive: PrefixFileRef;
}
export interface PrefixCommandSpec {
  id: string;
  recipeId: string;
  mode: PrefixMode;
  operation: PrefixOperation;
  executable: PrefixFileRef;
  argv: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  inputs: readonly PrefixFileRef[];
  externalInputs: readonly PrefixFileRef[];
  toolchainBinding?: PrefixFileRef;
  timeoutMs?: number;
  maxBytesPerStream?: number;
}
export interface PrefixCommandRecord {
  schema: "initialized-prefix-command-v1";
  spec: PrefixCommandSpec;
  startedAt: string;
  finishedAt: string;
  outcome: PrefixOutcome;
  stdout: PrefixFileRef;
  stderr: PrefixFileRef;
  before: readonly PrefixArchivedInput[];
  after: readonly PrefixArchivedInput[];
  guard: { ok: boolean; reasons: readonly string[] };
}
export interface PrefixRecordedCommand {
  record: PrefixCommandRecord;
  ref: PrefixFileRef;
}
export interface PrefixToolchainBinding {
  mode: PrefixMode;
  name: string;
  rustupHome: string;
  executables: Readonly<Record<string, PrefixFileRef>>;
  versions: Readonly<Record<string, PrefixRecordedCommand>>;
  env: Readonly<Record<string, string>>;
  config: PrefixFileRef;
  sysroot?: {
    root: string;
    manifest: PrefixFileRef;
    files: readonly PrefixFileRef[];
  };
  ref: PrefixFileRef;
}
export interface PrefixRecipeExpectation {
  id: string;
  mode: PrefixMode;
  operation: PrefixOperation;
  sourceId: string;
  sourceSha256: string;
  expectedExitCode: number;
  testNames?: readonly string[];
  intendedTest?: string;
  intendedAssertion?: {
    expression: string;
    message: string;
    byteStart: number;
    byteEnd: number;
  };
  diagnostic?: {
    errors: readonly PrefixDiagnosticExpectation[];
    allowedSummaries: readonly string[];
  };
  miri?: {
    category: "uninitialized-read";
    sourceId: string;
    sourceSha256: string;
    expression: string;
    line: number;
    column: number;
    byteStart: number;
    byteEnd: number;
  };
}
export interface PrefixDiagnosticExpectation {
  code: string;
  primary: readonly {
    sourceId: string;
    sourceSha256: string;
    byteStart: number;
    byteEnd: number;
    expression: string;
    line: number;
    columnStart: number;
    columnEnd: number;
  }[];
}
export interface PrefixObservedExpectations {
  schema: "initialized-prefix-observations-v1";
  adjudication: {
    status: "root-reviewed";
    provenance: readonly PrefixFileRef[];
  };
  sourceBindings: Readonly<Record<string, string>>;
  toolchainKinds: Readonly<
    Record<
      PrefixMode,
      {
        name: string;
        release: string;
        channel: string;
        distributionDate?: string;
      }
    >
  >;
  recipes: readonly PrefixRecipeExpectation[];
}
export interface PrefixProofManifest {
  schema: "initialized-prefix-proof-v1";
  mode: PrefixMode;
  phase: "capture" | "strict";
  attemptDirectory: string;
  sourceBindings: Readonly<Record<string, string>>;
  toolchain: PrefixToolchainBinding;
  expectedRecipes: readonly string[];
  commands: readonly PrefixRecordedCommand[];
  artifacts: readonly PrefixFileRef[];
}
export interface PrefixVerificationResult {
  ok: boolean;
  reasons: readonly { code: string; message: string; path?: string }[];
}

type VerificationReason = PrefixVerificationResult["reasons"][number];
type MutableReasons = VerificationReason[];

const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();

function reason(
  code: string,
  message: string,
  path?: string,
): VerificationReason {
  return path === undefined ? { code, message } : { code, message, path };
}

function failure(...reasons: VerificationReason[]): PrefixVerificationResult {
  return { ok: false, reasons };
}

function success(): PrefixVerificationResult {
  return { ok: true, reasons: [] };
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function hashFileRef(
  bytes: Uint8Array,
  ref: PrefixFileRef,
  pathForReason: string,
): PrefixVerificationResult {
  const reasons: MutableReasons = [];
  if (!Number.isInteger(ref.bytes) || ref.bytes !== bytes.byteLength) {
    reasons.push(
      reason(
        "file-size-mismatch",
        `Expected ${ref.bytes} bytes, got ${bytes.byteLength}.`,
        pathForReason,
      ),
    );
  }
  if (typeof ref.sha256 !== "string" || hashBytes(bytes) !== ref.sha256) {
    reasons.push(
      reason(
        "file-hash-mismatch",
        "The recorded SHA-256 does not match the file.",
        pathForReason,
      ),
    );
  }
  return reasons.length === 0 ? success() : failure(...reasons);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileRef(value: unknown): value is PrefixFileRef {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    value.path.length > 0 &&
    isInteger(value.bytes) &&
    value.bytes >= 0 &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/i.test(value.sha256)
  );
}

function isPrefixMode(value: unknown): value is PrefixMode {
  return value === "stable" || value === "msrv" || value === "miri";
}

function isPrefixOperation(value: unknown): value is PrefixOperation {
  return (
    value === "tool-locate" ||
    value === "tool-version" ||
    value === "compile" ||
    value === "tests-full" ||
    value === "tests-named" ||
    value === "client-negative" ||
    value === "client-positive" ||
    value === "miri-positive" ||
    value === "miri-ub" ||
    value === "miri-sound"
  );
}

function isRelativeSourceId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").some((part) => part === ".." || part.length === 0)
  );
}

function isDiagnosticSpan(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.sourceId === "string" &&
    isRelativeSourceId(value.sourceId) &&
    typeof value.sourceSha256 === "string" &&
    /^[0-9a-f]{64}$/i.test(value.sourceSha256) &&
    isInteger(value.byteStart) &&
    isInteger(value.byteEnd) &&
    value.byteStart >= 0 &&
    value.byteEnd >= value.byteStart &&
    typeof value.expression === "string" &&
    isInteger(value.line) &&
    value.line > 0 &&
    isInteger(value.columnStart) &&
    value.columnStart > 0 &&
    isInteger(value.columnEnd) &&
    value.columnEnd >= value.columnStart
  );
}

function isDiagnosticExpectation(
  value: unknown,
): value is PrefixDiagnosticExpectation {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    value.code.length > 0 &&
    Array.isArray(value.primary) &&
    value.primary.length > 0 &&
    value.primary.every(isDiagnosticSpan)
  );
}

function isRecipeExpectation(value: unknown): value is PrefixRecipeExpectation {
  if (
    isRecord(value) &&
    typeof value.id === "string" &&
    isPrefixMode(value.mode) &&
    isPrefixOperation(value.operation) &&
    isRelativeSourceId(value.sourceId) &&
    typeof value.sourceSha256 === "string" &&
    /^[0-9a-f]{64}$/i.test(value.sourceSha256) &&
    Number.isInteger(value.expectedExitCode)
  ) {
    if (
      value.testNames !== undefined &&
      (!Array.isArray(value.testNames) ||
        !value.testNames.every(
          (name) => typeof name === "string" && name.length > 0,
        ) ||
        new Set(value.testNames).size !== value.testNames.length)
    )
      return false;
    if (
      value.intendedTest !== undefined &&
      (typeof value.intendedTest !== "string" ||
        value.intendedTest.length === 0)
    )
      return false;
    if (value.intendedAssertion !== undefined) {
      const assertion = value.intendedAssertion;
      if (
        !isRecord(assertion) ||
        typeof assertion.expression !== "string" ||
        assertion.expression.length === 0 ||
        typeof assertion.message !== "string" ||
        assertion.message.length === 0 ||
        !isInteger(assertion.byteStart) ||
        !isInteger(assertion.byteEnd) ||
        assertion.byteStart < 0 ||
        assertion.byteEnd < assertion.byteStart
      )
        return false;
    }
    if (value.diagnostic !== undefined) {
      const diagnostic = value.diagnostic;
      if (
        !isRecord(diagnostic) ||
        !Array.isArray(diagnostic.errors) ||
        !diagnostic.errors.every(isDiagnosticExpectation) ||
        !Array.isArray(diagnostic.allowedSummaries) ||
        !diagnostic.allowedSummaries.every(
          (summary) => typeof summary === "string" && summary.length > 0,
        )
      )
        return false;
    }
    if (value.miri !== undefined) {
      const miri = value.miri;
      if (
        !isRecord(miri) ||
        miri.category !== "uninitialized-read" ||
        !isRelativeSourceId(miri.sourceId) ||
        typeof miri.sourceSha256 !== "string" ||
        !/^[0-9a-f]{64}$/i.test(miri.sourceSha256) ||
        typeof miri.expression !== "string" ||
        miri.expression.length === 0 ||
        !isInteger(miri.line) ||
        miri.line <= 0 ||
        !isInteger(miri.column) ||
        miri.column <= 0 ||
        !isInteger(miri.byteStart) ||
        !isInteger(miri.byteEnd) ||
        miri.byteStart < 0 ||
        miri.byteEnd < miri.byteStart
      )
        return false;
    }
    return true;
  }
  return false;
}

function isObservedExpectations(
  value: unknown,
): value is PrefixObservedExpectations {
  if (
    !isRecord(value) ||
    value.schema !== "initialized-prefix-observations-v1" ||
    !isRecord(value.adjudication) ||
    value.adjudication.status !== "root-reviewed" ||
    !Array.isArray(value.adjudication.provenance) ||
    value.adjudication.provenance.length === 0 ||
    !value.adjudication.provenance.every(isFileRef) ||
    !isRecord(value.sourceBindings) ||
    !Object.values(value.sourceBindings).every(
      (hash) => typeof hash === "string" && /^[0-9a-f]{64}$/i.test(hash),
    ) ||
    !isRecord(value.toolchainKinds) ||
    !Array.isArray(value.recipes) ||
    !value.recipes.every(isRecipeExpectation)
  )
    return false;
  for (const mode of ["stable", "msrv", "miri"] as const) {
    const kind = value.toolchainKinds[mode];
    if (
      !isRecord(kind) ||
      typeof kind.name !== "string" ||
      kind.name.length === 0 ||
      typeof kind.release !== "string" ||
      kind.release.length === 0 ||
      typeof kind.channel !== "string" ||
      kind.channel.length === 0 ||
      (kind.distributionDate !== undefined &&
        typeof kind.distributionDate !== "string")
    )
      return false;
  }
  return true;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function bytesAtRange(
  bytes: Uint8Array,
  start: number,
  end: number,
): string | undefined {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start > end ||
    end > bytes.length
  ) {
    return undefined;
  }
  if (start > 0 && (bytes[start] & 0xc0) === 0x80) return undefined;
  if (end < bytes.length && (bytes[end] & 0xc0) === 0x80) return undefined;
  try {
    return decoder.decode(bytes.slice(start, end));
  } catch {
    return undefined;
  }
}

function sourceLineColumn(
  bytes: Uint8Array,
  offset: number,
): { line: number; column: number } | undefined {
  if (!Number.isInteger(offset) || offset < 0 || offset > bytes.length)
    return undefined;
  const before = bytes.slice(0, offset);
  let line = 1;
  let lineStart = 0;
  for (let index = 0; index < before.length; index += 1) {
    if (before[index] === 0x0a) {
      line += 1;
      lineStart = index + 1;
    }
  }
  const linePrefix = bytes.slice(lineStart, offset);
  try {
    return { line, column: Array.from(decoder.decode(linePrefix)).length + 1 };
  } catch {
    return undefined;
  }
}

function relativeSourceIdentity(
  attemptDirectory: string,
  refPath: string,
): string | undefined {
  const attempt = realpathSync(resolve(attemptDirectory));
  const absolute = resolve(refPath);
  const canonical = realpathSync(absolute);
  const within = canonical === attempt || canonical.startsWith(`${attempt}/`);
  if (!within) return undefined;
  const identity = relative(attempt, canonical).split("\\").join("/");
  if (
    !identity ||
    identity === "." ||
    identity === ".." ||
    identity.startsWith("../") ||
    identity.includes("/../") ||
    identity.endsWith("/..")
  )
    return undefined;
  return identity;
}

function isCanonicalAbsolutePath(path: string): boolean {
  if (!isAbsolute(path)) return false;
  try {
    return realpathSync(path) === normalize(path);
  } catch {
    return false;
  }
}

function expectedSource(
  sourceFiles: Readonly<Record<string, { path: string; bytes: Uint8Array }>>,
  sourceId: string,
  sourceSha256: string,
): { path: string; bytes: Uint8Array } | undefined {
  const source = sourceFiles[sourceId];
  if (!source) return undefined;
  if (!sourceSha256 || hashBytes(source.bytes) !== sourceSha256)
    return undefined;
  return source;
}

function checkOutcome(
  outcome: PrefixOutcome,
  expectedExitCode: number,
): MutableReasons {
  const reasons: MutableReasons = [];
  if (outcome.exitCode !== expectedExitCode)
    reasons.push(
      reason("exit-code-mismatch", `Expected exit code ${expectedExitCode}.`),
    );
  if (outcome.signal !== null)
    reasons.push(
      reason(
        "unexpected-signal",
        "A signalled process is not semantic evidence.",
      ),
    );
  if (outcome.spawnError !== null)
    reasons.push(
      reason("spawn-error", "The command did not start successfully."),
    );
  if (outcome.timedOut)
    reasons.push(
      reason("timeout", "Timed out command output cannot prove the recipe."),
    );
  if (outcome.outputLimit)
    reasons.push(
      reason("output-limit", "Truncated output cannot prove the recipe."),
    );
  if (outcome.drainTimedOut)
    reasons.push(
      reason(
        "drain-timeout",
        "An incomplete pipe drain cannot prove the recipe.",
      ),
    );
  return reasons;
}

interface ActualPrimary {
  sourcePath: string;
  byteStart: number;
  byteEnd: number;
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  expression: string;
}

interface ActualDiagnostic {
  code: string;
  message: string;
  primary: ActualPrimary[];
}

function parseCompilerOutput(
  stdout: Uint8Array,
  stderr: Uint8Array,
  allowedSummaries: readonly string[],
  expectedErrors: readonly PrefixDiagnosticExpectation[] = [],
): {
  diagnostics: ActualDiagnostic[];
  reasons: MutableReasons;
} {
  const diagnostics: ActualDiagnostic[] = [];
  const reasons: MutableReasons = [];
  const validSummaries = allowedSummaries.filter((summary) =>
    /^error: aborting due to [1-9][0-9]* previous errors?$/.test(
      summary.startsWith("error:") ? summary : `error: ${summary}`,
    ),
  );
  const summarySet = new Set(
    validSummaries.map((summary) =>
      summary.startsWith("error:") ? summary : `error: ${summary}`,
    ),
  );
  const expectedCodes = new Set(expectedErrors.map((entry) => entry.code));
  // The abort summary counts diagnostic error records. A single error may
  // retain repeated primary spans, so it must not be counted by spans.
  const expectedErrorCount = expectedErrors.length;
  const acceptedFailureNotes = new Set<string>();
  if (expectedCodes.size > 1) {
    const codes = [...expectedCodes].sort();
    acceptedFailureNotes.add(
      `Some errors have detailed explanations: ${codes.join(", ")}.`,
    );
    acceptedFailureNotes.add(
      `For more information about an error, try \`rustc --explain ${codes[0]}\`.`,
    );
  } else if (expectedCodes.size === 1) {
    const code = [...expectedCodes][0];
    acceptedFailureNotes.add(
      `For more information about this error, try \`rustc --explain ${code}\`.`,
    );
  }
  if (
    allowedSummaries.some((summary) => {
      const normalized = summary.startsWith("error:")
        ? summary
        : `error: ${summary}`;
      return !summarySet.has(normalized) && !acceptedFailureNotes.has(summary);
    })
  )
    reasons.push(
      reason(
        "invalid-summary-whitelist",
        "The diagnostic summary whitelist contains an unapproved summary.",
      ),
    );
  const isAllowedSummary = (value: string): boolean => {
    const normalized = value.startsWith("error:") ? value : `error: ${value}`;
    if (summarySet.has(normalized)) {
      const match =
        /^error: aborting due to ([1-9][0-9]*) previous errors?$/.exec(
          normalized,
        );
      return !match || Number(match[1]) === expectedErrorCount;
    }
    return acceptedFailureNotes.has(value);
  };
  for (const bytes of [stdout, stderr]) {
    let text: string;
    try {
      text = decoder.decode(bytes);
    } catch {
      reasons.push(
        reason("invalid-utf8-output", "Compiler output is not valid UTF-8."),
      );
      continue;
    }
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "").trim();
      if (!line) continue;
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        if (!isAllowedSummary(line))
          reasons.push(
            reason(
              "unexpected-collateral",
              `Unapproved compiler output: ${line}`,
            ),
          );
        continue;
      }
      if (!isRecord(value) || typeof value.message !== "string") {
        reasons.push(
          reason(
            "unexpected-json",
            "A non-diagnostic JSON record appeared in compiler output.",
          ),
        );
        continue;
      }
      const allowedDiagnosticKeys = new Set([
        "$message_type",
        "message",
        "code",
        "level",
        "spans",
        "children",
        "rendered",
      ]);
      if (
        [...Object.keys(value)].some(
          (key) => !allowedDiagnosticKeys.has(key),
        ) ||
        (value.$message_type !== undefined &&
          value.$message_type !== "diagnostic") ||
        (value.children !== undefined && !Array.isArray(value.children)) ||
        (value.rendered !== undefined && typeof value.rendered !== "string")
      ) {
        reasons.push(
          reason(
            "unexpected-json",
            "A compiler diagnostic record has an unrecognized shape.",
          ),
        );
        continue;
      }
      if (
        value.level === "error" &&
        Array.isArray(value.spans) &&
        value.spans.length === 0 &&
        isAllowedSummary(`error: ${value.message}`) &&
        (value.code === undefined || value.code === null)
      )
        continue;
      if (
        value.level === "failure-note" &&
        Array.isArray(value.spans) &&
        value.spans.length === 0 &&
        (value.code === undefined || value.code === null) &&
        acceptedFailureNotes.has(value.message)
      )
        continue;
      if (value.level === "failure-note") {
        reasons.push(
          reason(
            "unexpected-json",
            "A compiler failure note was not selected by the reviewed error code set.",
          ),
        );
        continue;
      }
      if (value.level !== "error" || !Array.isArray(value.spans)) {
        reasons.push(
          reason(
            "unexpected-json",
            "A non-diagnostic JSON record appeared in compiler output.",
          ),
        );
        continue;
      }
      const code =
        isRecord(value.code) && typeof value.code.code === "string"
          ? value.code.code
          : "";
      const primary: ActualPrimary[] = [];
      for (const span of value.spans) {
        if (!isRecord(span) || span.is_primary !== true) continue;
        if (
          typeof span.file_name !== "string" ||
          !isInteger(span.byte_start) ||
          !isInteger(span.byte_end) ||
          !isInteger(span.line_start) ||
          !isInteger(span.line_end) ||
          !isInteger(span.column_start) ||
          !isInteger(span.column_end)
        ) {
          reasons.push(
            reason(
              "malformed-primary-span",
              "A primary diagnostic span is incomplete.",
            ),
          );
          continue;
        }
        const textParts = Array.isArray(span.text)
          ? span.text
              .filter(
                (entry): entry is Record<string, unknown> =>
                  isRecord(entry) && typeof entry.text === "string",
              )
              .map((entry) => String(entry.text))
          : [];
        primary.push({
          sourcePath: span.file_name,
          byteStart: span.byte_start,
          byteEnd: span.byte_end,
          lineStart: span.line_start,
          lineEnd: span.line_end,
          columnStart: span.column_start,
          columnEnd: span.column_end,
          expression: textParts.join("\n"),
        });
      }
      if (primary.length === 0) {
        reasons.push(
          reason(
            "unexpected-json",
            "A compiler error record without a primary span is not a selected summary.",
          ),
        );
        continue;
      }
      diagnostics.push({ code, message: value.message, primary });
    }
  }
  if (expectedErrors.length > 0 && diagnostics.length < expectedErrors.length)
    reasons.push(
      reason(
        "diagnostic-multiplicity",
        "Reviewed diagnostics must retain at least one primary span per error.",
      ),
    );
  return { diagnostics, reasons };
}

function validatePrimary(
  actual: ActualPrimary,
  expected: PrefixDiagnosticExpectation["primary"][number],
  sourceFiles: Readonly<Record<string, { path: string; bytes: Uint8Array }>>,
): MutableReasons {
  const reasons: MutableReasons = [];
  const source = expectedSource(
    sourceFiles,
    expected.sourceId,
    expected.sourceSha256,
  );
  if (!source || source.path !== actual.sourcePath) {
    reasons.push(
      reason(
        "diagnostic-source-mismatch",
        "The primary span is bound to a different source file.",
      ),
    );
    return reasons;
  }
  const slice = bytesAtRange(source.bytes, actual.byteStart, actual.byteEnd);
  if (slice === undefined)
    reasons.push(
      reason(
        "diagnostic-byte-range",
        "The primary span is not a valid UTF-8 source range.",
      ),
    );
  if (
    actual.byteStart !== expected.byteStart ||
    actual.byteEnd !== expected.byteEnd
  ) {
    reasons.push(
      reason(
        "diagnostic-primary-mismatch",
        "The compiler highlighted a different byte range.",
      ),
    );
  }
  if (slice !== undefined && !slice.includes(expected.expression)) {
    reasons.push(
      reason(
        "diagnostic-expression-mismatch",
        "The expected authored expression is not contained in the highlighted range.",
      ),
    );
  }
  const start = sourceLineColumn(source.bytes, actual.byteStart);
  const end = sourceLineColumn(source.bytes, actual.byteEnd);
  if (
    !start ||
    !end ||
    start.line !== actual.lineStart ||
    end.line !== actual.lineEnd ||
    start.column !== actual.columnStart ||
    end.column !== actual.columnEnd
  ) {
    reasons.push(
      reason(
        "diagnostic-location-mismatch",
        "Diagnostic line and UTF-8 column metadata do not match the source bytes.",
      ),
    );
  }
  if (
    actual.lineStart !== expected.line ||
    actual.columnStart !== expected.columnStart ||
    actual.columnEnd !== expected.columnEnd
  ) {
    reasons.push(
      reason(
        "diagnostic-primary-mismatch",
        "The primary diagnostic location differs from the reviewed expectation.",
      ),
    );
  }
  return reasons;
}

export function classifyInitializedPrefixDiagnostics(input: {
  stdout: Uint8Array;
  stderr: Uint8Array;
  outcome: PrefixOutcome;
  sourceFiles: Readonly<Record<string, { path: string; bytes: Uint8Array }>>;
  expected: PrefixRecipeExpectation;
}): PrefixVerificationResult {
  const reasons = checkOutcome(input.outcome, input.expected.expectedExitCode);
  if (!input.expected.diagnostic)
    return failure(
      reason(
        "diagnostic-expectation-missing",
        "This recipe has no reviewed diagnostic expectation.",
      ),
      ...reasons,
    );
  const parsed = parseCompilerOutput(
    input.stdout,
    input.stderr,
    input.expected.diagnostic.allowedSummaries,
    input.expected.diagnostic.errors,
  );
  reasons.push(...parsed.reasons);
  const expectedErrors = input.expected.diagnostic.errors;
  if (parsed.diagnostics.length !== expectedErrors.length)
    reasons.push(
      reason(
        "diagnostic-multiplicity",
        `Expected ${expectedErrors.length} diagnostics, got ${parsed.diagnostics.length}.`,
      ),
    );
  const used = new Set<number>();
  const matchesError = (
    actual: ActualDiagnostic,
    expected: PrefixDiagnosticExpectation,
  ): boolean => {
    if (
      actual.code !== expected.code ||
      actual.primary.length !== expected.primary.length
    )
      return false;
    const usedSpans = new Set<number>();
    for (const expectedSpan of expected.primary) {
      const spanIndex = actual.primary.findIndex(
        (candidate, index) =>
          !usedSpans.has(index) &&
          candidate.sourcePath ===
            (input.sourceFiles[expectedSpan.sourceId]?.path ?? "") &&
          candidate.byteStart === expectedSpan.byteStart &&
          candidate.byteEnd === expectedSpan.byteEnd &&
          candidate.lineStart === expectedSpan.line &&
          candidate.columnStart === expectedSpan.columnStart &&
          candidate.columnEnd === expectedSpan.columnEnd,
      );
      if (spanIndex < 0) return false;
      usedSpans.add(spanIndex);
    }
    return true;
  };
  for (const expectedError of expectedErrors) {
    const exactIndex = parsed.diagnostics.findIndex(
      (candidate, candidateIndex) =>
        !used.has(candidateIndex) && matchesError(candidate, expectedError),
    );
    const index =
      exactIndex >= 0
        ? exactIndex
        : parsed.diagnostics.findIndex(
            (candidate, candidateIndex) =>
              !used.has(candidateIndex) &&
              candidate.code === expectedError.code,
          );
    if (index < 0) {
      reasons.push(
        reason(
          "diagnostic-code-mismatch",
          `Expected diagnostic ${expectedError.code} was not present.`,
        ),
      );
      continue;
    }
    used.add(index);
    const actual = parsed.diagnostics[index];
    if (actual.primary.length !== expectedError.primary.length) {
      reasons.push(
        reason(
          "diagnostic-multiplicity",
          `Expected ${expectedError.primary.length} primary spans for ${expectedError.code}.`,
        ),
      );
    }
    const usedSpans = new Set<number>();
    for (const expectedSpan of expectedError.primary) {
      const spanIndex = actual.primary.findIndex(
        (candidate, candidateIndex) =>
          !usedSpans.has(candidateIndex) &&
          candidate.sourcePath ===
            (input.sourceFiles[expectedSpan.sourceId]?.path ?? "") &&
          candidate.byteStart === expectedSpan.byteStart &&
          candidate.byteEnd === expectedSpan.byteEnd,
      );
      const actualSpan =
        spanIndex >= 0
          ? actual.primary[spanIndex]
          : actual.primary[usedSpans.size];
      if (!actualSpan) continue;
      if (spanIndex >= 0) usedSpans.add(spanIndex);
      reasons.push(
        ...validatePrimary(actualSpan, expectedSpan, input.sourceFiles),
      );
    }
    if (exactIndex < 0)
      reasons.push(
        reason(
          "diagnostic-primary-mismatch",
          "The same-code diagnostic has a different primary-span multiset.",
        ),
      );
  }
  if (parsed.diagnostics.length === expectedErrors.length) {
    const expectedCodeCounts = new Map<string, number>();
    for (const expectedError of expectedErrors)
      expectedCodeCounts.set(
        expectedError.code,
        (expectedCodeCounts.get(expectedError.code) ?? 0) + 1,
      );
    const actualCodeCounts = new Map<string, number>();
    for (const diagnostic of parsed.diagnostics)
      actualCodeCounts.set(
        diagnostic.code,
        (actualCodeCounts.get(diagnostic.code) ?? 0) + 1,
      );
    const duplicateOrExtraCode = [...actualCodeCounts].some(
      ([code, count]) =>
        expectedCodeCounts.has(code) &&
        count > (expectedCodeCounts.get(code) ?? 0),
    );
    if (
      duplicateOrExtraCode &&
      parsed.diagnostics.some((_, index) => !used.has(index))
    )
      reasons.push(
        reason(
          "diagnostic-multiplicity",
          "Compiler emitted an unexpected or duplicate error.",
        ),
      );
  }
  return reasons.length === 0 ? success() : failure(...reasons);
}

function firstLocation(
  text: string,
): { path: string; line: number; column: number; index: number } | undefined {
  const pattern = /(?:^|(?:-->|\.\.>|at\s+))\s*([^\s:]+):([0-9]+):([0-9]+)/gm;
  const match = pattern.exec(text);
  if (!match) return undefined;
  return {
    path: match[1],
    line: Number(match[2]),
    column: Number(match[3]),
    index: match.index,
  };
}

function failureBlockForTest(output: string, testName: string): string {
  const escaped = testName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = new RegExp(
    String.raw`thread ['"]${escaped}['"](?: \([0-9]+\))? panicked at`,
    "i",
  ).exec(output)?.index;
  if (start === undefined) return "";
  const tail = output.slice(start);
  const next = tail
    .slice(1)
    .search(/thread ['"][^'"]+['"](?: \([0-9]+\))? panicked at/i);
  return next < 0 ? tail : tail.slice(0, next + 1);
}

interface SourceAssertionContext {
  expression: string;
  message?: string;
  expectedRightDebug?: string;
  byteStart: number;
  byteEnd: number;
  macroLine: number;
  macroColumn: number;
  macroKind: "assert" | "assert_eq" | "assert_ne";
}

interface SourceFailureContext {
  sourcePath: string;
  sourceBytes: Uint8Array;
  assertion?: SourceAssertionContext;
  assertions: readonly SourceAssertionContext[];
  unwrapLocations: readonly { line: number; column: number }[];
  boundsLocations: readonly { line: number; column: number }[];
  allowTooLongUnwrap: boolean;
}

function sourceFailureContexts(
  sourcePath: string,
  sourceBytes: Uint8Array,
): ReadonlyMap<string, SourceFailureContext> {
  const contexts = new Map<string, SourceFailureContext>();
  let source: string;
  try {
    source = decoder.decode(sourceBytes);
  } catch {
    return contexts;
  }
  const functions = /\bfn\s+([A-Za-z_][A-Za-z0-9_]*)\s*[^\{]*\{/g;
  let functionMatch: RegExpExecArray | null;
  while ((functionMatch = functions.exec(source))) {
    const functionStart = functionMatch.index;
    const bodyEnd = matchingBrace(source, source.indexOf("{", functionStart));
    if (bodyEnd === undefined) continue;
    const body = source.slice(functionStart, bodyEnd + 1);
    const name = functionMatch[1];
    const macroPattern = /(?:::std::)?assert(?:_eq|_ne)?!\s*\(/g;
    const macros = [...body.matchAll(macroPattern)];
    const assertions: SourceAssertionContext[] = [];
    const context: SourceFailureContext = {
      sourcePath,
      sourceBytes,
      assertions,
      unwrapLocations: [...body.matchAll(/\.unwrap\s*\(/g)].flatMap((match) => {
        const unwrapOffset =
          functionStart + match.index + match[0].indexOf("unwrap");
        const location = sourceLineColumn(
          sourceBytes,
          encoder.encode(source.slice(0, unwrapOffset)).byteLength,
        );
        return location ? [location] : [];
      }),
      boundsLocations: [
        ...body.matchAll(
          /\b[A-Za-z_][A-Za-z0-9_]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_]*)*\s*\[\s*[0-9]+\s*\]/g,
        ),
      ].flatMap((match) => {
        const location = sourceLineColumn(
          sourceBytes,
          encoder.encode(source.slice(0, functionStart + match.index))
            .byteLength,
        );
        return location ? [location] : [];
      }),
      allowTooLongUnwrap: /\.unwrap\s*\(/.test(body),
    };
    for (const macro of macros) {
      const absoluteMacro = functionStart + macro.index;
      const open = functionStart + macro.index + macro[0].lastIndexOf("(");
      const close = matchingDelimiter(source, open);
      if (close !== undefined) {
        const inside = source.slice(open + 1, close);
        const args = splitTopLevelArgs(inside);
        const kind = (macro[0].match(/assert(?:_eq|_ne)?/)?.[0] ?? "assert") as
          "assert" | "assert_eq" | "assert_ne";
        const expression = args
          .slice(0, kind === "assert" ? 1 : 2)
          .join(", ")
          .trim();
        const messageValue = args.at(-1);
        const message =
          messageValue && args.length > (kind === "assert" ? 1 : 2)
            ? parseRustStringLiteral(messageValue.trim())
            : undefined;
        const expectedRightDebug =
          kind !== "assert" && args[1]
            ? staticDebugValue(args[1].trim())
            : undefined;
        const byteStart = encoder.encode(source.slice(0, open + 1)).byteLength;
        const expressionBytes = encoder.encode(expression).byteLength;
        const location = sourceLineColumn(
          sourceBytes,
          encoder.encode(source.slice(0, absoluteMacro)).byteLength,
        );
        if (location) {
          assertions.push({
            expression,
            message,
            expectedRightDebug,
            byteStart,
            byteEnd: byteStart + expressionBytes,
            macroLine: location.line,
            macroColumn: location.column,
            macroKind: kind,
          });
        }
      }
    }
    context.assertion = assertions.at(-1);
    contexts.set(name, context);
  }
  return contexts;
}

function matchingBrace(source: string, open: number): number | undefined {
  let depth = 0;
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return index;
  }
  return undefined;
}

function splitTopLevelArgs(value: string): string[] {
  const args: string[] = [];
  let start = 0;
  let parens = 0;
  let brackets = 0;
  let braces = 0;
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === "(") parens += 1;
    else if (char === ")") parens -= 1;
    else if (char === "[") brackets += 1;
    else if (char === "]") brackets -= 1;
    else if (char === "{") braces += 1;
    else if (char === "}") braces -= 1;
    else if (char === "," && parens === 0 && brackets === 0 && braces === 0) {
      args.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(value.slice(start).trim());
  return args.filter(Boolean);
}

function parseRustStringLiteral(value: string): string | undefined {
  if (!value.startsWith('"') || !value.endsWith('"')) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function staticDebugValue(value: string): string | undefined {
  const normalized = value.replace(/^&\s*/, "").replace(/\s+/g, "");
  if (/^\[(?:-?[0-9]+,?)+\]$/.test(normalized)) return normalized;
  if (/^\(-?[0-9]+(?:,-?[0-9]+)+\)$/.test(normalized)) return normalized;
  if (/^-?[0-9]+$/.test(normalized)) return normalized;
  return undefined;
}

function debugValueShape(value: string): boolean {
  return /^(?:\[[^\r\n]*\]|\([^\r\n]*\)|-?[0-9]+|0x[0-9a-f]+)$/i.test(value);
}

interface MiriWrapperContext {
  packageName: string;
}

const miriWarning =
  "WARNING: Ignoring `RUSTC` environment variable; set `MIRI` if you want to control the binary used as the driver.";

function isKnownMiriWrapperLine(
  line: string,
  context: MiriWrapperContext,
): boolean {
  if (line === miriWarning) return true;
  if (
    new RegExp(`^Compiling ${context.packageName} v[0-9.]+ \\(.+\\)$`).test(
      line,
    )
  )
    return true;
  if (/^Finished `test` profile \[.+\] target\(s\) in [0-9.]+s$/.test(line))
    return true;
  if (/^Running unittests src\/lib\.rs \(.+\)$/.test(line)) return true;
  if (line === "warning: unused import: `super::*`") return true;
  if (/^--> src\/lib\.rs:[0-9]+:[0-9]+$/.test(line)) return true;
  if (line === "|") return true;
  if (/^[0-9]+ \|\s+use super::\*;$/.test(line)) return true;
  if (/^\|\s+\^{2,}$/.test(line)) return true;
  if (
    line === "= note: `#[warn(unused_imports)]` on by default" ||
    line ===
      "= note: `#[warn(unused_imports)]` (part of `#[warn(unused)]`) on by default"
  )
    return true;
  return false;
}

function testOutputCollateral(
  output: string,
  failedTestNames: ReadonlySet<string>,
  intendedFailure?: {
    testName: string;
    message: string;
    allowTooLongUnwrap: boolean;
  },
  contexts: ReadonlyMap<string, SourceFailureContext> = new Map(),
  miriWrapper?: MiriWrapperContext,
): string[] {
  const unexpected: string[] = [];
  let inFailureBlock = false;
  let activeFailureTest: string | undefined;
  let assertionHeaderSeen = false;
  let stackBacktraceSeen = false;
  let afterFailureSummary = false;

  let currentBodyKind: "assertion" | "unwrap" | "bounds" | undefined;
  let activeAssertion: SourceAssertionContext | undefined;
  const debugLabels = new Set<string>();
  const contextFor = (testName: string): SourceFailureContext | undefined =>
    contexts.get(testName) ??
    contexts.get(testName.split("::").at(-1) ?? testName) ??
    (intendedFailure?.testName === testName
      ? {
          sourcePath: "",
          sourceBytes: new Uint8Array(),
          assertions: [],
          unwrapLocations: [],
          boundsLocations: [],
          allowTooLongUnwrap: intendedFailure.allowTooLongUnwrap,
        }
      : undefined);
  const isKnownFailureBody = (line: string): boolean => {
    const context = activeFailureTest
      ? contextFor(activeFailureTest)
      : undefined;
    if (
      intendedFailure &&
      activeFailureTest === intendedFailure.testName &&
      line === intendedFailure.message
    )
      return true;
    if (!context) return false;
    const assertion = activeAssertion ?? context.assertion;
    if (/^assertion [`']left == right[`'] failed(?:: (.*))?$/i.test(line)) {
      const match = /^assertion [`']left == right[`'] failed(?:: (.*))?$/i.exec(
        line,
      );
      const expectedMessage =
        assertion?.message ??
        (intendedFailure && activeFailureTest === intendedFailure.testName
          ? intendedFailure.message
          : undefined);
      if (match?.[1] !== undefined && match[1] !== expectedMessage)
        return false;
      if (match?.[1] === undefined && expectedMessage !== undefined)
        return false;
      currentBodyKind = "assertion";
      assertionHeaderSeen = true;
      debugLabels.clear();
      return true;
    }
    if (
      line === "called `Result::unwrap()` on an `Err` value: TooLong" ||
      line === "called Result::unwrap() on an Err value: TooLong"
    ) {
      if (
        !context.allowTooLongUnwrap &&
        activeFailureTest !== intendedFailure?.testName
      )
        return false;
      currentBodyKind = "unwrap";
      return true;
    }
    if (
      /^index out of bounds: the len is [0-9]+ but the index is [0-9]+$/.test(
        line,
      )
    ) {
      currentBodyKind = "bounds";
      return true;
    }
    const debug = /^(left|right): (.+)$/.exec(line);
    if (debug && currentBodyKind === "assertion" && assertionHeaderSeen) {
      if (
        !debugValueShape(debug[2]) ||
        debugLabels.has(debug[1]) ||
        (debug[1] === "right" && !debugLabels.has("left"))
      )
        return false;
      if (
        debug[1] === "right" &&
        assertion?.expectedRightDebug !== undefined &&
        debug[2].replace(/\s+/g, "") !== assertion.expectedRightDebug
      )
        return false;
      debugLabels.add(debug[1]);
      return true;
    }
    if (
      /^note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace$/i.test(
        line,
      )
    )
      return true;
    if (/^stack backtrace:$/i.test(line)) {
      stackBacktraceSeen = true;
      return true;
    }
    return (
      (stackBacktraceSeen && /^\d+:\s+.{1,512}$/i.test(line)) ||
      (stackBacktraceSeen && /^at\s+\S+:\d+:\d+$/i.test(line))
    );
  };

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (miriWrapper && isKnownMiriWrapperLine(line, miriWrapper)) continue;
    if (/^running\s+\d+\s+tests?$/i.test(line)) continue;
    if (/^test\s+\S+\s+\.\.\.\s+(?:ok|FAILED|ignored)$/i.test(line)) continue;
    const failureHeader = /^----\s+(\S+)\s+stdout\s+----$/i.exec(line);
    if (failureHeader) {
      activeFailureTest = failureHeader[1];
      inFailureBlock = failedTestNames.has(activeFailureTest);
      assertionHeaderSeen = false;
      stackBacktraceSeen = false;
      afterFailureSummary = false;
      currentBodyKind = undefined;
      activeAssertion = undefined;
      debugLabels.clear();
      if (!inFailureBlock) unexpected.push(rawLine);
      continue;
    }
    const directPanic =
      /^thread ['"]([^'"]+)['"](?: \([0-9]+\))? panicked at (.+):([0-9]+):([0-9]+):$/i.exec(
        line,
      );
    if (directPanic && failedTestNames.has(directPanic[1])) {
      activeFailureTest = directPanic[1];
      const context = contextFor(activeFailureTest);
      assertionHeaderSeen = false;
      stackBacktraceSeen = false;
      afterFailureSummary = false;
      currentBodyKind = undefined;
      debugLabels.clear();
      activeAssertion = context?.assertions.find(
        (assertion) =>
          assertion.macroLine === Number(directPanic[3]) &&
          assertion.macroColumn === Number(directPanic[4]),
      );
      const sourceBound =
        context === undefined ||
        context.sourcePath === "" ||
        (context.sourcePath === directPanic[2] &&
          [
            ...context.assertions.map((assertion) => ({
              line: assertion.macroLine,
              column: assertion.macroColumn,
            })),
            ...context.unwrapLocations,
            ...context.boundsLocations,
          ].some(
            (location) =>
              location.line === Number(directPanic[3]) &&
              location.column === Number(directPanic[4]),
          ));
      inFailureBlock = context !== undefined && sourceBound;
      if (
        context === undefined &&
        contexts.size === 0 &&
        activeFailureTest !== intendedFailure?.testName
      )
        inFailureBlock = true;
      if (!inFailureBlock) unexpected.push(rawLine);
      continue;
    }
    if (/^failures:$/i.test(line)) {
      inFailureBlock = false;
      activeFailureTest = undefined;
      assertionHeaderSeen = false;
      stackBacktraceSeen = false;
      afterFailureSummary = true;
      currentBodyKind = undefined;
      debugLabels.clear();
      continue;
    }
    if (
      /^test result:\s+(?:ok|FAILED)\.\s+\d+ passed;\s+\d+ failed;\s+\d+ ignored;\s+\d+ measured;\s+\d+ filtered out;\s+finished in\s+[0-9.]+s$/i.test(
        line,
      )
    ) {
      inFailureBlock = false;
      activeFailureTest = undefined;
      assertionHeaderSeen = false;
      stackBacktraceSeen = false;
      afterFailureSummary = false;
      currentBodyKind = undefined;
      activeAssertion = undefined;
      debugLabels.clear();
      continue;
    }
    if (inFailureBlock) {
      if (isKnownFailureBody(line)) continue;
      unexpected.push(rawLine);
      continue;
    }
    if (afterFailureSummary && failedTestNames.has(line)) continue;
    unexpected.push(rawLine);
  }
  return unexpected;
}

function miriPackageNameForSource(sourceId: string): string | undefined {
  const main = /(?:^|\/)([A-Za-z0-9_-]+)\/src\/(?:main|lib)\.rs$/.exec(
    sourceId,
  );
  if (main) return `initialized_prefix_${main[1].replaceAll("-", "_")}`;
  const source = /(?:^|\/)solution-(element|bulk)\.rs$/.exec(sourceId);
  return source ? `initialized_prefix_${source[1]}` : undefined;
}

function classifyInitializedPrefixLibtestOutputInternal(
  input: {
    output: string;
    failedTestNames: ReadonlySet<string>;
    sourcePath?: string;
    sourceBytes?: Uint8Array;
    intendedFailure?: {
      testName: string;
      message: string;
      allowTooLongUnwrap: boolean;
    };
  },
  miriWrapper?: MiriWrapperContext,
): PrefixVerificationResult {
  const contexts =
    input.sourcePath && input.sourceBytes
      ? new Map(sourceFailureContexts(input.sourcePath, input.sourceBytes))
      : new Map<string, SourceFailureContext>();
  const unexpected = testOutputCollateral(
    input.output,
    input.failedTestNames,
    input.intendedFailure,
    contexts,
    miriWrapper,
  );
  return unexpected.length === 0
    ? success()
    : failure(
        ...unexpected.map((line) =>
          reason(
            "unexpected-collateral",
            `Unrecognized libtest output: ${line}`,
          ),
        ),
      );
}

/** Narrow pure libtest parser used by recipe verification and focused regressions. */
export function classifyInitializedPrefixLibtestOutput(input: {
  output: string;
  failedTestNames: ReadonlySet<string>;
  sourcePath?: string;
  sourceBytes?: Uint8Array;
  intendedFailure?: {
    testName: string;
    message: string;
    allowTooLongUnwrap: boolean;
  };
}): PrefixVerificationResult {
  return classifyInitializedPrefixLibtestOutputInternal(input);
}

function assertionMacroLocation(
  sourceBytes: Uint8Array,
  assertion: { byteStart: number; byteEnd: number },
): { line: number; column: number } | undefined {
  let source: string;
  try {
    source = decoder.decode(sourceBytes);
  } catch {
    return undefined;
  }
  const macroPattern = /(?:::std::)?assert(?:_eq|_ne)?!\s*\(/g;
  let candidate: RegExpExecArray | null;
  while ((candidate = macroPattern.exec(source))) {
    const macroStart = encoder.encode(
      source.slice(0, candidate.index),
    ).byteLength;
    const open = candidate.index + candidate[0].lastIndexOf("(");
    const close = matchingDelimiter(source, open);
    if (close === undefined) continue;
    const invocationEnd = encoder.encode(source.slice(0, close + 1)).byteLength;
    if (macroStart <= assertion.byteStart && assertion.byteEnd <= invocationEnd)
      return sourceLineColumn(sourceBytes, macroStart);
  }
  return undefined;
}

function matchingDelimiter(source: string, open: number): number | undefined {
  let depth = 0;
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return undefined;
}

interface MiriParserContext {
  operation: PrefixOperation;
  argv: readonly string[];
  manifestPath: string;
  packageRoot: string;
  sourcePath: string;
}

function classifyInitializedPrefixMiriInternal(
  input: {
    stdout: Uint8Array;
    stderr: Uint8Array;
    outcome: PrefixOutcome;
    sourceFiles: Readonly<Record<string, { path: string; bytes: Uint8Array }>>;
    expected: PrefixRecipeExpectation;
  },
  parserContext?: MiriParserContext,
): PrefixVerificationResult {
  const expected = input.expected.miri;
  const reasons = checkOutcome(input.outcome, input.expected.expectedExitCode);
  if (!expected)
    return failure(
      reason(
        "miri-expectation-missing",
        "This recipe has no reviewed Miri expectation.",
      ),
      ...reasons,
    );
  const source = expectedSource(
    input.sourceFiles,
    expected.sourceId,
    expected.sourceSha256,
  );
  if (!source)
    reasons.push(
      reason(
        "miri-source-mismatch",
        "Miri evidence is not bound to the reviewed source.",
      ),
    );
  if (source) {
    const slice = bytesAtRange(
      source.bytes,
      expected.byteStart,
      expected.byteEnd,
    );
    const location = sourceLineColumn(source.bytes, expected.byteStart);
    if (slice !== expected.expression)
      reasons.push(
        reason(
          "miri-expression-mismatch",
          "The reviewed forced-read range does not contain the authored expression exactly.",
        ),
      );
    if (
      !location ||
      location.line !== expected.line ||
      location.column !== expected.column
    )
      reasons.push(
        reason(
          "miri-location-mismatch",
          "The reviewed forced-read line and column do not match source bytes.",
        ),
      );
  }
  let text: string;
  try {
    text = `${decoder.decode(input.stdout)}\n${decoder.decode(input.stderr)}`;
  } catch {
    reasons.push(
      reason("invalid-utf8-output", "Miri output is not valid UTF-8."),
    );
    return failure(...reasons);
  }
  const lines = text.split(/\r?\n/);
  if (parserContext) {
    const manifestIndex = parserContext.argv.indexOf("--manifest-path");
    const manifestArg =
      manifestIndex >= 0 ? parserContext.argv[manifestIndex + 1] : undefined;
    if (
      parserContext.operation !== "miri-ub" ||
      parserContext.argv.slice(0, 2).join(" ") !== "miri run" ||
      manifestArg !== parserContext.manifestPath ||
      parserContext.argv.slice(manifestIndex + 2).join(" ") !==
        "--offline --locked"
    )
      reasons.push(
        reason(
          "miri-wrapper-mismatch",
          "Miri argv is not the reviewed offline locked package command.",
        ),
      );
    const warning =
      "WARNING: Ignoring `RUSTC` environment variable; set `MIRI` if you want to control the binary used as the driver.";
    const firstSemantic = lines.findIndex((line) =>
      /^error:\s*Undefined Behavior:/i.test(line),
    );
    const prefixLines =
      firstSemantic < 0 ? lines : lines.slice(0, firstSemantic);
    for (const line of prefixLines) {
      if (!line || line === warning) continue;
      if (
        /^\s+Compiling initialized_prefix_skipped_write_ub v[0-9.]+ \(.+\)$/.test(
          line,
        )
      ) {
        const packagePath = line.match(/\((.+)\)$/)?.[1];
        if (packagePath !== parserContext.packageRoot)
          reasons.push(
            reason(
              "miri-package-mismatch",
              "Miri compiled a different package root.",
            ),
          );
        continue;
      }
      if (
        /^\s+Finished `dev` profile \[.+\] target\(s\) in [0-9.]+s$/.test(line)
      )
        continue;
      if (/^\s+Running `.+`$/.test(line)) continue;
      reasons.push(
        reason(
          "miri-wrapper-mismatch",
          `Unrecognized Miri wrapper output: ${line}`,
        ),
      );
    }
  }
  const firstError = lines.findIndex((line) =>
    /^\s*error:\s*Undefined Behavior:/i.test(line),
  );
  const earlierError = lines.findIndex((line) => /^\s*error\s*:/i.test(line));
  if (firstError >= 0 && earlierError >= 0 && earlierError < firstError) {
    reasons.push(
      reason(
        "miri-category-mismatch",
        "An unrelated error preceded the reviewed Undefined Behavior event.",
      ),
      reason(
        "miri-location-mismatch",
        "The reviewed event was not the earliest Miri semantic error.",
      ),
    );
  }
  if (firstError < 0)
    reasons.push(
      reason(
        "miri-error-missing",
        "Miri did not emit a structured first error.",
      ),
    );
  const prefix =
    firstError < 0 ? "" : lines.slice(0, firstError + 1).join("\n");
  if (
    /unsupported|spawn|timed?\s*out|sig(?:nal)?|panicked?\s+at|panic!/i.test(
      prefix,
    )
  )
    reasons.push(
      reason(
        "miri-setup-failure",
        "The first Miri event was setup failure or a generic panic.",
      ),
    );
  const nextError =
    firstError < 0
      ? -1
      : lines.findIndex(
          (line, index) =>
            index > firstError &&
            /^\s*error:\s*Undefined Behavior:/i.test(line),
        );
  if (nextError >= 0)
    reasons.push(
      reason(
        "miri-multiple-errors",
        "Miri emitted a second distinct Undefined Behavior event.",
      ),
    );
  const blockEnd = nextError >= 0 ? nextError : lines.length;
  const diagnosticWindow =
    firstError < 0 ? "" : lines.slice(firstError, blockEnd).join("\n");
  if (!/^error:\s*Undefined Behavior:/im.test(diagnosticWindow))
    reasons.push(
      reason(
        "miri-category-mismatch",
        "The first Miri event is not an explicit Undefined Behavior diagnostic.",
      ),
    );
  if (
    !/(?:memory is uninitialized|requires initialized memory|uninitialized(?:[- ]read| memory| value)|read of uninitialized)/i.test(
      diagnosticWindow,
    )
  )
    reasons.push(
      reason(
        "miri-category-mismatch",
        "The first Miri error is not the reviewed uninitialized-read category.",
      ),
    );
  if (firstError >= 0) {
    const location = firstLocation(diagnosticWindow);
    const resolvedLocation =
      location && parserContext && !location.path.startsWith("/")
        ? normalize(resolve(parserContext.packageRoot, location.path))
        : location?.path;
    const expectedPath = parserContext?.sourcePath ?? source?.path;
    if (
      !location ||
      resolvedLocation !== expectedPath ||
      (parserContext &&
        relative(parserContext.packageRoot, resolvedLocation ?? "").startsWith(
          "..",
        )) ||
      location.line !== expected.line ||
      location.column !== expected.column
    )
      reasons.push(
        reason(
          "miri-location-mismatch",
          "The earliest Miri source location is not the authored forced read.",
        ),
      );
    if (!diagnosticWindow.includes(expected.expression))
      reasons.push(
        reason(
          "miri-read-mismatch",
          "Miri output does not identify the reviewed forced-read expression.",
        ),
      );
    if (/panicked?\s+at|thread '.*' panicked/i.test(lines[firstError]))
      reasons.push(
        reason(
          "miri-generic-panic",
          "A generic panic was reported as the first Miri error.",
        ),
      );
  }
  return reasons.length === 0 ? success() : failure(...reasons);
}

export function classifyInitializedPrefixMiri(input: {
  stdout: Uint8Array;
  stderr: Uint8Array;
  outcome: PrefixOutcome;
  sourceFiles: Readonly<Record<string, { path: string; bytes: Uint8Array }>>;
  expected: PrefixRecipeExpectation;
}): PrefixVerificationResult {
  return classifyInitializedPrefixMiriInternal(input);
}

function resolveRef(manifestPath: string, ref: PrefixFileRef): string {
  return isAbsolute(ref.path)
    ? normalize(ref.path)
    : resolve(dirname(manifestPath), ref.path);
}

type RefRole =
  | "owned"
  | "external-tool"
  | "external-input"
  | "qualification"
  | "sysroot"
  | "provenance";

interface RefPolicyEntry {
  ref: PrefixFileRef;
  roles: Set<RefRole>;
}

interface RefPolicy {
  attemptRoot: string;
  entries: Map<string, RefPolicyEntry>;
}

let activeRefPolicy: RefPolicy | undefined;

function policyPath(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    return normalize(absolute);
  }
}

function isWithin(root: string, path: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

function addPolicyRef(
  policy: RefPolicy,
  ref: PrefixFileRef,
  role: RefRole,
  reasons: MutableReasons,
  manifestPath: string,
): void {
  if (!isFileRef(ref)) {
    reasons.push(
      reason("malformed-file-ref", "A file reference is incomplete."),
    );
    return;
  }
  const key = policyPath(resolveRef(manifestPath, ref));
  const prior = policy.entries.get(key);
  if (prior) {
    if (
      prior.ref.bytes !== ref.bytes ||
      prior.ref.sha256.toLowerCase() !== ref.sha256.toLowerCase()
    )
      reasons.push(
        reason(
          "reference-overlap-mismatch",
          `Canonical reference ${ref.path} has conflicting byte identity.`,
          ref.path,
        ),
      );
    prior.roles.add(role);
    return;
  }
  policy.entries.set(key, { ref, roles: new Set([role]) });
}

function buildRefPolicy(
  manifestPath: string,
  manifest: Record<string, unknown>,
  expected: PrefixObservedExpectations,
  reasons: MutableReasons,
): RefPolicy {
  const attemptRoot = policyPath(
    typeof manifest.attemptDirectory === "string"
      ? resolve(manifest.attemptDirectory)
      : dirname(resolve(manifestPath)),
  );
  const policy: RefPolicy = { attemptRoot, entries: new Map() };
  const add = (ref: unknown, role: RefRole) => {
    if (isFileRef(ref)) addPolicyRef(policy, ref, role, reasons, manifestPath);
  };
  for (const ref of collectRefs(manifest)) add(ref, "owned");
  for (const ref of expected.adjudication.provenance) add(ref, "provenance");
  const toolchain = isRecord(manifest.toolchain)
    ? manifest.toolchain
    : undefined;
  const qualified = new Map<string, PrefixFileRef>();
  if (toolchain && isRecord(toolchain.executables))
    for (const value of Object.values(toolchain.executables))
      if (isFileRef(value)) {
        add(value, "external-tool");
        qualified.set(policyPath(resolveRef(manifestPath, value)), value);
      }
  if (toolchain && isFileRef(toolchain.config)) add(toolchain.config, "owned");
  if (toolchain && isFileRef(toolchain.ref)) add(toolchain.ref, "owned");
  if (
    toolchain &&
    isRecord(toolchain.sysroot) &&
    isFileRef(toolchain.sysroot.manifest) &&
    Array.isArray(toolchain.sysroot.files)
  ) {
    add(toolchain.sysroot.manifest, "sysroot");
    for (const file of toolchain.sysroot.files) add(file, "sysroot");
  }
  const qualificationPaths = qualificationInputPaths(manifestPath, manifest);
  const externalConfigPaths = externalConfigTwinPaths(manifestPath, manifest);
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isRecord(entry.record)) continue;
    const spec = isRecord(entry.record.spec) ? entry.record.spec : undefined;
    if (!spec) continue;
    if (Array.isArray(spec.externalInputs))
      for (const ref of spec.externalInputs) add(ref, "external-input");
    if (isFileRef(spec.executable)) {
      const key = policyPath(resolveRef(manifestPath, spec.executable));
      add(spec.executable, qualified.has(key) ? "external-tool" : "owned");
    }
    if (Array.isArray(spec.inputs))
      for (const ref of spec.inputs) {
        const path = isFileRef(ref)
          ? canonicalRefPath(ref, manifestPath)
          : undefined;
        const role =
          path && qualificationPaths.has(path)
            ? "qualification"
            : path && externalConfigPaths.has(path)
              ? "external-input"
              : "owned";
        add(ref, role);
      }
  }
  for (const [key, entry] of policy.entries) {
    const outside = !isWithin(attemptRoot, key);
    const readonly = [...entry.roles].some((role) => role !== "owned");
    if (outside && !readonly)
      reasons.push(
        reason(
          "reference-outside-attempt",
          "An owned evidence reference escapes the selected attempt directory.",
          entry.ref.path,
        ),
      );
  }
  return policy;
}

function readRef(
  manifestPath: string,
  ref: PrefixFileRef,
  reasons: MutableReasons,
  seen: Set<string>,
  requireBytes = true,
): Uint8Array | undefined {
  if (!isFileRef(ref)) {
    reasons.push(
      reason("malformed-file-ref", "A file reference is incomplete."),
    );
    return undefined;
  }
  const path = resolveRef(manifestPath, ref);
  const policy = activeRefPolicy;
  const key = policyPath(path);
  const policyEntry = policy?.entries.get(key);
  if (policy && !policyEntry) {
    reasons.push(
      reason(
        "unregistered-reference",
        "The referenced evidence path is not part of the role-validated graph.",
        ref.path,
      ),
    );
    return undefined;
  }
  if (policy && policyEntry) {
    const readonly = [...policyEntry.roles].some((role) => role !== "owned");
    if (readonly && ref.path !== policyEntry.ref.path)
      reasons.push(
        reason(
          "external-reference-mismatch",
          "A declared external reference must retain its exact qualified path spelling.",
          ref.path,
        ),
      );
    if (
      policyEntry.ref.bytes !== ref.bytes ||
      policyEntry.ref.sha256.toLowerCase() !== ref.sha256.toLowerCase()
    )
      reasons.push(
        reason(
          "reference-overlap-mismatch",
          "The reference does not retain the exact canonical byte identity.",
          ref.path,
        ),
      );
    if (
      !isWithin(policy.attemptRoot, key) &&
      ![...policyEntry.roles].some((role) => role !== "owned")
    )
      reasons.push(
        reason(
          "reference-outside-attempt",
          "An owned evidence reference escapes the selected attempt directory.",
          ref.path,
        ),
      );
  }
  if (seen.has(`${path}\u0000${ref.sha256}`)) {
    if (!requireBytes) return undefined;
    try {
      return readFileSync(path);
    } catch {
      return undefined;
    }
  }
  seen.add(`${path}\u0000${ref.sha256}`);
  try {
    if (!existsSync(path)) throw new Error("missing");
    const stat = lstatSync(path);
    const allowToolSymlink =
      policyEntry?.roles.has("external-tool") &&
      ![...policyEntry.roles].some(
        (role) =>
          role === "external-input" ||
          role === "qualification" ||
          role === "sysroot" ||
          role === "provenance",
      );
    if (stat.isSymbolicLink() && !allowToolSymlink) throw new Error("symlink");
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error("missing");
    const bytes = readFileSync(path);
    const checked = hashFileRef(bytes, ref, ref.path);
    if (!checked.ok) reasons.push(...checked.reasons);
    return bytes;
  } catch {
    reasons.push(
      reason(
        "missing-evidence",
        "Referenced evidence file is missing or unreadable.",
        ref.path,
      ),
    );
    return undefined;
  }
}

function validateOutcome(
  value: unknown,
  reasons: MutableReasons,
): value is PrefixOutcome {
  if (
    !isRecord(value) ||
    (typeof value.exitCode !== "number" && value.exitCode !== null) ||
    (typeof value.signal !== "string" && value.signal !== null) ||
    (typeof value.spawnError !== "string" && value.spawnError !== null) ||
    typeof value.timedOut !== "boolean" ||
    typeof value.outputLimit !== "boolean" ||
    typeof value.drainTimedOut !== "boolean"
  ) {
    reasons.push(
      reason("malformed-outcome", "Command outcome has an invalid shape."),
    );
    return false;
  }
  return true;
}

function validateRecordShape(
  record: unknown,
  reasons: MutableReasons,
): record is PrefixCommandRecord {
  if (
    !isRecord(record) ||
    record.schema !== "initialized-prefix-command-v1" ||
    !isRecord(record.spec) ||
    typeof record.spec.id !== "string" ||
    typeof record.spec.recipeId !== "string" ||
    typeof record.spec.mode !== "string" ||
    typeof record.spec.operation !== "string" ||
    !isFileRef(record.spec.executable) ||
    !Array.isArray(record.spec.argv) ||
    !record.spec.argv.every((arg) => typeof arg === "string") ||
    typeof record.spec.cwd !== "string" ||
    !isRecord(record.spec.env) ||
    !Array.isArray(record.spec.inputs) ||
    !record.spec.inputs.every(isFileRef) ||
    !Array.isArray(record.spec.externalInputs) ||
    !record.spec.externalInputs.every(isFileRef) ||
    (record.spec.toolchainBinding !== undefined &&
      !isFileRef(record.spec.toolchainBinding)) ||
    typeof record.startedAt !== "string" ||
    typeof record.finishedAt !== "string" ||
    !isFileRef(record.stdout) ||
    !isFileRef(record.stderr) ||
    !Array.isArray(record.before) ||
    !record.before.every(
      (entry) =>
        isRecord(entry) && isFileRef(entry.input) && isFileRef(entry.archive),
    ) ||
    !Array.isArray(record.after) ||
    !record.after.every(
      (entry) =>
        isRecord(entry) && isFileRef(entry.input) && isFileRef(entry.archive),
    ) ||
    !isRecord(record.guard) ||
    typeof record.guard.ok !== "boolean" ||
    !Array.isArray(record.guard.reasons) ||
    !record.guard.reasons.every((entry) => typeof entry === "string")
  ) {
    reasons.push(
      reason(
        "malformed-command-record",
        "A command record does not match the frozen schema.",
      ),
    );
    return false;
  }
  validateOutcome(record.outcome, reasons);
  return true;
}

function walkFiles(root: string): string[] {
  const output: string[] = [];
  if (!existsSync(root)) return output;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(path));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

function collectRefs(
  value: unknown,
  refs: PrefixFileRef[] = [],
): PrefixFileRef[] {
  if (isFileRef(value)) {
    refs.push(value);
    return refs;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectRefs(child, refs);
  } else if (isRecord(value)) {
    for (const child of Object.values(value)) collectRefs(child, refs);
  }
  return refs;
}

function canonicalRecord(value: unknown): string {
  return stableStringify(value);
}

function withoutRef(value: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...value };
  delete copy.ref;
  return copy;
}

function verifyToolchainRef(
  manifestPath: string,
  toolchain: PrefixToolchainBinding,
  reasons: MutableReasons,
): void {
  const ref = toolchain.ref;
  const path = resolveRef(manifestPath, ref);
  try {
    const bytes = readFileSync(path);
    const checked = hashFileRef(bytes, ref, ref.path);
    if (!checked.ok) reasons.push(...checked.reasons);
    try {
      const onDisk = JSON.parse(decoder.decode(bytes));
      if (
        !isRecord(onDisk) ||
        canonicalRecord(withoutRef(onDisk)) !==
          canonicalRecord(
            withoutRef(toolchain as unknown as Record<string, unknown>),
          )
      )
        reasons.push(
          reason(
            "toolchain-binding-mismatch",
            "The toolchain binding file differs from manifest data with ref removed.",
            ref.path,
          ),
        );
    } catch {
      reasons.push(
        reason(
          "malformed-toolchain-binding",
          "The toolchain binding reference is not JSON.",
          ref.path,
        ),
      );
    }
  } catch {
    reasons.push(
      reason(
        "missing-evidence",
        "Referenced toolchain binding is missing or unreadable.",
        ref.path,
      ),
    );
  }
}

interface QualificationEvidence {
  versionContains: Readonly<Record<string, string>>;
  nightlyDistributionDate?: string;
  compilerCommitDate?: string;
}

function verifyQualificationEvidence(
  manifestPath: string,
  mode: PrefixMode,
  toolchain: PrefixToolchainBinding,
  metadataRecords: ReadonlyMap<string, PrefixCommandRecord>,
  reasons: MutableReasons,
  seenFiles: Set<string>,
): QualificationEvidence | undefined {
  const candidates = new Map<string, PrefixFileRef>();
  for (const record of metadataRecords.values())
    for (const input of record.spec.inputs)
      if (isFileRef(input))
        candidates.set(refIdentity(input, manifestPath), input);
  const matches: Array<{
    ref: PrefixFileRef;
    value: Record<string, unknown>;
  }> = [];
  for (const ref of candidates.values()) {
    const bytes = readRef(manifestPath, ref, reasons, seenFiles);
    if (!bytes) continue;
    let value: unknown;
    try {
      value = JSON.parse(decoder.decode(bytes));
    } catch {
      continue;
    }
    if (
      isRecord(value) &&
      value.schema === "initialized-prefix-toolchain-qualification-v1"
    )
      matches.push({ ref, value });
  }
  if (matches.length !== 1) {
    reasons.push(
      reason(
        matches.length === 0
          ? "missing-toolchain-qualification"
          : "duplicate-toolchain-qualification",
        "Metadata commands must retain exactly one hash-bound toolchain qualification JSON input.",
      ),
    );
    return undefined;
  }
  const qualification = matches[0].value;
  if (
    isFileRef(toolchain.ref) &&
    refIdentity(matches[0].ref, manifestPath) ===
      refIdentity(toolchain.ref, manifestPath)
  )
    reasons.push(
      reason(
        "toolchain-qualification-mismatch",
        "The qualification JSON must be a distinct retained input from the toolchain binding.",
        matches[0].ref.path,
      ),
    );
  if (
    qualification.mode !== mode ||
    qualification.toolchain !== toolchain.name ||
    !isRecord(qualification.executables) ||
    !isRecord(qualification.versionContains)
  ) {
    reasons.push(
      reason(
        "toolchain-qualification-mismatch",
        "The retained toolchain qualification does not match the selected mode or identity.",
        matches[0].ref.path,
      ),
    );
    return undefined;
  }
  const executableNames = Object.keys(toolchain.executables).sort();
  const qualifiedNames = Object.keys(qualification.executables).sort();
  if (stableStringify(executableNames) !== stableStringify(qualifiedNames))
    reasons.push(
      reason(
        "toolchain-qualification-mismatch",
        "The qualified executable set differs from the selected toolchain set.",
        matches[0].ref.path,
      ),
    );
  for (const name of executableNames) {
    const selected = toolchain.executables[name];
    const qualified = qualification.executables[name];
    if (
      !isFileRef(selected) ||
      !isFileRef(qualified) ||
      refIdentity(selected, manifestPath) !==
        refIdentity(qualified, manifestPath)
    )
      reasons.push(
        reason(
          "toolchain-executable-mismatch",
          `Qualified executable ${name} differs from the selected executable identity.`,
          matches[0].ref.path,
        ),
      );
  }
  const versionContains: Record<string, string> = {};
  for (const [name, value] of Object.entries(qualification.versionContains)) {
    if (
      typeof value !== "string" ||
      value.trim() !== value ||
      value.length === 0
    )
      reasons.push(
        reason(
          "toolchain-version-mismatch",
          `Qualified stdout for ${name} is not a complete normalized string.`,
          matches[0].ref.path,
        ),
      );
    else versionContains[name] = value;
  }
  for (const name of executableNames)
    if (typeof versionContains[name] !== "string")
      reasons.push(
        reason(
          "toolchain-version-mismatch",
          `Qualified stdout for ${name} is missing.`,
          matches[0].ref.path,
        ),
      );
  const nightlyDistributionDate =
    typeof qualification.nightlyDistributionDate === "string"
      ? qualification.nightlyDistributionDate
      : undefined;
  const compilerCommitDate =
    typeof qualification.compilerCommitDate === "string"
      ? qualification.compilerCommitDate
      : undefined;
  if (
    mode === "miri" &&
    (nightlyDistributionDate !== "2026-08-08" || !compilerCommitDate)
  )
    reasons.push(
      reason(
        "toolchain-qualification-mismatch",
        "Miri qualification must retain the pinned distribution and distinct compiler commit dates.",
        matches[0].ref.path,
      ),
    );
  if (
    mode !== "miri" &&
    (qualification.nightlyDistributionDate !== undefined ||
      qualification.compilerCommitDate !== undefined)
  )
    reasons.push(
      reason(
        "toolchain-qualification-mismatch",
        "Non-Miri qualification cannot contain nightly date metadata.",
        matches[0].ref.path,
      ),
    );
  for (const record of metadataRecords.values())
    if (
      !record.spec.inputs.some(
        (input) =>
          refIdentity(input, manifestPath) ===
          refIdentity(matches[0].ref, manifestPath),
      )
    )
      reasons.push(
        reason(
          "toolchain-qualification-mismatch",
          `Metadata command ${record.spec.id} does not retain the qualification input.`,
        ),
      );
  return { versionContains, nightlyDistributionDate, compilerCommitDate };
}

function verifyRecord(
  manifestPath: string,
  recorded: PrefixRecordedCommand,
  reasons: MutableReasons,
  seenFiles: Set<string>,
): PrefixCommandRecord | undefined {
  if (
    !isRecord(recorded) ||
    !isFileRef(recorded.ref) ||
    !validateRecordShape(recorded.record, reasons)
  )
    return undefined;
  const recordBytes = readRef(manifestPath, recorded.ref, reasons, seenFiles);
  if (recordBytes) {
    try {
      const parsed = JSON.parse(decoder.decode(recordBytes));
      if (canonicalRecord(parsed) !== canonicalRecord(recorded.record))
        reasons.push(
          reason(
            "record-link-mismatch",
            "The command record file differs from the manifest record.",
            recorded.ref.path,
          ),
        );
    } catch {
      reasons.push(
        reason(
          "malformed-record-json",
          "The command record file is not valid JSON.",
          recorded.ref.path,
        ),
      );
    }
  }
  const record = recorded.record;
  readRef(manifestPath, record.spec.executable, reasons, seenFiles, false);
  for (const input of [...record.spec.inputs, ...record.spec.externalInputs])
    readRef(manifestPath, input, reasons, seenFiles, false);
  if (record.spec.toolchainBinding)
    readRef(
      manifestPath,
      record.spec.toolchainBinding,
      reasons,
      seenFiles,
      false,
    );
  readRef(manifestPath, record.stdout, reasons, seenFiles, false);
  readRef(manifestPath, record.stderr, reasons, seenFiles, false);
  verifyRecordClosure(manifestPath, record, reasons, seenFiles);
  return record;
}

function canonicalRefPath(ref: PrefixFileRef, manifestPath?: string): string {
  const resolved = manifestPath
    ? resolveRef(manifestPath, ref)
    : resolve(ref.path);
  try {
    return realpathSync(resolved);
  } catch {
    return normalize(resolved);
  }
}

function refIdentity(ref: PrefixFileRef, manifestPath?: string): string {
  return `${canonicalRefPath(ref, manifestPath)}\u0000${ref.bytes}\u0000${ref.sha256}`;
}

function hasRef(
  refs: readonly PrefixFileRef[],
  expected: PrefixFileRef,
  manifestPath?: string,
): boolean {
  return refs.some(
    (ref) =>
      refIdentity(ref, manifestPath) === refIdentity(expected, manifestPath),
  );
}

function hasQualifiedEnvironment(
  command: PrefixCommandSpec,
  qualified: Readonly<Record<string, string>>,
): boolean {
  return Object.entries(qualified).every(
    ([key, value]) => command.env[key] === value,
  );
}

function hasExactEnvironment(
  command: PrefixCommandSpec,
  qualified: Readonly<Record<string, string>>,
): boolean {
  const keys = Object.keys(command.env).sort();
  const qualifiedKeys = Object.keys(qualified).sort();
  return (
    stableStringify(keys) === stableStringify(qualifiedKeys) &&
    hasQualifiedEnvironment(command, qualified)
  );
}

function successfulOutcome(outcome: PrefixOutcome): boolean {
  return (
    outcome.exitCode === 0 &&
    outcome.signal === null &&
    outcome.spawnError === null &&
    !outcome.timedOut &&
    !outcome.outputLimit &&
    !outcome.drainTimedOut
  );
}

function isPrefixOutcome(value: unknown): value is PrefixOutcome {
  return (
    isRecord(value) &&
    (typeof value.exitCode === "number" || value.exitCode === null) &&
    (typeof value.signal === "string" || value.signal === null) &&
    (typeof value.spawnError === "string" || value.spawnError === null) &&
    typeof value.timedOut === "boolean" &&
    typeof value.outputLimit === "boolean" &&
    typeof value.drainTimedOut === "boolean"
  );
}

function hasOperationSource(
  command: PrefixCommandSpec,
  expected: PrefixRecipeExpectation,
  sourceRef: PrefixFileRef | undefined,
): boolean {
  if (
    !sourceRef ||
    !command.inputs.some(
      (ref) => canonicalRefPath(ref) === canonicalRefPath(sourceRef),
    )
  )
    return false;
  if (
    expected.operation === "compile" ||
    expected.operation === "client-negative"
  )
    return command.argv.some(
      (arg) => normalize(resolve(arg)) === canonicalRefPath(sourceRef),
    );
  if (
    expected.operation === "miri-positive" ||
    expected.operation === "miri-ub" ||
    expected.operation === "miri-sound"
  )
    return command.argv.some(
      (arg, index) =>
        arg === "--manifest-path" &&
        command.argv[index + 1] !== undefined &&
        command.inputs.some(
          (ref) =>
            canonicalRefPath(ref) === resolve(command.argv[index + 1]) &&
            /(?:^|[/\\])Cargo\.toml$/i.test(ref.path),
        ),
    );
  return true;
}

interface CompiledOutputReceipt {
  schema: "initialized-prefix-compiled-output-v1";
  command: PrefixFileRef;
  source: PrefixFileRef;
  output: PrefixFileRef;
}

interface CompiledOutputLink {
  output: PrefixFileRef;
  source: PrefixFileRef;
}

function isCompiledOutputReceipt(
  value: unknown,
): value is CompiledOutputReceipt {
  return (
    isRecord(value) &&
    value.schema === "initialized-prefix-compiled-output-v1" &&
    isFileRef(value.command) &&
    isFileRef(value.source) &&
    isFileRef(value.output)
  );
}

function verifyCompiledOutputReceipts(
  manifestPath: string,
  artifacts: readonly PrefixFileRef[],
  commands: readonly PrefixRecordedCommand[],
  records: ReadonlyMap<string, PrefixCommandRecord>,
  toolchain: PrefixToolchainBinding | undefined,
  reasons: MutableReasons,
  seenFiles: Set<string>,
): Map<string, CompiledOutputLink> {
  const compiled = new Map<string, CompiledOutputLink>();
  const receiptArtifacts = artifacts.filter((ref) =>
    /(?:^|[/\\])compiled-output\.json$/i.test(ref.path),
  );
  const commandByRef = new Map(
    commands
      .filter((command) => isFileRef(command.ref))
      .map(
        (command) => [refIdentity(command.ref, manifestPath), command] as const,
      ),
  );
  const artifactByIdentity = new Map<string, PrefixFileRef>();
  for (const artifact of artifacts) {
    const identity = refIdentity(artifact, manifestPath);
    if (!artifactByIdentity.has(identity))
      artifactByIdentity.set(identity, artifact);
  }
  const rustc =
    toolchain &&
    isRecord(toolchain.executables) &&
    isFileRef(toolchain.executables.rustc)
      ? toolchain.executables.rustc
      : undefined;
  const receiptCommandIds = new Set<string>();
  for (const receiptRef of receiptArtifacts) {
    const bytes = readRef(manifestPath, receiptRef, reasons, seenFiles);
    if (!bytes) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoder.decode(bytes));
    } catch {
      reasons.push(
        reason(
          "malformed-compiled-output",
          "A compiled-output receipt is not valid UTF-8 JSON.",
          receiptRef.path,
        ),
      );
      continue;
    }
    if (!isCompiledOutputReceipt(parsed)) {
      reasons.push(
        reason(
          "malformed-compiled-output",
          "A compiled-output receipt does not match the frozen envelope.",
          receiptRef.path,
        ),
      );
      continue;
    }
    const command = commandByRef.get(refIdentity(parsed.command, manifestPath));
    const commandId =
      command &&
      isRecord(command.record) &&
      isRecord(command.record.spec) &&
      typeof command.record.spec.id === "string"
        ? command.record.spec.id
        : undefined;
    const record = commandId ? records.get(commandId) : undefined;
    if (!command || !record) {
      reasons.push(
        reason(
          "compiled-output-command-mismatch",
          "A compiled-output receipt does not link to an inventoried command record.",
          receiptRef.path,
        ),
      );
      continue;
    }
    if (receiptCommandIds.has(record.spec.id)) {
      reasons.push(
        reason(
          "compiled-output-duplicate",
          `Command ${record.spec.id} has more than one compiled-output receipt.`,
          receiptRef.path,
        ),
      );
    }
    receiptCommandIds.add(record.spec.id);
    const outputIndex = record.spec.argv.indexOf("-o");
    const outputPath =
      outputIndex >= 0 ? record.spec.argv[outputIndex + 1] : undefined;
    const source = record.spec.inputs.find(
      (input) =>
        canonicalRefPath(input, manifestPath) ===
        canonicalRefPath(parsed.source, manifestPath),
    );
    const output =
      outputPath && isAbsolute(outputPath) ? resolve(outputPath) : undefined;
    const outputArtifact = artifactByIdentity.get(
      refIdentity(parsed.output, manifestPath),
    );
    if (
      (record.spec.operation !== "compile" &&
        record.spec.operation !== "client-positive") ||
      !successfulOutcome(record.outcome) ||
      !record.guard.ok ||
      !outputPath ||
      !output ||
      !source ||
      !rustc ||
      refIdentity(record.spec.executable, manifestPath) !==
        refIdentity(rustc, manifestPath) ||
      !record.spec.argv.some(
        (arg) =>
          arg === parsed.source.path ||
          resolve(arg) === resolve(parsed.source.path),
      ) ||
      !isCanonicalAbsolutePath(parsed.source.path) ||
      !isCanonicalAbsolutePath(parsed.output.path) ||
      output !== resolve(parsed.output.path) ||
      !outputArtifact
    ) {
      reasons.push(
        reason(
          "compiled-output-command-mismatch",
          `Compiled-output receipt ${record.spec.id} does not prove a successful qualified rustc output.`,
          receiptRef.path,
        ),
      );
      continue;
    }
    if (
      refIdentity(parsed.output, manifestPath) !==
      refIdentity(outputArtifact, manifestPath)
    ) {
      reasons.push(
        reason(
          "compiled-output-inventory-mismatch",
          `Compiled output ${record.spec.id} is not inventoried with the receipt's exact output identity.`,
          receiptRef.path,
        ),
      );
      continue;
    }
    const currentOutput = readRef(
      manifestPath,
      parsed.output,
      reasons,
      seenFiles,
    );
    if (!currentOutput) continue;
    if (
      resolve(record.spec.argv[outputIndex + 1]) !==
        resolve(parsed.output.path) ||
      hashBytes(currentOutput) !== parsed.output.sha256 ||
      currentOutput.byteLength !== parsed.output.bytes
    ) {
      reasons.push(
        reason(
          "compiled-output-hash-mismatch",
          `Compiled output ${record.spec.id} does not match its current produced binary.`,
          parsed.output.path,
        ),
      );
      continue;
    }
    const sidecarSource = readRef(
      manifestPath,
      parsed.source,
      reasons,
      seenFiles,
    );
    if (!sidecarSource) continue;
    const commandSource = readRef(manifestPath, source, reasons, seenFiles);
    if (
      !commandSource ||
      !source ||
      source.sha256 !== parsed.source.sha256 ||
      hashBytes(sidecarSource) !== hashBytes(commandSource) ||
      sidecarSource.byteLength !== commandSource.byteLength
    ) {
      reasons.push(
        reason(
          "compiled-output-source-mismatch",
          `Compiled output ${record.spec.id} does not retain the consumed authored source bytes.`,
          parsed.source.path,
        ),
      );
      continue;
    }
    compiled.set(resolve(parsed.output.path), {
      output: parsed.output,
      source: parsed.source,
    });
  }
  for (const record of records.values()) {
    const outputIndex = record.spec.argv.indexOf("-o");
    const produced =
      (record.spec.operation === "compile" ||
        record.spec.operation === "client-positive") &&
      outputIndex >= 0 &&
      isAbsolute(record.spec.argv[outputIndex + 1] ?? "");
    if (
      produced &&
      successfulOutcome(record.outcome) &&
      record.guard.ok &&
      !receiptCommandIds.has(record.spec.id)
    )
      reasons.push(
        reason(
          "compiled-output-missing",
          `Successful compile ${record.spec.id} has no compiled-output receipt.`,
        ),
      );
  }
  return compiled;
}

function verifyGeneratedBinaryLinks(
  manifestPath: string,
  attemptDirectory: string,
  records: ReadonlyMap<string, PrefixCommandRecord>,
  compiled: ReadonlyMap<string, CompiledOutputLink>,
  recipes: readonly PrefixRecipeExpectation[],
  reasons: MutableReasons,
): void {
  for (const record of records.values()) {
    const isTestRun =
      record.spec.operation === "tests-full" ||
      record.spec.operation === "tests-named";
    const isClientPositive = record.spec.operation === "client-positive";
    if (!isTestRun && !isClientPositive) continue;
    const recipe = recipes.find(
      (candidate) => candidate.id === record.spec.recipeId,
    );
    const outputIndex = record.spec.argv.indexOf("-o");
    if (isClientPositive && outputIndex >= 0) {
      const source = record.spec.inputs.find((ref) =>
        record.spec.argv.includes(ref.path),
      );
      const output = record.spec.argv[outputIndex + 1];
      const validCompileArgv =
        record.spec.argv.length === 9 &&
        record.spec.argv[0] === "--edition=2024" &&
        record.spec.argv[1] === "--crate-name" &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(record.spec.argv[2] ?? "") &&
        record.spec.argv[3] === "--crate-type" &&
        record.spec.argv[4] === "bin" &&
        record.spec.argv[5] === "--error-format=json" &&
        !!source &&
        record.spec.argv[6] === source.path &&
        outputIndex === 7 &&
        typeof output === "string" &&
        isAbsolute(output);
      if (!validCompileArgv)
        reasons.push(
          reason(
            "compiled-binary-command-mismatch",
            `Client-positive compile ${record.spec.id} has an unexpected operation argv.`,
          ),
        );
      continue;
    }
    const expectedArgv =
      record.spec.operation === "tests-full"
        ? ["--test-threads=1", "--nocapture"]
        : record.spec.operation === "tests-named" &&
            recipe?.testNames?.length === 1
          ? ["--exact", recipe.testNames[0], "--test-threads=1", "--nocapture"]
          : isClientPositive
            ? []
            : undefined;
    if (
      !expectedArgv ||
      stableStringify(record.spec.argv) !== stableStringify(expectedArgv)
    )
      reasons.push(
        reason(
          "compiled-binary-command-mismatch",
          `Binary command ${record.spec.id} has an unexpected operation argv.`,
        ),
      );
    const artifact = compiled.get(resolve(record.spec.executable.path));
    const source = recipe
      ? record.spec.inputs.find((ref) =>
          (() => {
            try {
              return (
                relativeSourceIdentity(attemptDirectory, ref.path) ===
                recipe.sourceId
              );
            } catch {
              return false;
            }
          })(),
        )
      : undefined;
    const reviewedSource = source?.sha256 === recipe?.sourceSha256;
    if (
      !artifact ||
      refIdentity(artifact.output, manifestPath) !==
        refIdentity(record.spec.executable, manifestPath) ||
      !source ||
      !reviewedSource ||
      canonicalRefPath(artifact.source, manifestPath) !==
        canonicalRefPath(source, manifestPath) ||
      artifact.source.sha256 !== source.sha256
    )
      reasons.push(
        reason(
          "compiled-binary-link-mismatch",
          `Binary command ${record.spec.id} is not linked to a successful compile output.`,
        ),
      );
  }
}

function verifyRecordClosure(
  manifestPath: string,
  record: PrefixCommandRecord,
  reasons: MutableReasons,
  seenFiles: Set<string>,
): void {
  const required: Array<{
    ref: PrefixFileRef;
    kind: "source" | "executable" | "external-input";
  }> = [];
  for (const ref of record.spec.inputs) required.push({ ref, kind: "source" });
  required.push({ ref: record.spec.executable, kind: "executable" });
  for (const ref of record.spec.externalInputs)
    required.push({ ref, kind: "external-input" });
  if (record.spec.toolchainBinding)
    required.push({ ref: record.spec.toolchainBinding, kind: "source" });
  const byPath = new Map<
    string,
    { ref: PrefixFileRef; kind: "source" | "executable" | "external-input" }
  >();
  for (const item of required) {
    const pathKey = canonicalRefPath(item.ref, manifestPath);
    const prior = byPath.get(pathKey);
    if (
      prior &&
      refIdentity(prior.ref, manifestPath) !==
        refIdentity(item.ref, manifestPath)
    )
      reasons.push(
        reason(
          "input-overlap-mismatch",
          `Input path ${item.ref.path} has conflicting hashes.`,
        ),
      );
    else if (prior && prior.kind !== item.kind)
      reasons.push(
        reason(
          "input-overlap-role-mismatch",
          `Input path ${item.ref.path} is used by incompatible archive roles.`,
        ),
      );
    else if (!prior) byPath.set(pathKey, item);
  }
  const beforeByPath = new Map<string, PrefixArchivedInput>();
  const afterByPath = new Map<string, PrefixArchivedInput>();
  for (const entry of record.before) {
    const pathKey = canonicalRefPath(entry.input, manifestPath);
    if (beforeByPath.has(pathKey))
      reasons.push(
        reason(
          "archive-inventory-mismatch",
          `Input ${entry.input.path} is archived more than once before execution.`,
        ),
      );
    beforeByPath.set(pathKey, entry);
  }
  for (const entry of record.after) {
    const pathKey = canonicalRefPath(entry.input, manifestPath);
    if (afterByPath.has(pathKey))
      reasons.push(
        reason(
          "archive-inventory-mismatch",
          `Input ${entry.input.path} is archived more than once after execution.`,
        ),
      );
    afterByPath.set(pathKey, entry);
  }
  for (const path of beforeByPath.keys())
    if (!byPath.has(path))
      reasons.push(
        reason(
          "archive-inventory-mismatch",
          `Unexpected before archive for ${path}.`,
        ),
      );
  for (const path of afterByPath.keys())
    if (!byPath.has(path))
      reasons.push(
        reason(
          "archive-inventory-mismatch",
          `Unexpected after archive for ${path}.`,
        ),
      );
  for (const [path, requiredInput] of byPath) {
    const before = beforeByPath.get(path);
    const after = afterByPath.get(path);
    if (!before || !after) {
      reasons.push(
        reason(
          "archive-inventory-mismatch",
          `Consumed input ${path} lacks a complete before/after archive.`,
        ),
      );
      continue;
    }
    const archiveBytes: Uint8Array[] = [];
    for (const archive of [before.archive, after.archive]) {
      const bytes = readRef(manifestPath, archive, reasons, seenFiles);
      if (!bytes) continue;
      archiveBytes.push(bytes);
      if (requiredInput.kind === "source") {
        const inputBytes = readRef(
          manifestPath,
          requiredInput.ref,
          reasons,
          seenFiles,
        );
        if (
          inputBytes &&
          (hashBytes(inputBytes) !== hashBytes(bytes) ||
            inputBytes.byteLength !== bytes.byteLength)
        )
          reasons.push(
            reason(
              "archive-content-mismatch",
              `Raw archive for ${path} differs from consumed bytes.`,
            ),
          );
      } else {
        try {
          const metadata = JSON.parse(decoder.decode(bytes));
          if (
            !isRecord(metadata) ||
            metadata.schema !== "initialized-prefix-input-hash-v1" ||
            metadata.kind !== requiredInput.kind ||
            !isFileRef(metadata.input) ||
            refIdentity(metadata.input, manifestPath) !==
              refIdentity(requiredInput.ref, manifestPath)
          )
            reasons.push(
              reason(
                "archive-metadata-mismatch",
                `Hash archive for ${path} does not retain exact input identity.`,
              ),
            );
        } catch {
          reasons.push(
            reason(
              "archive-metadata-mismatch",
              `Hash archive for ${path} is not valid metadata JSON.`,
            ),
          );
        }
      }
    }
    if (
      requiredInput.kind !== "source" &&
      archiveBytes.length === 2 &&
      (archiveBytes[0].byteLength !== archiveBytes[1].byteLength ||
        hashBytes(archiveBytes[0]) !== hashBytes(archiveBytes[1]))
    )
      reasons.push(
        reason(
          "archive-stability-mismatch",
          `Hash archive for ${path} changed between before and after execution.`,
        ),
      );
  }
}

function verifyRecipeEvidence(
  manifestPath: string,
  attemptDirectory: string,
  record: PrefixCommandRecord,
  expected: PrefixRecipeExpectation,
  reasons: MutableReasons,
  seen: Set<string>,
): void {
  if (!isRecipeExpectation(expected)) {
    reasons.push(
      reason(
        "malformed-recipe-expectation",
        "A reviewed recipe expectation has an invalid shape.",
      ),
    );
    return;
  }
  if (
    record.spec.mode !== expected.mode ||
    record.spec.operation !== expected.operation
  )
    reasons.push(
      reason(
        "recipe-identity-mismatch",
        `Command ${expected.id} has the wrong mode or operation.`,
      ),
    );
  if (record.spec.recipeId !== expected.id)
    reasons.push(
      reason(
        "recipe-identity-mismatch",
        `Command ${expected.id} has the wrong recipe identity.`,
      ),
    );
  if (!record.guard.ok || record.guard.reasons.length > 0)
    reasons.push(
      reason(
        "guard-failed",
        `Command ${expected.id} has a failed pre/post guard.`,
      ),
    );
  if (validateOutcome(record.outcome, reasons)) {
    reasons.push(...checkOutcome(record.outcome, expected.expectedExitCode));
  }
  const sourceCandidates = [
    ...record.spec.inputs,
    ...record.before.map((entry) => entry.input),
  ];
  const sourceRef = sourceCandidates.find((ref) =>
    (() => {
      try {
        return (
          relativeSourceIdentity(attemptDirectory, ref.path) ===
          expected.sourceId
        );
      } catch {
        return false;
      }
    })(),
  );
  const reviewedSourceRef = sourceCandidates.find(
    (ref) =>
      ref.sha256 === expected.sourceSha256 &&
      (() => {
        try {
          return (
            relativeSourceIdentity(attemptDirectory, ref.path) ===
            expected.sourceId
          );
        } catch {
          return false;
        }
      })(),
  );
  const sourceBytes = sourceRef
    ? readRef(manifestPath, sourceRef, reasons, seen)
    : undefined;
  const sourceBytesMatchReviewed =
    sourceBytes !== undefined &&
    hashBytes(sourceBytes) === expected.sourceSha256;
  const trustedSource =
    sourceRef !== undefined &&
    reviewedSourceRef !== undefined &&
    sourceRef.sha256 === expected.sourceSha256 &&
    sourceBytesMatchReviewed;
  if (!trustedSource)
    reasons.push(
      reason(
        "source-binding-mismatch",
        `Command ${expected.id} does not retain the reviewed source path, hash, and bytes.`,
      ),
    );
  if (
    expected.sourceId.length === 0 ||
    expected.sourceId.startsWith("/") ||
    expected.sourceId.split("/").some((part) => part === "..") ||
    expected.sourceId.includes("\\")
  )
    reasons.push(
      reason(
        "source-identity-mismatch",
        `Recipe ${expected.id} has a non-relative POSIX source identity.`,
      ),
    );
  const stdout =
    readRef(manifestPath, record.stdout, reasons, seen) ?? new Uint8Array();
  const stderr =
    readRef(manifestPath, record.stderr, reasons, seen) ?? new Uint8Array();
  const sourceFiles: Record<string, { path: string; bytes: Uint8Array }> = {};
  if (trustedSource && sourceRef && sourceBytes)
    sourceFiles[expected.sourceId] = {
      path: sourceRef.path,
      bytes: sourceBytes,
    };
  if (expected.diagnostic && trustedSource) {
    const classified = classifyInitializedPrefixDiagnostics({
      stdout,
      stderr,
      outcome: record.outcome,
      sourceFiles,
      expected,
    });
    reasons.push(...classified.reasons);
  }
  if (expected.miri && trustedSource) {
    const miriManifestIndex = record.spec.argv.indexOf("--manifest-path");
    const miriManifestPath =
      miriManifestIndex >= 0
        ? record.spec.argv[miriManifestIndex + 1]
        : undefined;
    const classified = classifyInitializedPrefixMiriInternal(
      {
        stdout,
        stderr,
        outcome: record.outcome,
        sourceFiles,
        expected,
      },
      record.spec.operation === "miri-ub" &&
        miriManifestPath &&
        reviewedSourceRef &&
        sourceRef
        ? {
            operation: record.spec.operation,
            argv: record.spec.argv,
            manifestPath: miriManifestPath,
            packageRoot: dirname(miriManifestPath),
            sourcePath: sourceRef.path,
          }
        : undefined,
    );
    reasons.push(...classified.reasons);
  }
  let output: string;
  try {
    output = `${decoder.decode(stdout)}\n${decoder.decode(stderr)}`;
  } catch {
    reasons.push(
      reason("invalid-utf8-output", "Recorded test output is not valid UTF-8."),
    );
    output = "";
  }
  const results = [
    ...output.matchAll(/^\s*test\s+(\S+)\s+\.\.\.\s+(ok|FAILED|ignored)\s*$/gm),
  ].map((match) => ({ name: match[1], status: match[2] }));
  const expectedNames = [
    ...new Set([
      ...(expected.testNames ?? []),
      ...(expected.intendedTest ? [expected.intendedTest] : []),
    ]),
  ];
  const expectedNameSet = new Set(expectedNames);
  const actualNameSet = new Set(results.map((result) => result.name));
  if (expectedNames.length > 0 && trustedSource) {
    const failedTestNames = new Set(
      results
        .filter((result) => result.status === "FAILED")
        .map((result) => result.name),
    );
    const classifiedTests = classifyInitializedPrefixLibtestOutputInternal(
      {
        output,
        failedTestNames,
        sourcePath: sourceRef?.path,
        sourceBytes:
          sourceRef && sourceFiles[expected.sourceId]
            ? sourceFiles[expected.sourceId].bytes
            : undefined,
        intendedFailure:
          expected.intendedAssertion && expected.intendedTest
            ? {
                testName: expected.intendedTest,
                message: expected.intendedAssertion.message,
                allowTooLongUnwrap:
                  expected.intendedAssertion.expression.includes(".unwrap()"),
              }
            : undefined,
      },
      record.spec.mode === "miri" && sourceRef
        ? (() => {
            const packageName = miriPackageNameForSource(expected.sourceId);
            return packageName ? { packageName } : undefined;
          })()
        : undefined,
    );
    for (const line of classifiedTests.reasons.map((entry) => entry.message))
      reasons.push(reason("unexpected-collateral", line));
  }
  if (
    results.length !== actualNameSet.size ||
    actualNameSet.size !== expectedNameSet.size
  )
    reasons.push(
      reason(
        "test-inventory-mismatch",
        "Recorded test results are duplicated or have the wrong cardinality.",
      ),
    );
  for (const testName of expectedNames)
    if (!actualNameSet.has(testName))
      reasons.push(
        reason(
          "test-identity-missing",
          `Expected test ${testName} is absent from the recorded result.`,
        ),
      );
  for (const result of results)
    if (!expectedNameSet.has(result.name))
      reasons.push(
        reason(
          "test-identity-extra",
          `Unexpected test ${result.name} appeared in the recorded result.`,
        ),
      );
  if (
    expectedNames.length >= 42 &&
    (results.length !== 42 ||
      (expected.expectedExitCode === 101
        ? !expected.intendedTest ||
          !results.some(
            (result) =>
              result.name === expected.intendedTest &&
              result.status === "FAILED",
          ) ||
          results.some(
            (result) => result.status !== "ok" && result.status !== "FAILED",
          )
        : results.some((result) => result.status !== "ok")) ||
      !/0\s+ignored/.test(output) ||
      !/0\s+filtered\s+out/.test(output))
  )
    reasons.push(
      reason(
        "test-inventory-mismatch",
        "The full suite did not prove exactly 42 successful named results with no ignored or filtered tests.",
      ),
    );
  if (expected.intendedTest) {
    const named = results.filter(
      (result) => result.name === expected.intendedTest,
    );
    if (named.length !== 1)
      reasons.push(
        reason(
          "intended-test-cardinality",
          "The intended named test did not produce exactly one result.",
        ),
      );
    else if (
      expected.intendedAssertion
        ? named[0].status !== "FAILED"
        : named[0].status !== "ok"
    )
      reasons.push(
        reason(
          "intended-test-status",
          "The intended named test has the wrong result status.",
        ),
      );
    if (expected.testNames?.length === 1) {
      if (
        !/41\s+filtered\s+out/.test(output) ||
        /0\s+filtered\s+out/.test(output) ||
        !/0\s+ignored/.test(output)
      )
        reasons.push(
          reason(
            "intended-test-cardinality",
            "A named run must select exactly one test from the reviewed 42-test binary.",
          ),
        );
    }
  }
  if (expected.intendedAssertion && trustedSource) {
    const assertionSlice = sourceBytes
      ? bytesAtRange(
          sourceBytes,
          expected.intendedAssertion.byteStart,
          expected.intendedAssertion.byteEnd,
        )
      : undefined;
    if (assertionSlice !== expected.intendedAssertion.expression)
      reasons.push(
        reason(
          "assertion-source-mismatch",
          "The intended assertion range is not the reviewed source bytes.",
        ),
      );
    const failureBlock = failureBlockForTest(
      output,
      expected.intendedTest ?? "",
    );
    if (!failureBlock.includes(expected.intendedAssertion.message))
      reasons.push(
        reason(
          "assertion-message-missing",
          "The authored assertion message is absent from the recorded failure.",
        ),
      );
    const assertionLocation = sourceBytes
      ? assertionMacroLocation(sourceBytes, expected.intendedAssertion)
      : undefined;
    const panicLocation = firstLocation(failureBlock);
    const actualPath = sourceRef?.path;
    if (
      !panicLocation ||
      panicLocation.path !== actualPath ||
      !assertionLocation ||
      panicLocation.line !== assertionLocation.line ||
      panicLocation.column !== assertionLocation.column
    )
      reasons.push(
        reason(
          "assertion-origin-mismatch",
          "The recorded panic location is not bound to the reviewed assertion source range.",
        ),
      );
  }
}

export function verifyInitializedPrefixEvidence(
  manifestPath: string,
  expected: PrefixObservedExpectations,
): PrefixVerificationResult {
  const reasons: MutableReasons = [];
  const seenFiles = new Set<string>();
  let manifest: PrefixProofManifest;
  try {
    if (!existsSync(manifestPath) || !lstatSync(manifestPath).isFile())
      throw new Error("missing");
    manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as PrefixProofManifest;
  } catch {
    return failure(
      reason(
        "missing-manifest",
        "Strict verification requires a readable proof manifest.",
      ),
    );
  }
  if (!isRecord(manifest))
    return failure(
      reason("malformed-manifest", "The proof manifest must be a JSON object."),
    );
  if (manifest.schema !== "initialized-prefix-proof-v1")
    reasons.push(
      reason("manifest-schema", "The proof manifest schema is not recognized."),
    );
  if (manifest.phase !== "strict")
    reasons.push(
      reason(
        "capture-not-strict",
        "Capture evidence cannot satisfy strict verification.",
      ),
    );
  if (!isObservedExpectations(expected))
    reasons.push(
      reason(
        "malformed-observations",
        "Reviewed observations have an invalid nested schema or are not root-reviewed.",
      ),
    );
  if (!isObservedExpectations(expected)) return failure(...reasons);
  activeRefPolicy = buildRefPolicy(manifestPath, manifest, expected, reasons);
  const manifestCommands = Array.isArray(manifest.commands)
    ? manifest.commands
    : [];
  const manifestArtifacts = Array.isArray(manifest.artifacts)
    ? manifest.artifacts
    : [];
  const manifestExpectedRecipes = Array.isArray(manifest.expectedRecipes)
    ? manifest.expectedRecipes
    : [];
  const manifestRefs = collectRefs(manifest);
  for (const ref of manifestRefs)
    readRef(manifestPath, ref, reasons, seenFiles, false);
  for (const ref of expected.adjudication.provenance)
    readRef(manifestPath, ref, reasons, seenFiles, false);
  if (
    !manifest.attemptDirectory ||
    manifestCommands.length === 0 ||
    manifestArtifacts.length === 0 ||
    manifestExpectedRecipes.length === 0
  )
    reasons.push(
      reason(
        "empty-evidence",
        "Strict verification requires a non-empty complete attempt inventory.",
      ),
    );
  const expectedIds = (expected.recipes ?? []).map((recipe) => recipe.id);
  if (
    new Set(expectedIds).size !== expectedIds.length ||
    stableStringify([...manifestExpectedRecipes].sort()) !==
      stableStringify([...expectedIds].sort())
  )
    reasons.push(
      reason(
        "recipe-inventory-mismatch",
        "The manifest recipe inventory does not equal the reviewed fixed inventory.",
      ),
    );
  const expectedSourceKeys = Object.keys(expected.sourceBindings ?? {}).sort();
  const manifestSourceKeys = Object.keys(manifest.sourceBindings ?? {}).sort();
  if (
    stableStringify(expectedSourceKeys) !== stableStringify(manifestSourceKeys)
  )
    reasons.push(
      reason(
        "source-binding-mismatch",
        "Manifest source binding inventory differs from reviewed evidence.",
      ),
    );
  for (const [sourceId, sourceHash] of Object.entries(
    expected.sourceBindings ?? {},
  ))
    if (manifest.sourceBindings?.[sourceId] !== sourceHash)
      reasons.push(
        reason(
          "source-binding-mismatch",
          `Manifest source binding for ${sourceId} differs from reviewed evidence.`,
        ),
      );
  const ids = new Set<string>();
  const records = new Map<string, PrefixCommandRecord>();
  const metadataRecords = new Map<string, PrefixCommandRecord>();
  for (const command of manifestCommands) {
    const record = verifyRecord(manifestPath, command, reasons, seenFiles);
    if (!record) continue;
    if (ids.has(record.spec.id))
      reasons.push(
        reason(
          "duplicate-command",
          `Command ${record.spec.id} appears more than once.`,
        ),
      );
    ids.add(record.spec.id);
    records.set(record.spec.id, record);
  }
  for (const recipe of expected.recipes ?? []) {
    const record = records.get(recipe.id);
    if (!record)
      reasons.push(
        reason(
          "missing-command",
          `Reviewed recipe ${recipe.id} has no recorded command.`,
        ),
      );
    else
      verifyRecipeEvidence(
        manifestPath,
        manifest.attemptDirectory,
        record,
        recipe,
        reasons,
        seenFiles,
      );
  }
  const toolchain = manifest.toolchain;
  if (
    !isRecord(toolchain) ||
    typeof toolchain.name !== "string" ||
    typeof toolchain.rustupHome !== "string" ||
    !isRecord(toolchain.executables) ||
    Object.keys(toolchain.executables).length === 0 ||
    !isRecord(toolchain.versions) ||
    Object.keys(toolchain.versions).length === 0 ||
    !isFileRef(toolchain.config) ||
    !isFileRef(toolchain.ref)
  )
    reasons.push(
      reason(
        "toolchain-closure-incomplete",
        "Toolchain executable, version, config, or binding closure is incomplete.",
      ),
    );
  else {
    for (const ref of Object.values(toolchain.executables))
      readRef(manifestPath, ref, reasons, seenFiles, false);
    readRef(manifestPath, toolchain.config, reasons, seenFiles, false);
    verifyToolchainRef(manifestPath, toolchain, reasons);
    for (const version of Object.values(toolchain.versions)) {
      const versionRecord = verifyRecord(
        manifestPath,
        version,
        reasons,
        seenFiles,
      );
      if (versionRecord)
        metadataRecords.set(versionRecord.spec.id, versionRecord);
    }
    if (
      toolchain.sysroot &&
      (!isRecord(toolchain.sysroot) ||
        typeof toolchain.sysroot.root !== "string" ||
        !isFileRef(toolchain.sysroot.manifest) ||
        !Array.isArray(toolchain.sysroot.files) ||
        !toolchain.sysroot.files.every(isFileRef))
    )
      reasons.push(
        reason(
          "toolchain-closure-incomplete",
          "The sysroot closure has an invalid shape.",
        ),
      );
    if (
      toolchain.sysroot &&
      isRecord(toolchain.sysroot) &&
      isFileRef(toolchain.sysroot.manifest) &&
      Array.isArray(toolchain.sysroot.files)
    ) {
      readRef(
        manifestPath,
        toolchain.sysroot.manifest,
        reasons,
        seenFiles,
        false,
      );
      for (const file of toolchain.sysroot.files)
        readRef(manifestPath, file, reasons, seenFiles, false);
    }
    const kind = expected.toolchainKinds?.[manifest.mode];
    if (
      !kind ||
      !kind.name ||
      !kind.release ||
      !kind.channel ||
      toolchain.name !== kind.name
    )
      reasons.push(
        reason(
          "toolchain-identity-mismatch",
          "The selected toolchain is not the reviewed release/channel identity.",
        ),
      );
    const sysrootFiles =
      isRecord(toolchain.sysroot) && Array.isArray(toolchain.sysroot.files)
        ? toolchain.sysroot.files
        : [];
    if (manifest.mode === "miri" && sysrootFiles.length === 0)
      reasons.push(
        reason(
          "miri-sysroot-incomplete",
          "Miri strict verification requires a complete prequalified sysroot closure.",
        ),
      );
    const qualification = verifyQualificationEvidence(
      manifestPath,
      manifest.mode,
      toolchain,
      metadataRecords,
      reasons,
      seenFiles,
    );
    const versionContains = qualification?.versionContains;
    const lookupNames = ["rustc", "rustdoc", "cargo"];
    for (const name of lookupNames)
      if (!isRecord(toolchain.versions[`lookup-${name}`]))
        reasons.push(
          reason(
            "missing-toolchain-version",
            `Toolchain metadata command lookup-${name} is missing from the qualification inventory.`,
          ),
        );
    for (const name of Object.keys(toolchain.executables))
      if (!isRecord(toolchain.versions[`version-${name}`]))
        reasons.push(
          reason(
            "missing-toolchain-version",
            `Toolchain metadata command version-${name} is missing from the qualification inventory.`,
          ),
        );
    if (
      manifest.mode === "miri" &&
      (kind?.distributionDate !== "2026-08-08" ||
        !/^nightly-2026-08-08$/.test(toolchain.name))
    )
      reasons.push(
        reason(
          "toolchain-identity-mismatch",
          "Miri strict verification requires the pinned nightly-2026-08-08 distribution.",
        ),
      );
    if (
      manifest.mode === "msrv" &&
      (toolchain.name !== "1.85.0" || kind?.release !== "1.85.0")
    )
      reasons.push(
        reason(
          "toolchain-identity-mismatch",
          "MSRV strict verification requires the exact 1.85.0 toolchain.",
        ),
      );
    if (
      manifest.mode === "stable" &&
      (!kind || !/^\d+\.\d+\.\d+$/.test(kind.release))
    )
      reasons.push(
        reason(
          "toolchain-identity-mismatch",
          "Stable strict verification requires a plain semver release identity.",
        ),
      );
    for (const [versionId, recorded] of Object.entries(toolchain.versions)) {
      if (
        !isRecord(recorded) ||
        !isRecord(recorded.record) ||
        !isRecord(recorded.record.spec) ||
        typeof recorded.record.spec.id !== "string"
      ) {
        reasons.push(
          reason(
            "malformed-toolchain-version",
            `Version command ${versionId} has an invalid recorded shape.`,
          ),
        );
        continue;
      }
      const version = metadataRecords.get(recorded.record.spec.id);
      if (!version) {
        reasons.push(
          reason(
            "missing-toolchain-version",
            `Version record ${versionId} is missing from the command inventory.`,
          ),
        );
        continue;
      }
      const name = versionId.replace(/^(?:lookup|version)-/, "");
      const isLookup = versionId.startsWith("lookup-");
      const expectedArgv = isLookup
        ? ["which", "--toolchain", toolchain.name, name]
        : name === "cargo-miri"
          ? ["miri", "--version"]
          : name === "rustc" || name === "rustdoc" || name === "cargo"
            ? ["--version", "--verbose"]
            : ["--version"];
      let stdoutText = "";
      try {
        const stdout = readRef(
          manifestPath,
          version.stdout,
          reasons,
          seenFiles,
        );
        const stderr = readRef(
          manifestPath,
          version.stderr,
          reasons,
          seenFiles,
        );
        if (!stdout || !stderr) throw new Error("missing output");
        stdoutText = decoder.decode(stdout);
        decoder.decode(stderr);
      } catch {
        reasons.push(
          reason(
            "toolchain-version-mismatch",
            `Toolchain metadata output ${versionId} is unreadable or invalid UTF-8.`,
          ),
        );
      }
      const outputLine = stdoutText
        .split(/\r?\n/)
        .find((line) => line.trim().length > 0)
        ?.trim();
      const prefix = isLookup ? "" : `${name} `;
      const expectedStdout =
        !isLookup &&
        versionContains &&
        typeof versionContains[name] === "string"
          ? versionContains[name]
          : undefined;
      const exactStdout =
        !isLookup &&
        expectedStdout !== undefined &&
        stdoutText.trim() === expectedStdout.trim();
      const requiresExactMiriBranding =
        manifest.mode === "miri" && (name === "cargo-miri" || name === "miri");
      const expectedExecutable = isRecord(toolchain.executables)
        ? toolchain.executables[isLookup ? "rustup" : name]
        : undefined;
      const executableIdentity = isFileRef(expectedExecutable)
        ? refIdentity(version.spec.executable, manifestPath) ===
          refIdentity(expectedExecutable, manifestPath)
        : false;
      const stablePlain =
        manifest.mode !== "stable" ||
        (name !== "rustc" && name !== "rustdoc" && name !== "cargo") ||
        (outputLine?.startsWith(`${name} `) === true &&
          /^\d+\.\d+\.\d+(?:\s|$)/u.test(outputLine.slice(name.length + 1)));
      const miriCommitDate =
        manifest.mode === "miri" && name === "rustc"
          ? /^commit-date:\s*(\d{4}-\d{2}-\d{2})\s*$/m.exec(stdoutText)?.[1]
          : undefined;
      const miriCommitDateOk =
        manifest.mode !== "miri" ||
        name !== "rustc" ||
        (miriCommitDate !== undefined &&
          miriCommitDate === qualification?.compilerCommitDate);
      if (
        version.spec.operation !==
          (isLookup ? "tool-locate" : "tool-version") ||
        version.spec.recipeId !==
          `toolchain-${toolchain.name}-${isLookup ? "lookup" : "version"}-${name}` ||
        stableStringify(version.spec.argv) !== stableStringify(expectedArgv) ||
        !successfulOutcome(version.outcome) ||
        !version.guard.ok ||
        !executableIdentity ||
        (isLookup
          ? !outputLine ||
            !isAbsolute(outputLine) ||
            !isRecord(toolchain.executables) ||
            !isFileRef(toolchain.executables[name]) ||
            resolve(outputLine) !== resolve(toolchain.executables[name].path)
          : (!requiresExactMiriBranding && !outputLine?.startsWith(prefix)) ||
            !exactStdout ||
            !stablePlain ||
            !miriCommitDateOk)
      )
        reasons.push(
          reason(
            "toolchain-version-mismatch",
            `Toolchain metadata command ${versionId} does not match its fixed operation, argv, outcome, or output shape.`,
          ),
        );
    }
  }
  const metadataIds = [...metadataRecords.keys()];
  const allowedCommandIds = new Set([...expectedIds, ...metadataIds]);
  if (
    ids.size !== allowedCommandIds.size ||
    [...allowedCommandIds].some((id) => !ids.has(id))
  )
    reasons.push(
      reason(
        "command-inventory-mismatch",
        "Manifest commands do not equal target recipes plus retained metadata commands.",
      ),
    );
  for (const id of ids)
    if (!allowedCommandIds.has(id))
      reasons.push(
        reason(
          "unexpected-command",
          `Command ${id} is not in the fixed recipe or metadata inventory.`,
        ),
      );
  if (isRecord(manifest.toolchain) && isFileRef(manifest.toolchain.ref))
    for (const record of records.values()) {
      const qualifiedExecutables = isRecord(manifest.toolchain.executables)
        ? Object.values(manifest.toolchain.executables).filter(isFileRef)
        : [];
      const qualifiedEnv = isRecord(manifest.toolchain.env)
        ? Object.fromEntries(
            Object.entries(manifest.toolchain.env).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
          )
        : {};
      if (
        !record.spec.cwd ||
        !record.spec.executable.path ||
        Object.values(record.spec.env).some(
          (value) => typeof value !== "string",
        )
      )
        reasons.push(
          reason(
            "command-closure-incomplete",
            `Command ${record.spec.id} lacks a complete cwd/executable/environment closure.`,
          ),
        );
      try {
        if (
          !isAbsolute(record.spec.cwd) ||
          realpathSync(record.spec.cwd) !==
            realpathSync(resolve(manifest.attemptDirectory))
        )
          reasons.push(
            reason(
              "command-cwd-mismatch",
              `Command ${record.spec.id} does not run at the attempt root.`,
            ),
          );
      } catch {
        reasons.push(
          reason(
            "command-cwd-mismatch",
            `Command ${record.spec.id} has an unreadable attempt-root cwd.`,
          ),
        );
      }
      if (!hasExactEnvironment(record.spec, qualifiedEnv))
        reasons.push(
          reason(
            "command-environment-mismatch",
            `Command ${record.spec.id} does not retain the qualified environment.`,
          ),
        );
      const invokesQualifiedTool =
        record.spec.argv.includes("-o") ||
        record.spec.operation === "tool-locate" ||
        record.spec.operation === "tool-version" ||
        record.spec.operation === "miri-positive" ||
        record.spec.operation === "miri-ub" ||
        record.spec.operation === "miri-sound";
      if (
        invokesQualifiedTool &&
        !qualifiedExecutables.some((ref) =>
          hasRef([record.spec.executable], ref, manifestPath),
        )
      )
        reasons.push(
          reason(
            "command-executable-mismatch",
            `Command ${record.spec.id} does not consume a qualified tool executable.`,
          ),
        );
      const requiresBinding = !metadataRecords.has(record.spec.id);
      if (
        !hasRef(record.spec.inputs, manifest.toolchain.config, manifestPath) ||
        (requiresBinding &&
          (!record.spec.toolchainBinding ||
            refIdentity(record.spec.toolchainBinding, manifestPath) !==
              refIdentity(manifest.toolchain.ref, manifestPath) ||
            !hasRef(record.spec.inputs, manifest.toolchain.ref, manifestPath)))
      )
        reasons.push(
          reason(
            "toolchain-binding-mismatch",
            `Command ${record.spec.id} does not consume the qualified binding and config files.`,
          ),
        );
      const metadataLimits = metadataRecords.has(record.spec.id);
      const timeoutValid = metadataLimits
        ? record.spec.timeoutMs === 30_000
        : Number.isSafeInteger(record.spec.timeoutMs) &&
          (record.spec.timeoutMs ?? 0) > 0 &&
          (record.spec.timeoutMs ?? 0) <= 180_000;
      const streamLimitValid =
        record.spec.maxBytesPerStream === 4 * 1024 * 1024;
      if (!timeoutValid || !streamLimitValid)
        reasons.push(
          reason(
            "command-limit-mismatch",
            metadataLimits
              ? `Metadata command ${record.spec.id} must use 30 seconds/4 MiB bounds.`
              : `Target command ${record.spec.id} must use a positive timeout up to 180 seconds and 4 MiB bounds.`,
          ),
        );
      const expectedRecipe = (expected.recipes ?? []).find(
        (recipe) => recipe.id === record.spec.recipeId,
      );
      const expectedSourceRef = expectedRecipe
        ? record.spec.inputs.find((ref) =>
            (() => {
              try {
                return (
                  relativeSourceIdentity(
                    manifest.attemptDirectory,
                    ref.path,
                  ) === expectedRecipe.sourceId
                );
              } catch {
                return false;
              }
            })(),
          )
        : undefined;
      if (
        expectedRecipe &&
        !hasOperationSource(record.spec, expectedRecipe, expectedSourceRef)
      )
        reasons.push(
          reason(
            "command-argv-mismatch",
            `Command ${record.spec.id} does not bind argv and source to its reviewed recipe.`,
          ),
        );
    }
  for (const artifact of manifestArtifacts)
    readRef(manifestPath, artifact, reasons, seenFiles, false);
  const compiled = verifyCompiledOutputReceipts(
    manifestPath,
    manifestArtifacts.filter(isFileRef),
    manifestCommands.filter(isRecord) as unknown as PrefixRecordedCommand[],
    records,
    isRecord(manifest.toolchain)
      ? (manifest.toolchain as PrefixToolchainBinding)
      : undefined,
    reasons,
    seenFiles,
  );
  verifyGeneratedBinaryLinks(
    manifestPath,
    manifest.attemptDirectory,
    records,
    compiled,
    expected.recipes,
    reasons,
  );
  const root =
    typeof manifest.attemptDirectory === "string" &&
    existsSync(resolve(manifest.attemptDirectory))
      ? realpathSync(resolve(manifest.attemptDirectory))
      : dirname(resolve(manifestPath));
  if (!isWithin(root, realpathSync(resolve(manifestPath))))
    reasons.push(
      reason(
        "attempt-directory-mismatch",
        "The proof manifest is outside its canonical attempt directory.",
      ),
    );
  const referenced = new Set(
    manifestRefs.map((ref) => policyPath(resolveRef(manifestPath, ref))),
  );
  for (const file of walkFiles(root))
    if (
      policyPath(file) !== policyPath(manifestPath) &&
      !referenced.has(policyPath(file)) &&
      !relative(root, file).startsWith(".control/") &&
      basename(file) !== "control-rebind-receipt.json"
    )
      reasons.push(
        reason(
          "unindexed-artifact",
          "An evidence file is not present in the manifest inventory.",
          relative(root, file),
        ),
      );
  return reasons.length === 0 ? success() : failure(...reasons);
}

export function loadInitializedPrefixObservedExpectations(
  mode?: PrefixMode,
): PrefixObservedExpectations | undefined {
  return mode === undefined
    ? undefined
    : readInitializedPrefixObservedExpectations(mode);
}

function updateAllFileRefs(
  value: unknown,
  pathToHash: Map<string, PrefixFileRef>,
  manifestPath: string,
): void {
  if (isFileRef(value)) {
    const key = policyPath(resolveRef(manifestPath, value));
    const replacement =
      pathToHash.get(key) ?? pathToHash.get(resolveRef(manifestPath, value));
    if (replacement) {
      value.bytes = replacement.bytes;
      value.sha256 = replacement.sha256;
    }
    return;
  }
  if (Array.isArray(value))
    for (const child of value)
      updateAllFileRefs(child, pathToHash, manifestPath);
  else if (isRecord(value))
    for (const child of Object.values(value))
      updateAllFileRefs(child, pathToHash, manifestPath);
}

function refreshTamperHashes(
  root: string,
  manifestPath: string,
  manifest: Record<string, unknown>,
): void {
  const externalPaths = declaredExternalPaths(manifestPath, manifest);
  const graph = structuredJsonGraph(root, manifestPath, manifest);
  const structuredInputs = new Set(graph.nodes);
  structuredInputs.delete(policyPath(manifestPath));
  const finalized = new Set<string>();
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  const commandPaths = new Set(
    commands.flatMap((entry) =>
      isRecord(entry) && isFileRef(entry.ref)
        ? [policyPath(resolveRef(manifestPath, entry.ref))]
        : [],
    ),
  );
  const map = new Map<string, PrefixFileRef>();
  for (const ref of collectRefs(manifest)) {
    const path = resolveRef(manifestPath, ref);
    const key = policyPath(path);
    if (map.has(key)) continue;
    try {
      const bytes = readFileSync(path);
      map.set(key, {
        path: ref.path,
        bytes: bytes.byteLength,
        sha256: hashBytes(bytes),
      });
    } catch {
      // The verifier reports missing files for intentionally broken controls.
    }
  }
  for (const path of graph.order) {
    if (
      path === policyPath(manifestPath) ||
      externalPaths.has(policyPath(path))
    )
      continue;
    if (!containedPath(root, path))
      throw new Error(
        `structured refresh escaped retained evidence root: ${path}`,
      );
    let onDisk: unknown;
    try {
      onDisk = JSON.parse(readFileSync(path, "utf8")) as unknown;
    } catch (error) {
      throw new Error(
        `structured refresh parse failed at ${path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    try {
      updateAllFileRefs(onDisk, map, manifestPath);
      if (commandPaths.has(policyPath(path))) {
        if (!isRecord(onDisk))
          throw new Error(
            "malformed inventoried command during archive refresh",
          );
        const rebuilt = rebuildOwnedArchivedInputRecord(
          root,
          manifestPath,
          onDisk,
          externalPaths,
          manifestPath,
          { paths: structuredInputs, finalized },
        );
        for (const ref of rebuilt)
          map.set(policyPath(resolveRef(manifestPath, ref)), ref);
        updateAllFileRefs(onDisk, map, manifestPath);
      }
      const serialized = `${JSON.stringify(onDisk, null, 2)}\n`;
      writeContained(root, path, serialized);
      const prior = map.get(policyPath(path));
      if (prior)
        map.set(policyPath(path), {
          path: prior.path,
          bytes: encoder.encode(serialized).byteLength,
          sha256: hashBytes(encoder.encode(serialized)),
        });
      finalized.add(policyPath(path));
    } catch (error) {
      throw new Error(
        `structured refresh transform failed at ${path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  updateAllFileRefs(manifest, map, manifestPath);
  writeContained(root, manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function canonicalRoot(root: string): string {
  return realpathSync(root);
}

function containedPath(root: string, candidate: string): string | undefined {
  const rootReal = canonicalRoot(root);
  const absolute = resolve(candidate);
  const existing = existsSync(absolute) ? realpathSync(absolute) : absolute;
  if (existing === rootReal || existing.startsWith(`${rootReal}/`))
    return existing;
  return undefined;
}

function writeContained(
  root: string,
  path: string,
  bytes: Uint8Array | string,
): void {
  const parent = dirname(path);
  if (
    !containedPath(root, parent) ||
    (existsSync(path) && !containedPath(root, path))
  )
    throw new Error(`tamper write escaped retained evidence root: ${path}`);
  writeFileSync(path, bytes);
}

function fileInventory(root: string): Map<string, string> {
  const result = new Map<string, string>();
  const inspectSymlinks = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error(`evidence symlink is not allowed: ${path}`);
      if (entry.isDirectory()) inspectSymlinks(path);
    }
  };
  inspectSymlinks(root);
  for (const path of walkFiles(root)) {
    const safe = containedPath(root, path);
    if (!safe) throw new Error(`evidence symlink escaped root: ${path}`);
    result.set(relative(root, safe), hashBytes(readFileSync(safe)));
  }
  return result;
}

function metadataInputRefs(manifest: Record<string, unknown>): PrefixFileRef[] {
  const refs: PrefixFileRef[] = [];
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isRecord(entry.record)) continue;
    const spec = isRecord(entry.record.spec) ? entry.record.spec : undefined;
    if (
      !spec ||
      (spec.operation !== "tool-locate" && spec.operation !== "tool-version") ||
      !Array.isArray(spec.inputs)
    )
      continue;
    for (const input of spec.inputs) if (isFileRef(input)) refs.push(input);
  }
  return refs;
}

function qualificationInputRefs(
  manifestPath: string,
  manifest: Record<string, unknown>,
): PrefixFileRef[] {
  return metadataInputRefs(manifest).filter((input) => {
    try {
      const value = JSON.parse(
        decoder.decode(readFileSync(resolveRef(manifestPath, input))),
      ) as unknown;
      return (
        isRecord(value) &&
        value.schema === "initialized-prefix-toolchain-qualification-v1"
      );
    } catch {
      return false;
    }
  });
}

function qualificationInputPaths(
  manifestPath: string,
  manifest: Record<string, unknown>,
): Set<string> {
  const paths = new Set<string>();
  for (const input of metadataInputRefs(manifest)) {
    try {
      const value = JSON.parse(
        decoder.decode(readFileSync(resolveRef(manifestPath, input))),
      ) as unknown;
      if (
        isRecord(value) &&
        value.schema === "initialized-prefix-toolchain-qualification-v1"
      )
        paths.add(canonicalRefPath(input, manifestPath));
    } catch {
      // Verification reports missing, malformed, or duplicate qualification inputs.
    }
  }
  return paths;
}

function externalConfigTwinPaths(
  manifestPath: string,
  manifest: Record<string, unknown>,
): Set<string> {
  const paths = new Set<string>();
  const toolchain = isRecord(manifest.toolchain)
    ? manifest.toolchain
    : undefined;
  const config =
    toolchain && isFileRef(toolchain.config) ? toolchain.config : undefined;
  if (!config) return paths;
  const configIdentity = refIdentity(config, manifestPath);
  for (const input of metadataInputRefs(manifest)) {
    if (
      input.bytes === config.bytes &&
      input.sha256.toLowerCase() === config.sha256.toLowerCase() &&
      refIdentity(input, manifestPath) !== configIdentity
    )
      paths.add(canonicalRefPath(input, manifestPath));
  }
  return paths;
}

function externalConfigTwinRefs(
  manifestPath: string,
  manifest: Record<string, unknown>,
): PrefixFileRef[] {
  const refs: PrefixFileRef[] = [];
  const toolchain = isRecord(manifest.toolchain)
    ? manifest.toolchain
    : undefined;
  const config =
    toolchain && isFileRef(toolchain.config) ? toolchain.config : undefined;
  if (!config) return refs;
  const configIdentity = refIdentity(config, manifestPath);
  for (const input of metadataInputRefs(manifest)) {
    if (
      input.bytes === config.bytes &&
      input.sha256.toLowerCase() === config.sha256.toLowerCase() &&
      refIdentity(input, manifestPath) !== configIdentity
    )
      refs.push(input);
  }
  return refs;
}

function declaredExternalRefs(
  manifestPath: string,
  manifest: Record<string, unknown>,
): PrefixFileRef[] {
  const refs: PrefixFileRef[] = [];
  const seen = new Set<string>();
  const add = (value: unknown): void => {
    if (!isFileRef(value)) return;
    const identity = `${value.path}\u0000${canonicalRefPath(
      value,
      manifestPath,
    )}\u0000${value.bytes}\u0000${value.sha256}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    refs.push(value);
  };
  const toolchain = isRecord(manifest.toolchain)
    ? manifest.toolchain
    : undefined;
  if (toolchain && isRecord(toolchain.executables))
    for (const ref of Object.values(toolchain.executables)) add(ref);
  if (
    toolchain &&
    isRecord(toolchain.sysroot) &&
    isFileRef(toolchain.sysroot.manifest) &&
    Array.isArray(toolchain.sysroot.files)
  ) {
    add(toolchain.sysroot.manifest);
    for (const ref of toolchain.sysroot.files) add(ref);
  }
  for (const ref of qualificationInputRefs(manifestPath, manifest)) add(ref);
  for (const ref of externalConfigTwinRefs(manifestPath, manifest)) add(ref);
  const qualifiedTools = new Set<string>();
  if (toolchain && isRecord(toolchain.executables))
    for (const ref of Object.values(toolchain.executables))
      if (isFileRef(ref))
        qualifiedTools.add(canonicalRefPath(ref, manifestPath));
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isRecord(entry.record)) continue;
    const spec = isRecord(entry.record.spec) ? entry.record.spec : undefined;
    if (!spec) continue;
    if (Array.isArray(spec.externalInputs))
      for (const ref of spec.externalInputs) add(ref);
    if (isFileRef(spec.executable)) {
      const executableKey = canonicalRefPath(spec.executable, manifestPath);
      if (qualifiedTools.has(executableKey)) add(spec.executable);
    }
  }
  return refs;
}

function declaredExternalPaths(
  manifestPath: string,
  manifest: Record<string, unknown>,
): Set<string> {
  return new Set(
    declaredExternalRefs(manifestPath, manifest).map((ref) =>
      canonicalRefPath(ref, manifestPath),
    ),
  );
}

interface StructuredRebaseContext {
  originalRoot: string;
  copiedRoot: string;
  externalPaths: ReadonlySet<string>;
}

function successfulProducerSidecarRefs(
  manifestPath: string,
  manifest: Record<string, unknown>,
): PrefixFileRef[] {
  const artifacts = Array.isArray(manifest.artifacts)
    ? manifest.artifacts.filter(isFileRef)
    : [];
  const sidecarByCanonicalPath = new Map<string, PrefixFileRef>();
  for (const artifact of artifacts) {
    const key = policyPath(resolveRef(manifestPath, artifact));
    if (!sidecarByCanonicalPath.has(key))
      sidecarByCanonicalPath.set(key, artifact);
  }
  const sidecars: PrefixFileRef[] = [];
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isFileRef(entry.ref) || !isRecord(entry.record))
      continue;
    const spec = isRecord(entry.record.spec) ? entry.record.spec : undefined;
    const outcome = entry.record.outcome;
    if (
      !spec ||
      (spec.operation !== "compile" && spec.operation !== "client-positive") ||
      !isPrefixOutcome(outcome) ||
      !successfulOutcome(outcome)
    )
      continue;
    const sidecarPath = join(
      dirname(resolveRef(manifestPath, entry.ref)),
      "compiled-output.json",
    );
    const sidecar = sidecarByCanonicalPath.get(policyPath(sidecarPath));
    if (sidecar) sidecars.push(sidecar);
  }
  return sidecars;
}

function structuredNodeInventory(
  root: string,
  manifestPath: string,
  manifest: Record<string, unknown>,
  rebase?: StructuredRebaseContext,
): Set<string> {
  const manifestKey = policyPath(manifestPath);
  const nodes = new Set<string>([manifestKey]);
  const pending: string[] = [manifestKey];
  const add = (ref: unknown, role: string): void => {
    if (!isFileRef(ref))
      throw new Error(`malformed ${role} structured reference`);
    const path = resolveRef(manifestPath, ref);
    if (!containedPath(root, path))
      throw new Error(
        `structured ${role} escaped retained evidence root: ${path}`,
      );
    const key = policyPath(path);
    if (!nodes.has(key)) {
      nodes.add(key);
      pending.push(key);
    }
  };
  const toolchain = isRecord(manifest.toolchain)
    ? manifest.toolchain
    : undefined;
  if (!toolchain || !isFileRef(toolchain.ref))
    throw new Error("malformed toolchain binding structured reference");
  add(toolchain.ref, "toolchain binding");
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isFileRef(entry.ref))
      throw new Error("malformed command record structured reference");
    add(entry.ref, "command record");
  }
  for (const sidecar of successfulProducerSidecarRefs(manifestPath, manifest))
    add(sidecar, "compiled-output sidecar");
  const toolchainPath = policyPath(resolveRef(manifestPath, toolchain.ref));
  while (pending.length > 0) {
    const key = pending.shift() as string;
    if (key === manifestKey) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(key, "utf8"));
    } catch (error) {
      throw new Error(
        `structured retained JSON parse failed at ${key}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (rebase)
      rewriteInternalRefs(
        parsed,
        rebase.originalRoot,
        rebase.copiedRoot,
        rebase.externalPaths,
      );
    if (key !== toolchainPath) continue;
    if (!isRecord(parsed) || !isRecord(parsed.versions))
      throw new Error(`malformed toolchain binding structured node at ${key}`);
    for (const entry of Object.values(parsed.versions)) {
      if (!isRecord(entry) || !isFileRef(entry.ref))
        throw new Error(
          `malformed toolchain command structured reference at ${key}`,
        );
      add(entry.ref, "toolchain command record");
    }
  }
  return nodes;
}

function structuredJsonGraph(
  root: string,
  manifestPath: string,
  manifest: Record<string, unknown>,
  rebase?: StructuredRebaseContext,
): { order: string[]; nodes: ReadonlySet<string> } {
  const rootPath = policyPath(root);
  const manifestKey = policyPath(manifestPath);
  const structuredNodes = structuredNodeInventory(
    root,
    manifestPath,
    manifest,
    rebase,
  );
  const states = new Map<string, "visiting" | "visited">();
  const order: string[] = [];
  const visit = (path: string, value?: unknown): void => {
    const key = policyPath(path);
    const prior = states.get(key);
    if (prior === "visiting")
      throw new Error(`cyclic retained JSON ref graph at ${path}`);
    if (prior === "visited") return;
    states.set(key, "visiting");
    let parsed = value;
    if (parsed === undefined && key !== manifestKey) {
      try {
        parsed = JSON.parse(readFileSync(path, "utf8"));
      } catch (error) {
        throw new Error(
          `structured retained JSON parse failed at ${path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    if (rebase)
      rewriteInternalRefs(
        parsed,
        rebase.originalRoot,
        rebase.copiedRoot,
        rebase.externalPaths,
      );
    for (const ref of collectRefs(parsed)) {
      const child = resolveRef(manifestPath, ref);
      if (child !== path && structuredNodes.has(policyPath(child))) {
        visit(child);
      }
    }
    states.set(key, "visited");
    order.push(path);
  };
  if (!isWithin(rootPath, manifestKey))
    throw new Error("manifest escaped retained evidence root");
  visit(manifestPath, manifest);
  return { order, nodes: structuredNodes };
}

function rewriteInternalRefs(
  value: unknown,
  originalRoot: string,
  copiedRoot: string,
  externalPaths: ReadonlySet<string> = new Set(),
): void {
  const rewriteString = (candidate: string): string => {
    if (!isAbsolute(candidate)) return candidate;
    const source = resolve(candidate);
    const original = resolve(originalRoot);
    if (externalPaths.has(policyPath(source))) return candidate;
    return source === original || source.startsWith(`${original}/`)
      ? join(copiedRoot, relative(original, source))
      : candidate;
  };
  if (isFileRef(value)) {
    if (isAbsolute(value.path)) {
      value.path = rewriteString(value.path);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const child = value[index];
      if (typeof child === "string") value[index] = rewriteString(child);
      else rewriteInternalRefs(child, originalRoot, copiedRoot, externalPaths);
    }
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string") value[key] = rewriteString(child);
      else rewriteInternalRefs(child, originalRoot, copiedRoot, externalPaths);
    }
  }
}

function rebuildOwnedArchivedInputRecord(
  root: string,
  manifestPath: string,
  record: Record<string, unknown>,
  externalPaths: ReadonlySet<string>,
  originalManifestPath: string,
  structuredInputs?: {
    paths: ReadonlySet<string>;
    finalized: ReadonlySet<string>;
  },
): PrefixFileRef[] {
  const rebuilt: PrefixFileRef[] = [];
  const isExternal = (ref: PrefixFileRef): boolean =>
    externalPaths.has(canonicalRefPath(ref, manifestPath)) ||
    externalPaths.has(canonicalRefPath(ref, originalManifestPath));
  const spec = isRecord(record.spec) ? record.spec : undefined;
  if (!spec) throw new Error("malformed command spec during archive rebuild");
  const required: Array<{
    ref: PrefixFileRef;
    kind: "source" | "executable" | "external-input";
  }> = [];
  if (Array.isArray(spec.inputs))
    for (const ref of spec.inputs) {
      if (!isFileRef(ref))
        throw new Error(
          "malformed source archive input during archive rebuild",
        );
      required.push({ ref, kind: "source" });
    }
  if (!isFileRef(spec.executable))
    throw new Error("malformed executable during archive rebuild");
  required.push({ ref: spec.executable, kind: "executable" });
  if (Array.isArray(spec.externalInputs))
    for (const ref of spec.externalInputs) {
      if (!isFileRef(ref))
        throw new Error(
          "malformed external-input archive input during archive rebuild",
        );
      required.push({ ref, kind: "external-input" });
    }
  if (isFileRef(spec.toolchainBinding))
    required.push({ ref: spec.toolchainBinding, kind: "source" });
  const byIdentity = new Map(
    required.map((item) => [refIdentity(item.ref, manifestPath), item]),
  );
  for (const phase of ["before", "after"] as const) {
    if (!Array.isArray(record[phase]))
      throw new Error(`malformed ${phase} archive list during archive rebuild`);
    for (const archived of record[phase]) {
      if (
        !isRecord(archived) ||
        !isFileRef(archived.input) ||
        !isFileRef(archived.archive)
      )
        throw new Error(
          `malformed ${phase} archived input during archive rebuild`,
        );
      const requiredInput = byIdentity.get(
        refIdentity(archived.input, manifestPath),
      );
      if (!requiredInput)
        throw new Error(
          `unsupported archived input relation at ${archived.input.path}`,
        );
      const archivePath = resolveRef(manifestPath, archived.archive);
      if (!containedPath(root, archivePath))
        throw new Error(
          `archive rebuild escaped retained evidence root: ${archivePath}`,
        );
      if (isExternal(requiredInput.ref)) continue;
      const inputPath = resolveRef(manifestPath, requiredInput.ref);
      if (structuredInputs) {
        const inputKey = policyPath(inputPath);
        if (
          requiredInput.kind !== "source" ||
          !structuredInputs.paths.has(inputKey)
        )
          continue;
        if (!structuredInputs.finalized.has(inputKey))
          throw new Error(
            `structured archive input is not finalized before its consumer: ${inputPath}`,
          );
      }
      if (!containedPath(root, inputPath))
        throw new Error(
          `owned archive input escaped retained evidence root: ${inputPath}`,
        );
      let inputBytes: Uint8Array;
      try {
        inputBytes = readFileSync(inputPath);
      } catch (error) {
        throw new Error(
          `archive rebuild read failed at ${inputPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      const bytes =
        requiredInput.kind === "source"
          ? inputBytes
          : encoder.encode(
              `${JSON.stringify({
                schema: "initialized-prefix-input-hash-v1",
                kind: requiredInput.kind,
                input: requiredInput.ref,
              })}\n`,
            );
      try {
        writeContained(root, archivePath, bytes);
        rebuilt.push({
          path: archived.archive.path,
          bytes: bytes.byteLength,
          sha256: hashBytes(bytes),
        });
      } catch (error) {
        throw new Error(
          `archive rebuild write failed at ${archivePath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
  return rebuilt;
}

function rebuildOwnedArchivedInputs(
  root: string,
  manifestPath: string,
  manifest: Record<string, unknown>,
  externalPaths: ReadonlySet<string>,
  originalManifestPath: string,
): void {
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isRecord(entry.record))
      throw new Error("malformed command record during archive rebuild");
    rebuildOwnedArchivedInputRecord(
      root,
      manifestPath,
      entry.record,
      externalPaths,
      originalManifestPath,
    );
  }
}

function rebindCopiedJson(
  root: string,
  originalRoot: string,
  manifestPath: string,
  additionalReadOnlyRefs: readonly PrefixFileRef[] = [],
): void {
  const originalManifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as Record<string, unknown>;
  const originalManifestPath = join(originalRoot, relative(root, manifestPath));
  const externalRefs = declaredExternalRefs(
    originalManifestPath,
    originalManifest,
  );
  const receiptReadOnlyRefs = [...externalRefs, ...additionalReadOnlyRefs];
  const receiptBeforeEntries = snapshotExternalRefEntries(
    originalManifestPath,
    receiptReadOnlyRefs,
  );
  const externalPaths = declaredExternalPaths(
    originalManifestPath,
    originalManifest,
  );
  const graphManifest = JSON.parse(JSON.stringify(originalManifest)) as Record<
    string,
    unknown
  >;
  rewriteInternalRefs(graphManifest, originalRoot, root, externalPaths);
  const graph = structuredJsonGraph(root, manifestPath, graphManifest, {
    originalRoot,
    copiedRoot: root,
    externalPaths,
  });
  const transformed: string[] = [];
  for (const path of graph.order) {
    if (
      path === policyPath(manifestPath) ||
      externalPaths.has(policyPath(path))
    )
      continue;
    if (!containedPath(root, path))
      throw new Error("structured evidence escaped copied root: " + path);
    try {
      const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
      rewriteInternalRefs(value, originalRoot, root, externalPaths);
      writeContained(root, path, JSON.stringify(value, null, 2) + "\n");
      transformed.push(relative(root, path));
    } catch (error) {
      throw new Error(
        `copied structured transform failed at ${path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  const copiedManifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as Record<string, unknown>;
  rewriteInternalRefs(copiedManifest, originalRoot, root, externalPaths);
  rebuildOwnedArchivedInputs(
    root,
    manifestPath,
    copiedManifest,
    externalPaths,
    originalManifestPath,
  );
  writeContained(
    root,
    manifestPath,
    JSON.stringify(copiedManifest, null, 2) + "\n",
  );
  const rawRefs: PrefixFileRef[] = [];
  const commands = Array.isArray(copiedManifest.commands)
    ? copiedManifest.commands
    : [];
  for (const entry of commands) {
    if (!isRecord(entry) || !isRecord(entry.record)) continue;
    for (const key of ["stdout", "stderr"] as const) {
      const ref = entry.record[key];
      if (isFileRef(ref)) rawRefs.push(ref);
    }
  }
  const original = canonicalRoot(originalRoot);
  const copied = canonicalRoot(root);
  const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pathToken = new RegExp(
    `${escapedOriginal}(?=$|[/\\\\]|:\\d+:\\d+|[\\\"'\\s,;()\\]])`,
    "g",
  );
  const decodeFailures: string[] = [];
  for (const ref of rawRefs) {
    const path = resolveRef(manifestPath, ref);
    if (!containedPath(root, path) || externalPaths.has(policyPath(path)))
      continue;
    let bytes: Uint8Array;
    try {
      bytes = readFileSync(path);
    } catch (error) {
      throw new Error(
        `copied raw transform read failed at ${path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    let text: string;
    try {
      text = decoder.decode(bytes);
    } catch {
      decodeFailures.push(relative(root, path));
      continue;
    }
    const rebased = text.replace(pathToken, copied);
    if (rebased !== text) {
      try {
        writeContained(root, path, encoder.encode(rebased));
      } catch (error) {
        throw new Error(
          `copied raw transform write failed at ${path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      transformed.push(relative(root, path));
    }
  }
  refreshTamperHashes(
    root,
    manifestPath,
    JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>,
  );
  writeContained(
    root,
    join(root, "control-rebind-receipt.json"),
    JSON.stringify(
      {
        schema: "initialized-prefix-control-rebind-v1",
        originalRoot: original,
        copiedRoot: copied,
        transformed,
        changedFiles: transformed,
        operation: "rebase-canonical-path-tokens",
        decodeFailures,
        externalReadOnly: [
          ...new Set([
            ...externalPaths,
            ...receiptReadOnlyRefs.map((ref) =>
              canonicalRefPath(ref, originalManifestPath),
            ),
          ]),
        ].sort(),
        externalReadOnlyEntries: receiptReadOnlyRefs.map((ref, index) => {
          const before = receiptBeforeEntries[index];
          const after = snapshotExternalRefEntries(originalManifestPath, [
            ref,
          ])[0];
          return {
            qualifiedRef: before?.qualifiedRef ?? { ...ref },
            canonicalIdentity:
              before?.canonicalIdentity ??
              canonicalRefPath(ref, originalManifestPath),
            before: before?.raw ?? { status: "missing" },
            after: after.raw,
          };
        }),
        externalReadOnlyHashes: Object.fromEntries(
          [
            ...new Set([
              ...externalPaths,
              ...receiptReadOnlyRefs.map((ref) =>
                canonicalRefPath(ref, originalManifestPath),
              ),
            ]),
          ]
            .sort()
            .map((path) => {
              try {
                const bytes = readFileSync(path);
                return [
                  path,
                  { bytes: bytes.byteLength, sha256: hashBytes(bytes) },
                ];
              } catch {
                return [path, "missing"];
              }
            }),
        ),
      },
      null,
      2,
    ) + "\n",
  );
}

function copyExpectedRefs(
  expected: PrefixObservedExpectations,
  originalRoot: string,
  copiedRoot: string,
  copiedManifestPath: string,
  externalPaths: ReadonlySet<string> = new Set(),
): PrefixObservedExpectations {
  const copy = JSON.parse(
    JSON.stringify(expected),
  ) as PrefixObservedExpectations;
  rewriteInternalRefs(copy, originalRoot, copiedRoot, externalPaths);
  const refs = collectRefs(copy);
  const map = new Map<string, PrefixFileRef>();
  for (const ref of refs) {
    const path = resolveRef(copiedManifestPath, ref);
    try {
      const bytes = readFileSync(path);
      map.set(path, {
        path: ref.path,
        bytes: bytes.byteLength,
        sha256: hashBytes(bytes),
      });
    } catch {
      // External provenance remains read-only and may be absent until root capture.
    }
  }
  updateAllFileRefs(copy, map, copiedManifestPath);
  return copy;
}

function selectedTamperRecord(
  manifest: Record<string, unknown>,
  expected: PrefixObservedExpectations,
  kind: string,
):
  | {
      command: PrefixRecordedCommand;
      record: PrefixCommandRecord;
      recipe: PrefixRecipeExpectation;
    }
  | undefined {
  const diagnosticControl =
    kind.startsWith("diagnostic") ||
    kind === "stream" ||
    kind === "multiplicity" ||
    kind === "collateral";
  const miriControl = kind.startsWith("miri");
  const recipes = expected.recipes.filter((recipe) =>
    diagnosticControl
      ? Boolean(recipe.diagnostic)
      : miriControl
        ? Boolean(recipe.miri)
        : true,
  );
  const outcomePriority: PrefixOperation[] = [
    "tests-full",
    "tests-named",
    "client-negative",
    "miri-positive",
    "miri-ub",
    "miri-sound",
  ];
  const commands = Array.isArray(manifest.commands)
    ? manifest.commands.filter(isRecord)
    : [];
  const validRecords = commands.flatMap((entry) => {
    const shapeReasons: MutableReasons = [];
    return isRecord(entry.record) &&
      validateRecordShape(entry.record, shapeReasons)
      ? [entry.record]
      : [];
  });
  const attemptDirectory =
    typeof manifest.attemptDirectory === "string"
      ? manifest.attemptDirectory
      : "";
  const usesSource = (record: PrefixCommandRecord, sourceId: string): boolean =>
    record.spec.inputs.some((ref) => {
      try {
        return relativeSourceIdentity(attemptDirectory, ref.path) === sourceId;
      } catch {
        return false;
      }
    });
  const isolatedSourceRecipes =
    kind === "source"
      ? recipes
          .filter((recipe) => {
            if (
              recipe.operation !== "client-negative" ||
              recipe.expectedExitCode === 0
            )
              return false;
            const candidate = validRecords.find(
              (record) =>
                record.spec.recipeId === recipe.id &&
                record.spec.operation === "client-negative" &&
                record.outcome.exitCode !== null &&
                record.outcome.exitCode !== 0 &&
                record.spec.inputs.some(
                  (ref) =>
                    ref.sha256 === recipe.sourceSha256 &&
                    (() => {
                      try {
                        return (
                          relativeSourceIdentity(attemptDirectory, ref.path) ===
                          recipe.sourceId
                        );
                      } catch {
                        return false;
                      }
                    })(),
                ),
            );
            if (!candidate) return false;
            return !validRecords.some((record) => {
              const operation = record.spec.operation;
              const producer =
                (operation === "compile" || operation === "client-positive") &&
                record.spec.argv.includes("-o") &&
                successfulOutcome(record.outcome);
              const consumer =
                operation === "tests-full" ||
                operation === "tests-named" ||
                (operation === "client-positive" &&
                  !record.spec.argv.includes("-o"));
              return (
                (producer || consumer) && usesSource(record, recipe.sourceId)
              );
            });
          })
          .sort((left, right) =>
            left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
          )
      : [];
  const isolatedIds = new Set(isolatedSourceRecipes.map((recipe) => recipe.id));
  const orderedRecipes =
    kind === "outcome"
      ? [...recipes].sort((left, right) => {
          const leftOperation = outcomePriority.indexOf(left.operation);
          const rightOperation = outcomePriority.indexOf(right.operation);
          return (
            (leftOperation < 0 ? outcomePriority.length : leftOperation) -
            (rightOperation < 0 ? outcomePriority.length : rightOperation)
          );
        })
      : isolatedSourceRecipes.length > 0
        ? [
            ...isolatedSourceRecipes,
            ...recipes.filter((recipe) => !isolatedIds.has(recipe.id)),
          ]
        : recipes;
  for (const recipe of orderedRecipes) {
    const command = commands.find(
      (entry) =>
        isRecord(entry.record) &&
        isRecord(entry.record.spec) &&
        entry.record.spec.recipeId === recipe.id,
    );
    if (command && isRecord(command.record)) {
      const shapeReasons: MutableReasons = [];
      if (validateRecordShape(command.record, shapeReasons))
        return {
          command: command as unknown as PrefixRecordedCommand,
          record: command.record,
          recipe,
        };
    }
  }
  return undefined;
}

function mutateCopiedEvidence(
  root: string,
  manifestPath: string,
  expected: PrefixObservedExpectations,
  kind: string,
): void {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  if (kind === "manifest-inventory") {
    const inventory = Array.isArray(manifest.expectedRecipes)
      ? [...manifest.expectedRecipes, `tampered-${randomUUID()}`]
      : ["tampered"];
    manifest.expectedRecipes = inventory;
    writeContained(
      root,
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    return;
  }
  const selected = selectedTamperRecord(manifest, expected, kind);
  if (!selected) throw new Error(`no applicable strict baseline for ${kind}`);
  const { command, record, recipe } = selected;
  const recordRef = isFileRef(command.ref) ? command.ref : undefined;
  if (!recordRef) throw new Error("selected command has no record ref");
  const recordPath = resolveRef(manifestPath, recordRef);
  if (kind === "outcome") {
    if (!isRecord(record.outcome))
      throw new Error("selected command has no outcome");
    record.outcome.exitCode = 99;
    const onDisk = JSON.parse(readFileSync(recordPath, "utf8")) as Record<
      string,
      unknown
    >;
    onDisk.outcome = record.outcome;
    writeContained(root, recordPath, `${JSON.stringify(onDisk, null, 2)}\n`);
    refreshTamperHashes(root, manifestPath, manifest);
    return;
  }
  const streamRef =
    isFileRef(record.stderr) && record.stderr.bytes > 0
      ? record.stderr
      : record.stdout;
  if (!isFileRef(streamRef))
    throw new Error("selected command has no raw stream");
  if (kind === "source") {
    const attemptDirectory =
      typeof manifest.attemptDirectory === "string"
        ? realpathSync(resolve(manifest.attemptDirectory))
        : dirname(resolve(manifestPath));
    const sourceRef = Array.isArray(record.spec?.inputs)
      ? record.spec.inputs.find(
          (ref) =>
            isFileRef(ref) &&
            (() => {
              try {
                return (
                  relativeSourceIdentity(attemptDirectory, ref.path) ===
                  recipe.sourceId
                );
              } catch {
                return false;
              }
            })(),
        )
      : undefined;
    if (!sourceRef)
      throw new Error("selected command has no authored source input");
    const sourcePath = resolveRef(manifestPath, sourceRef);
    const sourceBytes = readFileSync(sourcePath);
    const changedSource = encoder.encode(
      `${decoder.decode(sourceBytes)}\n// retained tamper source mutation\n`,
    );
    if (hashBytes(changedSource) === hashBytes(sourceBytes))
      throw new Error("source mutation did not change bytes");
    writeContained(root, sourcePath, changedSource);
    const allCommands = Array.isArray(manifest.commands)
      ? manifest.commands.filter(isRecord)
      : [];
    for (const commandEntry of allCommands) {
      const candidate = isRecord(commandEntry.record)
        ? commandEntry.record
        : undefined;
      if (
        !candidate ||
        !Array.isArray(candidate.before) ||
        !Array.isArray(candidate.after)
      )
        continue;
      for (const entry of [...candidate.before, ...candidate.after])
        if (
          isRecord(entry) &&
          isFileRef(entry.input) &&
          isFileRef(entry.archive) &&
          canonicalRefPath(entry.input, manifestPath) ===
            canonicalRefPath(sourceRef, manifestPath)
        )
          writeContained(
            root,
            resolveRef(manifestPath, entry.archive),
            changedSource,
          );
    }
    refreshTamperHashes(root, manifestPath, manifest);
    return;
  }
  const targetPath = resolveRef(manifestPath, streamRef);
  if (!containedPath(root, targetPath))
    throw new Error(`tamper target escaped root: ${targetPath}`);
  let bytes: Uint8Array = readFileSync(targetPath);
  const text = decoder.decode(bytes);
  const originalBytes = bytes;
  if (kind === "multiplicity") {
    const firstJson = text
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith("{"));
    if (!firstJson)
      throw new Error("no diagnostic JSON available for multiplicity control");
    bytes = encoder.encode(`${text}\n${firstJson}\n`);
  } else if (kind === "collateral")
    bytes = encoder.encode(`${text}\nunapproved compiler chatter\n`);
  else if (kind === "stream")
    bytes = encoder.encode(`${text}\nunapproved compiler stream mutation\n`);
  else if (kind === "diagnostic-code") {
    const changed = text.replace(
      /("code"\s*:\s*\{\s*"code"\s*:\s*")[^"]+/,
      (_match, prefix: string) => `${prefix}E0000`,
    );
    bytes = encoder.encode(changed === text ? `${text}\nE0000\n` : changed);
  } else if (kind === "diagnostic-primary-same-line") {
    const attemptDirectory =
      typeof manifest.attemptDirectory === "string"
        ? realpathSync(resolve(manifest.attemptDirectory))
        : dirname(resolve(manifestPath));
    const sourceRef = record.spec.inputs.find((ref) => {
      try {
        return (
          relativeSourceIdentity(attemptDirectory, ref.path) === recipe.sourceId
        );
      } catch {
        return false;
      }
    });
    if (!sourceRef)
      throw new Error("same-line diagnostic mutation lacks authored source");
    const sourceBytes = readFileSync(resolveRef(manifestPath, sourceRef));
    const expectedSpan = recipe.diagnostic?.errors
      .flatMap((error) => error.primary)
      .find((span) => span.sourceId === recipe.sourceId);
    if (!expectedSpan)
      throw new Error("same-line diagnostic mutation lacks reviewed span");
    let changed = false;
    const lines = text.split(/(\r?\n)/);
    for (let index = 0; index < lines.length; index += 2) {
      if (changed) break;
      try {
        const value = JSON.parse(lines[index]) as Record<string, unknown>;
        if (!Array.isArray(value.spans)) continue;
        const span = value.spans.find(
          (candidate): candidate is Record<string, unknown> =>
            isRecord(candidate) && candidate.is_primary === true,
        );
        if (!span || !isInteger(span.byte_start) || !isInteger(span.byte_end))
          continue;
        const candidates = [
          [span.byte_start, span.byte_end + 1],
          [span.byte_start - 1, span.byte_end],
        ] as const;
        const replacement = candidates.find(([start, end]) => {
          const startLocation = sourceLineColumn(sourceBytes, start);
          const endLocation = sourceLineColumn(sourceBytes, end);
          const slice = bytesAtRange(sourceBytes, start, end);
          return Boolean(
            startLocation &&
            endLocation &&
            startLocation.line === endLocation.line &&
            slice?.includes(expectedSpan.expression),
          );
        });
        if (!replacement) continue;
        const [start, end] = replacement;
        const startLocation = sourceLineColumn(sourceBytes, start);
        const endLocation = sourceLineColumn(sourceBytes, end);
        const slice = bytesAtRange(sourceBytes, start, end);
        if (!startLocation || !endLocation || slice === undefined) continue;
        span.byte_start = start;
        span.byte_end = end;
        span.line_start = startLocation.line;
        span.line_end = endLocation.line;
        span.column_start = startLocation.column;
        span.column_end = endLocation.column;
        span.text = [{ text: slice }];
        lines[index] = JSON.stringify(value);
        changed = true;
      } catch {
        // Plain compiler lines are left untouched by this JSON-only mutation.
      }
    }
    if (!changed)
      throw new Error("could not form a valid same-line diagnostic mutation");
    bytes = encoder.encode(lines.join(""));
  } else if (kind === "miri-wrong-read") {
    const changed = text.replace(recipe.miri?.expression ?? "", "wrong-read");
    bytes = encoder.encode(
      changed === text ? `${text}\nwrong-read\n` : changed,
    );
  } else if (kind === "miri-category") {
    const lines = text.split(/(\r?\n)/);
    const firstError = lines.findIndex(
      (line) => /\berror\s*:/i.test(line) || /undefined behavior/i.test(line),
    );
    if (firstError < 0)
      throw new Error("Miri category event is missing its first error");
    const nextError = lines.findIndex(
      (line, index) =>
        index > firstError &&
        (/^\s*error\s*:/i.test(line) || /undefined behavior/i.test(line)),
    );
    const blockEnd = nextError >= 0 ? nextError : lines.length;
    const categoryPattern =
      /memory is uninitialized|requires initialized memory|uninitialized(?:[- ]read| memory| value)|read of uninitialized/gi;
    let changed = false;
    for (let index = firstError; index < blockEnd; index += 2) {
      const line = lines[index];
      if (typeof line !== "string") continue;
      const replaced = line.replace(categoryPattern, () => {
        changed = true;
        return "different category";
      });
      lines[index] = replaced;
    }
    if (!changed)
      throw new Error("Miri category event has no reviewed category text");
    bytes = encoder.encode(lines.join(""));
  }
  if (hashBytes(bytes) === hashBytes(originalBytes))
    throw new Error(`tamper mutation ${kind} did not change bytes`);
  writeContained(root, targetPath, bytes);
  refreshTamperHashes(root, manifestPath, manifest);
}

function writeControlPacket(
  root: string,
  id: string,
  packet: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  try {
    writeContained(
      root,
      join(root, "control-result.json"),
      JSON.stringify(
        {
          schema: "initialized-prefix-control-result-v1",
          controlId: id,
          ...packet,
        },
        null,
        2,
      ) + "\n",
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Control packet could not be written.",
    };
  }
}

function snapshotExternalRefs(
  paths: ReadonlySet<string>,
): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const path of paths) {
    try {
      snapshot[path] = hashBytes(readFileSync(path));
    } catch {
      snapshot[path] = "missing";
    }
  }
  return snapshot;
}

function snapshotExternalRefEntries(
  manifestPath: string,
  refs: readonly PrefixFileRef[],
): readonly Record<string, unknown>[] {
  return refs.map((ref) => {
    const path = resolveRef(manifestPath, ref);
    const entry: Record<string, unknown> = {
      qualifiedRef: { ...ref },
      canonicalIdentity: canonicalRefPath(ref, manifestPath),
    };
    try {
      const bytes = readFileSync(path);
      entry.raw = { bytes: bytes.byteLength, sha256: hashBytes(bytes) };
    } catch {
      entry.raw = { status: "missing" };
    }
    return entry;
  });
}

export function verifyInitializedPrefixTamperControls(options: {
  manifestPath: string;
  expected: PrefixObservedExpectations;
  evidenceDirectory: string;
}): readonly {
  id: string;
  rejected: boolean;
  reasons: PrefixVerificationResult["reasons"];
}[] {
  const sourceRoot = resolve(options.evidenceDirectory);
  const manifestAbsolute = resolve(options.manifestPath);
  let rootInventory: Map<string, string>;
  try {
    if (
      !containedPath(sourceRoot, manifestAbsolute) ||
      !existsSync(manifestAbsolute)
    )
      throw new Error(
        "manifest must be inside the selected evidence directory",
      );
    rootInventory = fileInventory(sourceRoot);
  } catch (error) {
    return [
      {
        id: "baseline-error",
        rejected: false,
        reasons: [
          reason(
            "tamper-baseline-error",
            error instanceof Error ? error.message : "Invalid evidence root.",
          ),
        ],
      },
    ];
  }
  const baseline = verifyInitializedPrefixEvidence(
    manifestAbsolute,
    options.expected,
  );
  if (!baseline.ok)
    return [
      { id: "baseline-error", rejected: false, reasons: baseline.reasons },
    ];
  const manifestMode = (
    JSON.parse(readFileSync(manifestAbsolute, "utf8")) as PrefixProofManifest
  ).mode;
  const controls = [
    ["baseline-valid", undefined],
    ["mutate-outcome", "outcome"],
    ["mutate-stream", "stream"],
    ["mutate-source", "source"],
    ["mutate-manifest-inventory", "manifest-inventory"],
    ["diagnostic-code", "diagnostic-code"],
    ["diagnostic-primary-same-line", "diagnostic-primary-same-line"],
    ["diagnostic-multiplicity", "multiplicity"],
    ["diagnostic-collateral", "collateral"],
    ...(manifestMode === "miri"
      ? ([
          ["miri-wrong-read", "miri-wrong-read"],
          ["miri-category", "miri-category"],
        ] as const)
      : []),
  ] as readonly (readonly [string, string | undefined])[];
  return controls.map(([id, kind]) => {
    const temporary = mkdtempSync(
      join(dirname(sourceRoot), `${basename(sourceRoot)}-tamper-`),
    );
    const packet: Record<string, unknown> = {
      sourceRoot,
      copiedRoot: temporary,
      mutation: kind ?? null,
      originalInventoryBefore: [...rootInventory],
      originalBaseline: baseline,
    };
    let externalSnapshotPaths = new Set<string>();
    let externalSnapshotRefs: PrefixFileRef[] = [];
    try {
      const originalManifest = JSON.parse(
        readFileSync(manifestAbsolute, "utf8"),
      ) as Record<string, unknown>;
      externalSnapshotRefs = declaredExternalRefs(
        manifestAbsolute,
        originalManifest,
      );
      for (const provenance of options.expected.adjudication.provenance)
        externalSnapshotRefs.push(provenance);
      externalSnapshotPaths = new Set(
        externalSnapshotRefs.map((ref) =>
          canonicalRefPath(ref, manifestAbsolute),
        ),
      );
      packet.externalBefore = snapshotExternalRefs(externalSnapshotPaths);
      packet.externalBeforeEntries = snapshotExternalRefEntries(
        manifestAbsolute,
        externalSnapshotRefs,
      );
      cpSync(sourceRoot, temporary, { recursive: true });
      const relativeManifest = relative(sourceRoot, manifestAbsolute);
      if (relativeManifest.startsWith(".."))
        throw new Error("manifest escaped selected evidence directory");
      const copiedManifest = join(temporary, relativeManifest);
      const externalPaths = externalSnapshotPaths;
      rebindCopiedJson(
        temporary,
        sourceRoot,
        copiedManifest,
        options.expected.adjudication.provenance,
      );
      const copiedExpected = copyExpectedRefs(
        options.expected,
        sourceRoot,
        temporary,
        copiedManifest,
        externalPaths,
      );
      const copiedBaseline = verifyInitializedPrefixEvidence(
        copiedManifest,
        copiedExpected,
      );
      packet.copiedBaseline = copiedBaseline;
      packet.baseline = copiedBaseline;
      if (!copiedBaseline.ok)
        throw new Error(
          `retained copied baseline is invalid: ${copiedBaseline.reasons
            .map((entry) => entry.code)
            .join(",")}`,
        );
      if (!kind) {
        const unchanged = fileInventory(sourceRoot);
        if (
          unchanged.size !== rootInventory.size ||
          [...rootInventory].some(
            ([path, hash]) => unchanged.get(path) !== hash,
          )
        )
          throw new Error("original evidence changed during baseline control");
        packet.result = { ok: true, reasons: [] };
        packet.originalInventoryAfter = [...fileInventory(sourceRoot)];
        packet.externalAfter = snapshotExternalRefs(externalSnapshotPaths);
        packet.externalAfterEntries = snapshotExternalRefEntries(
          manifestAbsolute,
          externalSnapshotRefs,
        );
        const packetWrite = writeControlPacket(temporary, id, packet);
        if (!packetWrite.ok)
          return {
            id,
            rejected: false,
            reasons: [
              reason(
                "control-packet-write-failed",
                `Durable control packet could not be retained: ${packetWrite.message}`,
              ),
            ],
          };
        return { id, rejected: false, reasons: [] };
      }
      mutateCopiedEvidence(temporary, copiedManifest, copiedExpected, kind);
      const result = verifyInitializedPrefixEvidence(
        copiedManifest,
        copiedExpected,
      );
      packet.result = result;
      const expectedReason =
        kind === "outcome"
          ? "exit-code-mismatch"
          : kind === "manifest-inventory"
            ? "recipe-inventory-mismatch"
            : kind === "stream"
              ? "unexpected-collateral"
              : kind === "diagnostic-code"
                ? "diagnostic-code-mismatch"
                : kind === "diagnostic-primary-same-line"
                  ? "diagnostic-primary-mismatch"
                  : kind === "multiplicity"
                    ? "diagnostic-multiplicity"
                    : kind === "collateral"
                      ? "unexpected-collateral"
                      : kind === "miri-wrong-read"
                        ? "miri-read-mismatch"
                        : kind === "miri-category"
                          ? "miri-category-mismatch"
                          : "source-binding-mismatch";
      const hasExpectedReason = result.reasons.some(
        (entry) => entry.code === expectedReason,
      );
      const unrelated = result.reasons.filter((entry) =>
        /^(missing|file-|malformed|record-|archive-|unindexed|toolchain-|command-|input-|guard-|capture-|observations-|empty-evidence)/.test(
          entry.code,
        ),
      );
      const originalInventory = fileInventory(sourceRoot);
      if (
        originalInventory.size !== rootInventory.size ||
        [...rootInventory].some(
          ([path, hash]) => originalInventory.get(path) !== hash,
        )
      )
        return {
          id,
          rejected: false,
          reasons: [
            reason(
              "tamper-baseline-mutated",
              "Original evidence changed while preparing a retained tamper clone.",
            ),
          ],
        };
      if (!result.ok && hasExpectedReason)
        if (unrelated.length === 0) {
          packet.originalInventoryAfter = [...fileInventory(sourceRoot)];
          packet.externalAfter = snapshotExternalRefs(externalSnapshotPaths);
          packet.externalAfterEntries = snapshotExternalRefEntries(
            manifestAbsolute,
            externalSnapshotRefs,
          );
          const packetWrite = writeControlPacket(temporary, id, packet);
          if (!packetWrite.ok)
            return {
              id,
              rejected: false,
              reasons: [
                reason(
                  "control-packet-write-failed",
                  `Durable control packet could not be retained: ${packetWrite.message}`,
                ),
              ],
            };
          return { id, rejected: true, reasons: result.reasons };
        }
      if (unrelated.length > 0) {
        packet.originalInventoryAfter = [...fileInventory(sourceRoot)];
        packet.externalAfter = snapshotExternalRefs(externalSnapshotPaths);
        packet.externalAfterEntries = snapshotExternalRefEntries(
          manifestAbsolute,
          externalSnapshotRefs,
        );
        const packetWrite = writeControlPacket(temporary, id, packet);
        if (!packetWrite.ok)
          return {
            id,
            rejected: false,
            reasons: [
              reason(
                "control-packet-write-failed",
                `Durable control packet could not be retained: ${packetWrite.message}`,
              ),
            ],
          };
        return {
          id,
          rejected: false,
          reasons: [
            ...result.reasons,
            reason(
              "tamper-unrelated-baseline-fault",
              "The mutation introduced unrelated record, archive, or closure faults.",
            ),
          ],
        };
      }
      packet.originalInventoryAfter = [...fileInventory(sourceRoot)];
      packet.externalAfter = snapshotExternalRefs(externalSnapshotPaths);
      packet.externalAfterEntries = snapshotExternalRefEntries(
        manifestAbsolute,
        externalSnapshotRefs,
      );
      const packetWrite = writeControlPacket(temporary, id, packet);
      if (!packetWrite.ok)
        return {
          id,
          rejected: false,
          reasons: [
            reason(
              "control-packet-write-failed",
              `Durable control packet could not be retained: ${packetWrite.message}`,
            ),
          ],
        };
      return {
        id,
        rejected: false,
        reasons: [
          ...result.reasons,
          reason(
            "tamper-semantic-reason-missing",
            `Control did not produce the expected ${expectedReason} rejection.`,
          ),
        ],
      };
    } catch (error) {
      try {
        packet.originalInventoryAfter = [...fileInventory(sourceRoot)];
      } catch {
        // Preserve the typed control error when the original inventory is unreadable.
      }
      if (externalSnapshotPaths.size > 0)
        packet.externalAfter = snapshotExternalRefs(externalSnapshotPaths);
      if (externalSnapshotRefs.length > 0)
        packet.externalAfterEntries = snapshotExternalRefEntries(
          manifestAbsolute,
          externalSnapshotRefs,
        );
      packet.error =
        error instanceof Error ? error.message : "Tamper control failed.";
      const packetWrite = writeControlPacket(temporary, id, packet);
      let originalChanged = false;
      try {
        const currentInventory = fileInventory(sourceRoot);
        originalChanged =
          currentInventory.size !== rootInventory.size ||
          [...rootInventory].some(
            ([path, hash]) => currentInventory.get(path) !== hash,
          );
      } catch {
        originalChanged = true;
      }
      if (originalChanged)
        return {
          id,
          rejected: false,
          reasons: [
            reason(
              "tamper-baseline-mutated",
              "Original evidence changed while preparing a retained tamper clone.",
            ),
          ],
        };
      const reasons = [
        reason(
          "tamper-control-error",
          error instanceof Error ? error.message : "Tamper control failed.",
        ),
      ];
      if (!packetWrite.ok)
        reasons.push(
          reason(
            "control-packet-write-failed",
            `Durable control packet could not be retained: ${packetWrite.message}`,
          ),
        );
      return {
        id,
        rejected: false,
        reasons,
      };
    }
  });
}
