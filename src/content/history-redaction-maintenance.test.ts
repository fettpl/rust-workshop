import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/m11-m10-identity.json";
import sendReceipt from "./fixtures/async-send-pre-handoff.json";
import cancelReceipt from "./fixtures/async-cancel-pre-transfer.json";
import repairReceipt from "./documentation-guided-repair-legacy.json";
import {
  assertReviewedHistoryRedaction,
  historyRedactionDeltas,
  historyRedactionPath,
} from "./history-redaction-test-support";

const bytes = readFileSync(
  new URL("./fixtures/m11-m10-identity.json", import.meta.url),
);
const row = {
  path: historyRedactionPath,
  sha256: "59b75a892df2a1be2920e49d33eed7956c5029c8328302f38506eded29611fa7",
};
const encode = (change: (value: typeof fixture) => void) => {
  const value = structuredClone(fixture);
  change(value);
  return Buffer.from(JSON.stringify(value));
};

describe("closed history-redaction maintenance contract", () => {
  it.each([
    { receipt: sendReceipt.immutableFiles },
    { receipt: cancelReceipt.immutableFiles },
    { receipt: repairReceipt.immutable },
  ])(
    "accepts the exact redacted bytes against a frozen receipt (%#)",
    ({ receipt }) =>
      expect(() =>
        assertReviewedHistoryRedaction(receipt, bytes),
      ).not.toThrow(),
  );
  it("rejects an alternate placeholder", () => {
    expect(() =>
      assertReviewedHistoryRedaction(
        [row],
        encode((value) => {
          value.provenance.inputPath = "<private-input:other>";
        }),
      ),
    ).toThrow(/placeholder/);
  });
  it.each([
    [
      "second metadata field",
      (value: typeof fixture) => {
        value.provenance.inputBytes++;
      },
    ],
    [
      "changed ID",
      (value: typeof fixture) => {
        value.orderedLessonIds[0] = "changed-id";
      },
    ],
    [
      "reordered array",
      (value: typeof fixture) => {
        value.orderedLessonIds.reverse();
      },
    ],
    [
      "preserved source hash",
      (value: typeof fixture) => {
        value.provenance.sourceHead = "0".repeat(40);
      },
    ],
  ] as const)("rejects %s", (_, change) => {
    expect(() => assertReviewedHistoryRedaction([row], encode(change))).toThrow(
      /semantic/,
    );
  });
  it("rejects missing fixture receipt", () => {
    expect(() => assertReviewedHistoryRedaction([], bytes)).toThrow(
      /exactly one/,
    );
  });
  it("rejects duplicate fixture receipts", () => {
    expect(() => assertReviewedHistoryRedaction([row, row], bytes)).toThrow(
      /exactly one/,
    );
  });
  it("rejects a mismatched previous hash", () => {
    expect(() =>
      assertReviewedHistoryRedaction(
        [{ ...row, sha256: "0".repeat(64) }],
        bytes,
      ),
    ).toThrow(/previous hash/);
  });
  it("rejects an additional delta key", () => {
    expect(() =>
      assertReviewedHistoryRedaction([row], bytes, {
        ...historyRedactionDeltas,
        "unreviewed.json": historyRedactionDeltas[historyRedactionPath],
      }),
    ).toThrow(/delta keys/);
  });
  it("rejects a stale current hash", () => {
    expect(() =>
      assertReviewedHistoryRedaction([row], bytes, {
        [historyRedactionPath]: {
          ...historyRedactionDeltas[historyRedactionPath],
          currentSha256: row.sha256,
        },
      }),
    ).toThrow(/delta hashes/);
  });
  it("rejects byte changes even when parsed semantics match", () => {
    expect(() =>
      assertReviewedHistoryRedaction(
        [row],
        Buffer.concat([bytes, Buffer.from("\n")]),
      ),
    ).toThrow(/current bytes/);
  });
});
