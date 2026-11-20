import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  PrefixMode,
  PrefixObservedExpectations,
} from "./unsafe-miri-initialized-prefix-proof";

const MODES = ["stable", "msrv", "miri"] as const;
const EXPECTED_INVENTORY: Readonly<
  Record<PrefixMode, { recipes: number; sourceBindings: number }>
> = {
  stable: { recipes: 118, sourceBindings: 48 },
  msrv: { recipes: 118, sourceBindings: 48 },
  miri: { recipes: 122, sourceBindings: 64 },
};
const EXPECTED_PAYLOAD_HASH: Readonly<Record<PrefixMode, string>> = {
  stable: "3f030c07fa90aeff5f103e80b2353342f741a7e853b9698a5f15d943db983b60",
  msrv: "4c38662e0f6c42ee6bc0644c502e3f1c3835d0c665f26c8033668d9df817bbf0",
  miri: "f6403103f9bcb57e1df8625541f6a9de6fc4e05197e7cd67e8f14dc5fabfffbe",
};
const BUNDLE_BYTES = 504225;
const BUNDLE_SHA256 =
  "b3cc91ea1b4589047e456095cba412b785314fbd513b49eaa964bfa115bece69";
const PROVENANCE_BYTES = 5154;
const PROVENANCE_SHA256 =
  "8b396f8d36a3f0004e0d856fc92becb2ea25c54e3edad803566d4153307843df";
const PROVENANCE_RELATIVE_PATH =
  "src/content/fixtures/initialized-prefix-observation-provenance.json";

const BUNDLE_URL = new URL(
  "./fixtures/initialized-prefix-observations.json",
  import.meta.url,
);
const PROVENANCE_URL = new URL(
  "./fixtures/initialized-prefix-observation-provenance.json",
  import.meta.url,
);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMode(value: unknown): value is PrefixMode {
  return value === "stable" || value === "msrv" || value === "miri";
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isPortablePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value
      .split("/")
      .some((part) => part === "" || part === "." || part === "..")
  );
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function hasOnlyKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isFileRef(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["path", "bytes", "sha256"]) &&
    isPortablePath(value.path) &&
    isInteger(value.bytes) &&
    value.bytes >= 0 &&
    isSha256(value.sha256)
  );
}

function isDigestRef(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["bytes", "sha256"]) &&
    isInteger(value.bytes) &&
    value.bytes >= 0 &&
    isSha256(value.sha256)
  );
}

function isDiagnosticSpan(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "sourceId",
      "sourceSha256",
      "byteStart",
      "byteEnd",
      "expression",
      "line",
      "columnStart",
      "columnEnd",
    ]) &&
    isPortablePath(value.sourceId) &&
    isSha256(value.sourceSha256) &&
    isInteger(value.byteStart) &&
    value.byteStart >= 0 &&
    isInteger(value.byteEnd) &&
    value.byteEnd >= value.byteStart &&
    typeof value.expression === "string" &&
    value.expression.length > 0 &&
    isInteger(value.line) &&
    value.line > 0 &&
    isInteger(value.columnStart) &&
    value.columnStart > 0 &&
    isInteger(value.columnEnd) &&
    value.columnEnd >= value.columnStart
  );
}

function isDiagnostic(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["code", "primary"]) &&
    typeof value.code === "string" &&
    value.code.length > 0 &&
    Array.isArray(value.primary) &&
    value.primary.length > 0 &&
    value.primary.every(isDiagnosticSpan)
  );
}

