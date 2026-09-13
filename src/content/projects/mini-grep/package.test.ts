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
    expect(miniGrepPackage.revealStepRefs).toHaveLength(4);

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
});
