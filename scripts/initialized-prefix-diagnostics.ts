export const INITIALIZED_PREFIX_DIAGNOSTIC_CODES = [
  "none",
  "native-deadline-exceeded",
  "qualification-identity",
  "qualification-config-input",
  "qualification-toolchain-input",
  "qualification-sysroot-input",
  "qualification-rustup-lookup",
  "qualification-tool-version",
  "qualification-installed-version-mismatch",
  "tamper-control-failed",
  "qualification-unknown",
] as const;

export type InitializedPrefixDiagnosticCode =
  (typeof INITIALIZED_PREFIX_DIAGNOSTIC_CODES)[number];

export type InitializedPrefixDiagnostic = {
  code: InitializedPrefixDiagnosticCode;
  detail: string;
};

const INITIALIZED_PREFIX_NATIVE_CONTROL_IDS = [
  "baseline-valid",
  "mutate-outcome",
  "mutate-stream",
  "mutate-source",
  "mutate-manifest-inventory",
  "diagnostic-code",
  "diagnostic-primary-same-line",
  "diagnostic-multiplicity",
  "diagnostic-collateral",
  "miri-wrong-read",
  "miri-category",
] as const;

type InitializedPrefixNativeControlId =
  (typeof INITIALIZED_PREFIX_NATIVE_CONTROL_IDS)[number];

export type InitializedPrefixDeadlineStage =
  | { kind: "none" }
  | {
      kind: "control";
      controlID: InitializedPrefixNativeControlId;
      boundary: "before" | "after";
    }
  | { kind: "other" }
  | { kind: "unreported" };

export const INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_IDS = [
  "baseline-valid",
  "mutate-outcome",
  "mutate-stream",
  "mutate-source",
  "mutate-manifest-inventory",
  "diagnostic-code",
  "diagnostic-primary-same-line",
  "diagnostic-multiplicity",
  "diagnostic-collateral",
  "miri-wrong-read",
  "miri-category",
] as const;

export type InitializedPrefixControlDiagnosticID =
  (typeof INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_IDS)[number];

const INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_REASON_CODES = [
  "exit-code-mismatch",
  "unexpected-collateral",
  "source-binding-mismatch",
  "recipe-inventory-mismatch",
  "diagnostic-code-mismatch",
  "diagnostic-primary-mismatch",
  "diagnostic-multiplicity",
  "miri-read-mismatch",
  "miri-category-mismatch",
  "tamper-control-error",
  "control-packet-write-failed",
  "tamper-baseline-mutated",
  "tamper-unrelated-baseline-fault",
  "tamper-semantic-reason-missing",
  "none",
  "other",
] as const;

type InitializedPrefixControlDiagnosticReasonCode =
  (typeof INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_REASON_CODES)[number];

const INITIALIZED_PREFIX_CONTROL_EXPECTED_REASON_CODES: Readonly<
  Record<
    InitializedPrefixControlDiagnosticID,
    InitializedPrefixControlDiagnosticReasonCode
  >
> = Object.freeze({
  "baseline-valid": "none",
  "mutate-outcome": "exit-code-mismatch",
  "mutate-stream": "unexpected-collateral",
  "mutate-source": "source-binding-mismatch",
  "mutate-manifest-inventory": "recipe-inventory-mismatch",
  "diagnostic-code": "diagnostic-code-mismatch",
  "diagnostic-primary-same-line": "diagnostic-primary-mismatch",
  "diagnostic-multiplicity": "diagnostic-multiplicity",
  "diagnostic-collateral": "unexpected-collateral",
  "miri-wrong-read": "miri-read-mismatch",
  "miri-category": "miri-category-mismatch",
});

export type InitializedPrefixControlDiagnostic = {
  controlID: InitializedPrefixControlDiagnosticID;
  rejected: boolean;
  expectedReasonCode: InitializedPrefixControlDiagnosticReasonCode;
  observedReasonCodes: readonly InitializedPrefixControlDiagnosticReasonCode[];
};

type ControlDiagnosticLike = {
  controlID?: unknown;
  rejected?: unknown;
  expectedReasonCode?: unknown;
  observedReasonCodes?: unknown;
};

const isControlDiagnosticID = (
  value: unknown,
): value is InitializedPrefixControlDiagnosticID =>
  typeof value === "string" &&
  INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_IDS.includes(
    value as InitializedPrefixControlDiagnosticID,
  );

const isControlDiagnosticReasonCode = (
  value: unknown,
): value is InitializedPrefixControlDiagnosticReasonCode =>
  typeof value === "string" &&
  INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_REASON_CODES.includes(
    value as (typeof INITIALIZED_PREFIX_CONTROL_DIAGNOSTIC_REASON_CODES)[number],
  );

/**
 * Accept only the native feature's finite, already-sanitized control seam.
 * Generic legacy `tamper-control-failed` reasons intentionally remain
 * unreported because they do not identify a control safely.
 */
