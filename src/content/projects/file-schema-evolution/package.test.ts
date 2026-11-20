// SPDX-License-Identifier: MIT
import { createHash } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  archiveNoticeSources,
  buildProjectArchive,
  projectArchiveFiles,
} from "../../../../scripts/project-archive";
import { projectFiles } from "../../../domain/project-package";
import {
  fileSchemaEvolutionPackage,
  fileSchemaEvolutionProject,
} from "../file-schema-evolution";
import {
  fileSchemaCompilerProbes,
  fileSchemaNativeEquivalents,
  fileSchemaNativeTests,
  fileSchemaSemanticMutations,
} from "./fixtures";

const authoredPaths = [
  "Cargo.toml",
  "src/lib.rs",
  "src/model.rs",
  "src/codec.rs",
  "src/upgrade.rs",
  "tests/compatibility.rs",
  "tests/upgrade.rs",
  "examples/upgrade.rs",
  "README.md",
];

const sha256 = (source: string) =>
  createHash("sha256").update(source).digest("hex");

describe("file schema evolution project package", () => {
  it("builds two exact authored std-only archives with the four canonical notices", () => {
    const project = fileSchemaEvolutionPackage;
    expect(project.id).toBe("file-schema-evolution-workshop");
    expect(Object.hasOwn(project, "workspaceMembers")).toBe(false);
    expect(project.files.map((file) => file.path)).toEqual(authoredPaths);
    for (const variant of ["starter", "solution"] as const) {
      const members = unzipSync(buildProjectArchive(project, variant));
      const expected = projectArchiveFiles(project, variant);
      expect(Object.keys(members).sort()).toEqual(
        [...authoredPaths, ...Object.keys(archiveNoticeSources)]
          .map((path) => `${project.id}/${path}`)
          .sort(),
      );
      for (const [path, contents] of Object.entries(expected))
        expect(strFromU8(members[`${project.id}/${path}`]), path).toBe(
          contents,
        );
      expect(expected["Cargo.toml"]).toMatch(
        /^\[package\]\nname = "file-schema-evolution-workshop"\nversion = "1\.0\.0"\nedition = "2024"\nrust-version = "1\.85\.0"\npublish = false\nlicense = "MIT"\n\n\[lib\]\nname = "file_schema_evolution"\n$/,
      );
    }
  });

  it("leaves only normalization unfinished and ties its solution to both gate refs", () => {
    const project = fileSchemaEvolutionPackage;
    const starter = projectFiles(project, "starter");
    const solution = projectFiles(project, "solution");
    const normalize = fileSchemaNativeEquivalents[0].before;
    expect(starter["src/model.rs"]).toBe(
      solution["src/model.rs"].replace(
        normalize,
        'pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {\n    let _ = decoded;\n    todo!("implement normalization")\n}',
      ),
    );
    expect(
      Object.keys(starter).filter((path) => starter[path] !== solution[path]),
    ).toEqual(["src/model.rs", "README.md"]);
    expect(starter["README.md"]).toContain("Uzupełnij ciało funkcji normalize");
    expect(solution["README.md"]).toContain(
      "pokazuje rozwiązanie funkcji normalize",
    );
    expect(project.starterRevealStepRefs).toEqual([]);
    expect(project.revealStepRefs).toEqual([
      {
        lessonId: "file-schema-normalization",
        stepId: "schema-normalize-apply",
      },
      {
        lessonId: "file-schema-normalization",
        stepId: "schema-normalize-blank",
      },
    ]);
    expect(fileSchemaEvolutionProject.package).toBe(project);
    expect(fileSchemaEvolutionProject.lessonIds).toEqual([
      "file-schema-normalization",
      "file-schema-explicit-upgrade",
    ]);
    expect(fileSchemaEvolutionProject.reviewConceptIds).toEqual([
      "file-version-meaning",
    ]);
  });

  it("keeps model construction private and proof patches bound to the authored source", () => {
    const files = projectFiles(fileSchemaEvolutionPackage, "solution");
    expect(files["src/lib.rs"]).not.toMatch(
      /legacy_from_rows|current_from_checked_rows|into_legacy_rows/,
    );
    for (const type of ["Entry", "Todo", "LegacyTodo", "PreparedUpgrade"]) {
      const fields = files["src/model.rs"].match(
        new RegExp(`pub struct ${type} \\{([\\s\\S]+?)\\n\\}`),
      )?.[1];
      expect(fields, type).toBeTruthy();
      expect(fields, type).not.toMatch(/\bpub\b/);
    }
    expect(new Set(fileSchemaNativeTests).size).toBe(14);
    expect(fileSchemaSemanticMutations.map((mutation) => mutation.id)).toEqual(
      Array.from(
        { length: 15 },
        (_, i) => `M${String(i + 1).padStart(2, "0")}`,
      ),
    );
    expect(fileSchemaNativeEquivalents).toHaveLength(2);
    expect(fileSchemaCompilerProbes).toHaveLength(3);
    for (const patch of [
      ...fileSchemaSemanticMutations,
      ...fileSchemaNativeEquivalents,
      ...fileSchemaCompilerProbes.map((probe) => probe.relaxation),
    ]) {
      const source = files[patch.sourceFile];
      expect(sha256(source)).toBe(patch.sourceSha256);
      expect(source.split(patch.before)).toHaveLength(2);
      expect(sha256(source.replace(patch.before, () => patch.after))).toBe(
        patch.patchedSourceSha256,
      );
    }
    for (const mutation of fileSchemaSemanticMutations) {
      expect(fileSchemaNativeTests).toContain(mutation.expectedTest);
      const assertion = mutation.assertion;
      expect(assertion.sourceFile).toBe(`tests/${mutation.target}.rs`);
      expect(sha256(files[assertion.sourceFile])).toBe(assertion.sourceSha256);
      expect(
        files[assertion.sourceFile]
          .split("\n")
          [assertion.line - 1].slice(assertion.column - 1),
      ).toBe(assertion.sourceLine);
    }
    for (const probe of fileSchemaCompilerProbes) {
      expect(sha256(probe.forbiddenSource)).toBe(probe.forbiddenSha256);
      expect(sha256(probe.accessorSource)).toBe(probe.accessorSha256);
      expect(
        probe.forbiddenSource.split("\n")[probe.diagnostic.line - 1].trim(),
      ).toBe(probe.diagnostic.sourceLine);
    }
  });
});
