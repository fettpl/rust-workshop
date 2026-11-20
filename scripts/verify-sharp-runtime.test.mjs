import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAtLeastStableVersion } from "./verify-sharp-runtime.mjs";

describe("native runtime version minimums", () => {
  it("accepts lower, equal, and higher stable versions correctly", () => {
    assert.equal(isAtLeastStableVersion("2.63.1", "2.63.2"), false);
    assert.equal(isAtLeastStableVersion("2.63.2", "2.63.2"), true);
    assert.equal(isAtLeastStableVersion("2.63.3", "2.63.2"), true);
    assert.equal(isAtLeastStableVersion("8.18.7", "8.18.7"), true);
  });

  it("rejects missing, malformed, and prerelease version strings", () => {
    for (const value of [
      undefined,
      null,
      "",
      "2.63",
      "2.63.x",
      "v2.63.2",
      "2.63.2-rc.1",
    ]) {
      assert.equal(
        isAtLeastStableVersion(value, "2.63.2"),
        false,
        String(value),
      );
    }
  });
});
