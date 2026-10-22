import { describe, expect, it } from "vitest";
import {
  classifyInitializedPrefixDiagnostic,
  INITIALIZED_PREFIX_DIAGNOSTIC_CODES,
} from "../../scripts/initialized-prefix-diagnostics";

describe("initialized-prefix sanitized diagnostics", () => {
  it("classifies qualification failures into finite codes without returning messages", () => {
    const cases = [
      [
        "root-qualified rustup identity differs before lookup",
        "qualification-identity",
      ],
      [
        "root-qualified rustc identity differs during qualification preflight",
        "qualification-identity",
      ],
      [
        "an explicit consumed Cargo config is required",
        "qualification-config-input",
      ],
      [
        "offline Cargo config is missing: /runner/private/config.toml",
        "qualification-config-input",
      ],
      [
        "an explicit installed-tool qualification is required",
        "qualification-toolchain-input",
      ],
      [
        "toolchain qualification is missing: /runner/qualification.json",
        "qualification-toolchain-input",
      ],
      [
        "MIRI_SYSROOT must be an existing absolute path",
        "qualification-sysroot-input",
      ],
      [
        "rustup lookup rustc did not complete successfully; raw record retained at /secret/path",
        "qualification-rustup-lookup",
      ],
      [
        "rustc version did not complete successfully; raw record retained at /secret/path",
        "qualification-tool-version",
      ],
      [
        "installed full version stdout differs from qualification: rustc",
        "qualification-installed-version-mismatch",
      ],
      ["unexpected private-token /home/runner/build", "qualification-unknown"],
    ] as const;
    for (const [message, expected] of cases) {
      const code = classifyInitializedPrefixDiagnostic([
        { code: "raw-code", message },
      ]);
      expect(code).toBe(expected);
      expect(INITIALIZED_PREFIX_DIAGNOSTIC_CODES).toContain(code);
      expect(code).not.toContain(message);
      expect(code).not.toContain("/runner");
      expect(code).not.toContain("secret");
    }
  });

  it("returns none for valid summaries and unknown for malformed or unrecognized reasons", () => {
    expect(classifyInitializedPrefixDiagnostic([])).toBe("none");
    expect(classifyInitializedPrefixDiagnostic([{ code: "unknown" }])).toBe(
      "qualification-unknown",
    );
    expect(
      classifyInitializedPrefixDiagnostic([
        { code: "unknown", message: "path=/tmp/token=secret sha256=abc123" },
      ]),
    ).toBe("qualification-unknown");
  });
});
