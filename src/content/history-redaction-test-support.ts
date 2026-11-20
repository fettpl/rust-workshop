import { createHash } from "node:crypto";

// One reviewed presentation-only successor; historical receipts stay immutable.
export const historyRedactionPath =
  "src/content/fixtures/m11-m10-identity.json";
const previousSha256 =
  "59b75a892df2a1be2920e49d33eed7956c5029c8328302f38506eded29611fa7";
const currentSha256 =
  "2ef586f7b67f8f83621c1e53c3b4bfdddec9dc89c1af4612ed702f978607c563";
export const historyRedactionDeltas = {
  [historyRedactionPath]: { previousSha256, currentSha256 },
} as const;

export function assertReviewedHistoryRedaction(
  receipt: readonly { path: string; sha256: string }[],
  bytes: Uint8Array,
  deltas: Readonly<
    Record<string, { previousSha256: string; currentSha256: string }>
  > = historyRedactionDeltas,
): void {
  if (
    JSON.stringify(Object.keys(deltas)) !==
    JSON.stringify([historyRedactionPath])
  )
    throw new Error("Unreviewed history-redaction delta keys");
  const delta = deltas[historyRedactionPath];
  if (
    delta.previousSha256 !== previousSha256 ||
    delta.currentSha256 !== currentSha256
  )
    throw new Error("Unreviewed history-redaction delta hashes");
  const entries = receipt.filter((file) => file.path === historyRedactionPath);
  if (entries.length !== 1)
    throw new Error("Expected exactly one historical fixture receipt");
  if (entries[0].sha256 !== previousSha256)
    throw new Error("Historical fixture previous hash mismatch");
  const parsed = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (parsed.provenance?.inputPath !== "<private-input:legacy-m10-projection>")
    throw new Error("History-redaction placeholder mismatch");
  parsed.provenance.inputPath = "<metadata-path-omitted-for-semantic-identity>";
  const sha = (value: string | Uint8Array) =>
    createHash("sha256").update(value).digest("hex");
  if (
    sha(JSON.stringify(parsed)) !==
    "7b0e3731da535f2c4eb4f844d0510958ae455367aa9a105470f953428a296785"
  )
    throw new Error("History-redaction semantic identity mismatch");
  if (sha(bytes) !== currentSha256)
    throw new Error("History-redaction current bytes mismatch");
}