export function projectInitializedPrefixControlDiagnostics(
  value: unknown,
): readonly InitializedPrefixControlDiagnostic[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (candidate === null || typeof candidate !== "object") return [];
    const entry = candidate as ControlDiagnosticLike;
    if (
      !isControlDiagnosticID(entry.controlID) ||
      typeof entry.rejected !== "boolean" ||
      !isControlDiagnosticReasonCode(entry.expectedReasonCode) ||
      entry.expectedReasonCode !==
        INITIALIZED_PREFIX_CONTROL_EXPECTED_REASON_CODES[entry.controlID] ||
      !Array.isArray(entry.observedReasonCodes)
    )
      return [];
    const observedReasonCodes = [
      ...new Set(
        entry.observedReasonCodes.map((code) =>
          isControlDiagnosticReasonCode(code) ? code : "other",
        ),
      ),
    ];
    return [
      {
        controlID: entry.controlID,
        rejected: entry.rejected,
        expectedReasonCode: entry.expectedReasonCode,
        observedReasonCodes:
          observedReasonCodes.length > 0 ? observedReasonCodes : ["none"],
      },
    ];
  });
}

type ReasonLike = {
  code?: unknown;
  message?: unknown;
};

const messageOf = (reason: ReasonLike): string =>
  typeof reason.message === "string" ? reason.message : "";

const isNativeDeadlineReason = (reason: ReasonLike): boolean =>
  reason.code === "capture-aborted" &&
  typeof reason.message === "string" &&
  reason.message.startsWith("whole native proof deadline expired ");

const nativeDeadlinePrefix = "whole native proof deadline expired ";

export function projectInitializedPrefixDeadlineStage(
  reasons: readonly ReasonLike[],
): InitializedPrefixDeadlineStage {
  const exactDeadline = reasons.find(
    (reason) =>
      typeof reason.message === "string" &&
      reason.message.startsWith(nativeDeadlinePrefix),
  );
  if (exactDeadline) {
    if (!isNativeDeadlineReason(exactDeadline)) return { kind: "other" };
    const suffix = (exactDeadline.message as string).slice(
      nativeDeadlinePrefix.length,
    );
    const match = suffix.match(/^(before|after) tamper control ([a-z0-9-]+)$/);
    if (!match || match[0] !== suffix) return { kind: "other" };
    const boundary = match[1];
    const controlID = match[2];
    if (
      (boundary !== "before" && boundary !== "after") ||
      !INITIALIZED_PREFIX_NATIVE_CONTROL_IDS.includes(
        controlID as InitializedPrefixNativeControlId,
      )
    )
      return { kind: "other" };
    return {
      kind: "control",
      controlID: controlID as InitializedPrefixNativeControlId,
      boundary,
    };
  }
  const captureAbort = reasons.find(
    (reason) => reason.code === "capture-aborted",
  );
  return captureAbort && typeof captureAbort.message !== "string"
    ? { kind: "unreported" }
    : { kind: "none" };
}

function normalizedMessagePrefix(message: string): string {
  const normalized = message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/(?:\/|[A-Za-z]:[\\/])[^\s,;]+/g, "<path>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
  const prefix = normalized.split(":", 1)[0]?.trim() ?? "";
  return (prefix || "unknown").slice(0, 96);
}

export function classifyInitializedPrefixDiagnostic(
  reasons: readonly ReasonLike[],
): InitializedPrefixDiagnosticCode {
  if (reasons.length === 0) return "none";
  if (reasons.some(isNativeDeadlineReason)) return "native-deadline-exceeded";
  if (reasons.some((reason) => reason.code === "tamper-control-failed"))
    return "tamper-control-failed";
  const messages = reasons
    .map(messageOf)
    .filter((message) => message.length > 0);
  if (messages.length === 0) return "qualification-unknown";
  for (const message of messages) {
    if (/identity differs|executable identity/i.test(message))
      return "qualification-identity";
    if (
      /installed full version stdout differs from qualification/i.test(message)
    )
      return "qualification-installed-version-mismatch";
    if (
      /rustup lookup .*?(?:did not complete successfully|returned no absolute path)/i.test(
        message,
      )
    )
      return "qualification-rustup-lookup";
    if (
      /(?:rustc|rustdoc|cargo(?:-miri)?|miri|rustup) version did not complete successfully/i.test(
        message,
      )
    )
      return "qualification-tool-version";
    if (
      /MIRI_SYSROOT|MIRI_SYSROOT manifest|sysroot .*?(?:missing|required|must be)/i.test(
        message,
      )
    )
      return "qualification-sysroot-input";
    if (
      /Cargo config|CARGO_CONFIG|offline Cargo config|private CARGO_HOME/i.test(
        message,
      )
    )
      return "qualification-config-input";
    if (/toolchain qualification|installed-tool qualification/i.test(message))
      return "qualification-toolchain-input";
  }
  return "qualification-unknown";
}

export function projectInitializedPrefixDiagnostic(
  reasons: readonly ReasonLike[],
): InitializedPrefixDiagnostic {
  if (reasons.length === 0) return { code: "none", detail: "none" };
  if (reasons.some(isNativeDeadlineReason))
    return {
      code: "native-deadline-exceeded",
      detail: "Native proof deadline exceeded.",
    };
  if (reasons.some((reason) => reason.code === "tamper-control-failed"))
    return {
      code: "tamper-control-failed",
      detail: "Tamper control rejection failed.",
    };
  const message = reasons.map(messageOf).find((value) => value.length > 0);
  if (!message)
    return { code: "qualification-unknown", detail: "message-empty" };
  return {
    code: classifyInitializedPrefixDiagnostic(reasons),
    detail: normalizedMessagePrefix(message),
  };
}