function isRecipe(value: unknown, mode: PrefixMode): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "mode",
      "operation",
      "sourceId",
      "sourceSha256",
      "expectedExitCode",
      "testNames",
      "intendedTest",
      "intendedAssertion",
      "diagnostic",
      "miri",
    ]) ||
    typeof value.id !== "string" ||
    value.id.length === 0 ||
    value.mode !== mode ||
    typeof value.operation !== "string" ||
    value.operation.length === 0 ||
    !isPortablePath(value.sourceId) ||
    !isSha256(value.sourceSha256) ||
    !isInteger(value.expectedExitCode)
  )
    return false;

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
    (typeof value.intendedTest !== "string" || value.intendedTest.length === 0)
  )
    return false;
  if (value.intendedAssertion !== undefined) {
    const assertion = value.intendedAssertion;
    if (
      !isRecord(assertion) ||
      !hasOnlyKeys(assertion, [
        "expression",
        "message",
        "byteStart",
        "byteEnd",
      ]) ||
      typeof assertion.expression !== "string" ||
      assertion.expression.length === 0 ||
      typeof assertion.message !== "string" ||
      assertion.message.length === 0 ||
      !isInteger(assertion.byteStart) ||
      assertion.byteStart < 0 ||
      !isInteger(assertion.byteEnd) ||
      assertion.byteEnd < assertion.byteStart
    )
      return false;
  }
  if (value.diagnostic !== undefined) {
    const diagnostic = value.diagnostic;
    if (
      !isRecord(diagnostic) ||
      !hasOnlyKeys(diagnostic, ["errors", "allowedSummaries"]) ||
      !Array.isArray(diagnostic.errors) ||
      !diagnostic.errors.every(isDiagnostic) ||
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
      !hasOnlyKeys(miri, [
        "category",
        "sourceId",
        "sourceSha256",
        "expression",
        "line",
        "column",
        "byteStart",
        "byteEnd",
      ]) ||
      miri.category !== "uninitialized-read" ||
      !isPortablePath(miri.sourceId) ||
      !isSha256(miri.sourceSha256) ||
      typeof miri.expression !== "string" ||
      miri.expression.length === 0 ||
      !isInteger(miri.line) ||
      miri.line <= 0 ||
      !isInteger(miri.column) ||
      miri.column <= 0 ||
      !isInteger(miri.byteStart) ||
      miri.byteStart < 0 ||
      !isInteger(miri.byteEnd) ||
      miri.byteEnd < miri.byteStart
    )
      return false;
  }
  return true;
}

function hasReviewedToolchainKinds(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length !== MODES.length)
    return false;
  const toolchainKinds = value;
  return MODES.every((toolchainMode) => {
    const kind = toolchainKinds[toolchainMode];
    return (
      isRecord(kind) &&
      hasOnlyKeys(kind, ["name", "release", "channel", "distributionDate"]) &&
      typeof kind.name === "string" &&
      kind.name.length > 0 &&
      typeof kind.release === "string" &&
      kind.release.length > 0 &&
      typeof kind.channel === "string" &&
      kind.channel.length > 0 &&
      (kind.distributionDate === undefined ||
        typeof kind.distributionDate === "string")
    );
  });
}

function isObservedPayload(value: unknown, mode: PrefixMode): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "schema",
      "adjudication",
      "sourceBindings",
      "toolchainKinds",
      "recipes",
    ]) ||
    value.schema !== "initialized-prefix-observations-v1" ||
    !isRecord(value.adjudication) ||
    !hasOnlyKeys(value.adjudication, ["status", "provenance"]) ||
    value.adjudication.status !== "root-reviewed" ||
    !Array.isArray(value.adjudication.provenance) ||
    value.adjudication.provenance.length !== 1 ||
    !value.adjudication.provenance.every(isFileRef) ||
    value.adjudication.provenance[0].path !== PROVENANCE_RELATIVE_PATH ||
    value.adjudication.provenance[0].bytes !== PROVENANCE_BYTES ||
    value.adjudication.provenance[0].sha256 !== PROVENANCE_SHA256 ||
    !isRecord(value.sourceBindings) ||
    Object.keys(value.sourceBindings).length !==
      EXPECTED_INVENTORY[mode].sourceBindings ||
    !Object.entries(value.sourceBindings).every(
      ([sourceId, sha]) => isPortablePath(sourceId) && isSha256(sha),
    ) ||
    !hasReviewedToolchainKinds(value.toolchainKinds) ||
    !Array.isArray(value.recipes) ||
    value.recipes.length !== EXPECTED_INVENTORY[mode].recipes
  )
    return false;

  const recipeIds = new Set<string>();
  for (const recipe of value.recipes) {
    if (!isRecipe(recipe, mode)) return false;
    if (recipeIds.has(recipe.id)) return false;
    recipeIds.add(recipe.id);
    if (
      value.sourceBindings[recipe.sourceId] !== recipe.sourceSha256 ||
      (recipe.miri !== undefined &&
        value.sourceBindings[recipe.miri.sourceId] !== recipe.miri.sourceSha256)
    )
      return false;
  }
  return true;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value) ?? "null";
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return undefined;
  }
}

