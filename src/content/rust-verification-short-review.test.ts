import { describe, expect, it } from "vitest";
import { verifyTrustedRust } from "../../scripts/verify-rust";
import { shortReviewExercises } from "./course";

describe("native Rust coverage for short I/O reviews", () => {
  it("covers only the authored short records with canonical, alternate, and compiling mutants", () => {
    const results = verifyTrustedRust({
      lessons: [],
      reviewExercises: {},
      delayedReviewExercises: {},
      shortReviewExercises,
      traces: {},
    });
    expect(results[0].id).toBe("runner/assertion-shadowing");
    expect(results.at(-1)?.id).toBe("diagnostic/double");
    const shortResults = results.filter((result) =>
      result.id.startsWith("short-review/"),
    );
    expect(shortResults).toHaveLength(21);
    expect(shortResults.every((result) => result.passed)).toBe(true);
    expect(shortResults.map((result) => result.id)).toEqual([
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/reject-empty-implementation",
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/starter",
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/starter-rejected",
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/solution",
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/alternate",
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/mutant-trim/compile",
      "short-review/io-format-roundtrip/review-io-format-flag-probe-v1/mutant-trim/behavior",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/reject-empty-implementation",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/starter",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/starter-rejected",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/solution",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/alternate",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/mutant-swallow/compile",
      "short-review/io-safe-persistence/review-io-missing-file-probe-v1/mutant-swallow/behavior",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/reject-empty-implementation",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/starter",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/starter-rejected",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/solution",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/alternate",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/mutant-swallow/compile",
      "short-review/io-terminal-boundary/review-io-confirm-save-probe-v1/mutant-swallow/behavior",
    ]);
  }, 180_000);
});
