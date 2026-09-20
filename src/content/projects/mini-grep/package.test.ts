import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import { miniGrepPackage, miniGrepProject } from "../mini-grep";

describe("Mini grep archive contract", () => {
  it("provides a valid std-only library and CLI package", () => {
    expect(validateProjectPackage(miniGrepPackage)).toEqual([]);
    expect(miniGrepPackage.id).toBe("mini-grep-workshop");
    expect(miniGrepProject.id).toBe("mini-grep");
    expect(miniGrepPackage.revealStepRefs).toHaveLength(8);

    const reference = projectFiles(miniGrepPackage, "solution");
    expect(Object.keys(reference)).toEqual(
      expect.arrayContaining([
        "Cargo.toml",
        "Cargo.lock",
        "README.md",
        "ADR.md",
        "THREAT-MODEL.md",
        "src/lib.rs",
        "src/main.rs",
        "tests/search_contract.rs",
        "tests/cli.rs",
        "FUZZ-MANIFEST.json",
        "FUZZ-EVIDENCE.md",
        "fuzz/support/case.rs",
        "fuzz/support/check.rs",
        "tests/fuzz_regressions.rs",
        "fuzz/regressions/substring-prefix.seed",
      ]),
    );
    expect(reference["Cargo.toml"]).toContain('edition = "2024"');
    expect(reference["Cargo.toml"]).not.toContain("[dependencies]");
  });

  it("includes an unfinished starter and real contract test targets", () => {
    const starter = projectFiles(miniGrepPackage, "starter");
    expect(starter["src/lib.rs"]).toContain("todo!");
    expect(starter["tests/search_contract.rs"]).toContain("select_context");
  });

  it("keeps the authored fuzz evidence files and exact binary regression", () => {
    for (const variant of ["starter", "solution"] as const) {
      const files = projectFiles(miniGrepPackage, variant);
      const seed = new TextEncoder().encode(
        files["fuzz/regressions/substring-prefix.seed"],
      );
      expect([...seed]).toEqual([0, 0, 1, 120, 97, 120, 10]);
      expect(files["FUZZ-MANIFEST.json"]).toContain('"schemaVersion": 1');
      expect(files["FUZZ-MANIFEST.json"]).toContain("fixedRegressionSha256");
      expect(files["FUZZ-EVIDENCE.md"]).toContain("Replay and campaign");
      expect(files["fuzz/support/check.rs"]).toContain("FailureKind");
      expect(files["tests/fuzz_regressions.rs"]).toContain("substring_prefix_witness");
    }
    expect(projectFiles(miniGrepPackage, "solution")["Cargo.toml"]).not.toContain(
      "libfuzzer-sys",
    );
  });
});