function validateProvenance(
  value: unknown,
  payloads: Readonly<Record<PrefixMode, unknown>>,
): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "schema",
      "adjudication",
      "capture",
      "runtimeProductSources",
      "modes",
      "normalization",
    ]) ||
    value.schema !== "initialized-prefix-observation-provenance-v1" ||
    !isRecord(value.adjudication) ||
    !hasOnlyKeys(value.adjudication, ["status", "date", "basis", "review"]) ||
    value.adjudication.status !== "root-reviewed" ||
    typeof value.adjudication.date !== "string" ||
    typeof value.adjudication.basis !== "string" ||
    !isRecord(value.adjudication.review) ||
    !hasOnlyKeys(value.adjudication.review, [
      "id",
      "reportSha256",
      "companionSha256",
      "inputsRehashed",
    ]) ||
    value.adjudication.review.id !== 97 ||
    !isSha256(value.adjudication.review.reportSha256) ||
    !isSha256(value.adjudication.review.companionSha256) ||
    value.adjudication.review.inputsRehashed !== 25 ||
    !isRecord(value.capture) ||
    !hasOnlyKeys(value.capture, [
      "id",
      "results",
      "retentionInspection",
      "runtimeSourceBinding",
      "targetRecipes",
      "commands",
      "archivesChecked",
      "fileRefsChecked",
      "retentionMismatches",
      "runtimeSourceBeforeAfterEqual",
    ]) ||
    typeof value.capture.id !== "string" ||
    !isDigestRef(value.capture.results) ||
    !isDigestRef(value.capture.retentionInspection) ||
    !isDigestRef(value.capture.runtimeSourceBinding) ||
    value.capture.targetRecipes !== 358 ||
    value.capture.commands !== 381 ||
    value.capture.archivesChecked !== 25684 ||
    value.capture.fileRefsChecked !== 27783 ||
    value.capture.retentionMismatches !== 0 ||
    value.capture.runtimeSourceBeforeAfterEqual !== true ||
    !Array.isArray(value.runtimeProductSources) ||
    value.runtimeProductSources.length !== 5 ||
    !value.runtimeProductSources.every(
      (source) =>
        isRecord(source) &&
        hasOnlyKeys(source, ["path", "bytes", "sha256"]) &&
        isPortablePath(source.path) &&
        isInteger(source.bytes) &&
        source.bytes >= 0 &&
        isSha256(source.sha256),
    ) ||
    !isRecord(value.modes) ||
    Object.keys(value.modes).length !== MODES.length ||
    !isRecord(value.normalization) ||
    !hasOnlyKeys(value.normalization, [
      "diagnosticErrorCodes",
      "primarySpanMultiplicity",
      "intendedPanics",
      "ordinaryFullFailureOccurrences",
      "ordinaryNamedFailureOccurrences",
      "summaryPolicy",
      "modePayloadHashPolicy",
    ]) ||
    !isRecord(value.normalization.diagnosticErrorCodes) ||
    value.normalization.diagnosticErrorCodes.E0597 !== 12 ||
    value.normalization.diagnosticErrorCodes.E0499 !== 6 ||
    value.normalization.diagnosticErrorCodes.E0503 !== 2 ||
    !isRecord(value.normalization.primarySpanMultiplicity) ||
    value.normalization.primarySpanMultiplicity.E0597 !== 14 ||
    value.normalization.primarySpanMultiplicity.E0499 !== 6 ||
    value.normalization.primarySpanMultiplicity.E0503 !== 2 ||
    value.normalization.intendedPanics !== 84 ||
    value.normalization.ordinaryFullFailureOccurrences !== 492 ||
    value.normalization.ordinaryNamedFailureOccurrences !== 0 ||
    typeof value.normalization.summaryPolicy !== "string" ||
    typeof value.normalization.modePayloadHashPolicy !== "string"
  )
    return false;

  for (const mode of MODES) {
    const metadata = value.modes[mode];
    if (
      !isRecord(metadata) ||
      !hasOnlyKeys(metadata, [
        "captureId",
        "manifest",
        "authoredRecipeInventory",
        "modeResult",
        "targetRecipes",
        "metadataAndTargetCommands",
        "sourceBindings",
        "semanticPayloadSha256",
      ]) ||
      typeof metadata.captureId !== "string" ||
      !isDigestRef(metadata.manifest) ||
      !isDigestRef(metadata.authoredRecipeInventory) ||
      !isDigestRef(metadata.modeResult) ||
      typeof metadata.semanticPayloadSha256 !== "string" ||
      !isSha256(metadata.semanticPayloadSha256) ||
      metadata.semanticPayloadSha256 !== EXPECTED_PAYLOAD_HASH[mode] ||
      metadata.targetRecipes !== EXPECTED_INVENTORY[mode].recipes ||
      metadata.sourceBindings !== EXPECTED_INVENTORY[mode].sourceBindings ||
      metadata.metadataAndTargetCommands !== (mode === "miri" ? 131 : 125) ||
      metadata.sourceBindings !== EXPECTED_INVENTORY[mode].sourceBindings ||
      sha256(
        canonicalJson(
          (() => {
            const payload = payloads[mode];
            if (!isRecord(payload)) return undefined;
            const withoutAdjudication = { ...payload };
            delete withoutAdjudication.adjudication;
            return withoutAdjudication;
          })(),
        ),
      ) !== metadata.semanticPayloadSha256
    )
      return false;
  }
  return true;
}

