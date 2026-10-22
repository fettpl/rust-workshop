export const INITIALIZED_PREFIX_DIAGNOSTIC_CODES = [
  "none",
  "qualification-identity",
  "qualification-config-input",
  "qualification-toolchain-input",
  "qualification-sysroot-input",
  "qualification-rustup-lookup",
  "qualification-tool-version",
  "qualification-installed-version-mismatch",
  "qualification-unknown",
] as const;

export type InitializedPrefixDiagnosticCode =
  (typeof INITIALIZED_PREFIX_DIAGNOSTIC_CODES)[number];

export type InitializedPrefixDiagnostic = {
  code: InitializedPrefixDiagnosticCode;
  detail: string;
};

type ReasonLike = {
  code?: unknown;
  message?: unknown;
};

const messageOf = (reason: ReasonLike): string =>
  typeof reason.message === "string" ? reason.message : "";

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
  const message = reasons.map(messageOf).find((value) => value.length > 0);
  if (!message)
    return { code: "qualification-unknown", detail: "message-empty" };
  return {
    code: classifyInitializedPrefixDiagnostic(reasons),
    detail: normalizedMessagePrefix(message),
  };
}