/**
 * Pure byte-level validation seam for focused corruption tests. It performs
 * no filesystem, process, environment, or caller-path access.
 */
export function validateInitializedPrefixObservationBytes(
  bundleBytes: Uint8Array,
  provenanceBytes: Uint8Array,
  mode: PrefixMode,
): PrefixObservedExpectations | undefined {
  if (
    !isMode(mode) ||
    bundleBytes.byteLength !== BUNDLE_BYTES ||
    provenanceBytes.byteLength !== PROVENANCE_BYTES ||
    sha256(bundleBytes) !== BUNDLE_SHA256 ||
    sha256(provenanceBytes) !== PROVENANCE_SHA256
  )
    return undefined;

  const bundle = parseJson(bundleBytes);
  const provenance = parseJson(provenanceBytes);
  if (
    !isRecord(bundle) ||
    !hasOnlyKeys(bundle, ["schema", "modes"]) ||
    bundle.schema !== "initialized-prefix-observation-bundle-v1" ||
    !isRecord(bundle.modes) ||
    Object.keys(bundle.modes).length !== MODES.length
  )
    return undefined;

  const payloads: Record<PrefixMode, unknown> = {
    stable: bundle.modes.stable,
    msrv: bundle.modes.msrv,
    miri: bundle.modes.miri,
  };
  for (const candidateMode of MODES)
    if (!isObservedPayload(payloads[candidateMode], candidateMode))
      return undefined;
  if (!validateProvenance(provenance, payloads)) return undefined;
  return payloads[mode] as PrefixObservedExpectations;
}

/** Read only the reviewed, fixed-location observation bundle for one mode. */
export function readInitializedPrefixObservedExpectations(
  mode?: PrefixMode,
): PrefixObservedExpectations | undefined {
  if (!isMode(mode)) return undefined;
  try {
    const bundleBytes = readFileSync(BUNDLE_URL);
    const provenanceBytes = readFileSync(PROVENANCE_URL);
    const payload = validateInitializedPrefixObservationBytes(
      bundleBytes,
      provenanceBytes,
      mode,
    );
    if (!payload) return undefined;
    const provenancePath = fileURLToPath(PROVENANCE_URL);
    return {
      ...payload,
      adjudication: {
        ...payload.adjudication,
        provenance: payload.adjudication.provenance.map((ref) => ({
          ...ref,
          path: provenancePath,
        })),
      },
    };
  } catch {
    return undefined;
  }
}
