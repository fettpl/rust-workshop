import { describe, expect, it } from "vitest";
import { evaluate } from "@/engine/evaluate";
import {
  cargoDependencyCompetencies,
  cargoDependencyConcepts,
  cargoDependencyLessons,
  cargoDependencyReviewExercises,
  cargoDependencySources,
} from "./cargo-dependencies";

describe("kurs zależności i feature Cargo", () => {
  it("publikuje dwa kompletne, manifestowe kontrakty", () => {
    expect(cargoDependencyLessons.map((lesson) => lesson.id)).toEqual([
      "cargo-dependency-contract",
      "cargo-resolver-feature-unification",
    ]);
    expect(cargoDependencyConcepts).toHaveLength(2);
    expect(cargoDependencyCompetencies.length).toBeGreaterThanOrEqual(2);
    expect(
      cargoDependencySources.every(
        (source) => source.reviewedAt === "2026-09-17",
      ),
    ).toBe(true);
    expect(Object.keys(cargoDependencyReviewExercises)).toEqual([
      "cargo-dependency-contract",
      "cargo-resolver-feature-unification",
    ]);
    const expectedEditorFiles: Record<string, string> = {
      "cargo-dependency-contract-observe": "Cargo.toml",
      "cargo-dependency-contract-gate": "Cargo.toml",
      "cargo-dependency-contract-blank": "catalog-tool/Cargo.toml",
      "cargo-resolver-feature-unification-observe":
        "feature-observation/Cargo.toml",
      "cargo-resolver-feature-unification-gate":
        "crates/frame-protocol/Cargo.toml",
      "cargo-resolver-feature-unification-blank":
        "crates/packet-cli/Cargo.toml",
    };
    for (const lesson of cargoDependencyLessons) {
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(8);
      expect(lesson.steps.every((step) => step.prompt.trim().length > 0)).toBe(
        true,
      );
      for (const step of lesson.steps.filter(
        (candidate) => candidate.editorMode === "toml",
      )) {
        expect(step.editorFile).toBeTruthy();
        expect(step.editorFile).toBe(expectedEditorFiles[step.id]);
        expect(step.expectedStatus).toBeUndefined();
      }
    }
  });

  it("przepuszcza rozwiązania, odrzuca startery bramek i pozostawia blank bez kodu", () => {
    for (const lesson of cargoDependencyLessons) {
      const manifestSteps = lesson.steps.filter(
        (step) => step.evaluator?.kind === "manifest-contract",
      );
      expect(manifestSteps.length).toBe(2);
      for (const step of manifestSteps) {
        expect(step.solution).toBeTruthy();
        expect(
          evaluate(step.evaluator!, { code: step.solution }),
        ).toMatchObject({
          passed: true,
        });
        if (step.code !== undefined) {
          expect(evaluate(step.evaluator!, { code: step.code }).passed).toBe(
            false,
          );
        }
      }
      const blank = lesson.steps.find((step) => step.id.endsWith("-blank"));
      expect(blank?.code).toBeUndefined();
      expect(blank?.evidenceKind).toBe("transfer");
      expect(blank?.evidenceGate).toBe(true);
    }
  });

  it("ma dwa niezależne manifestowe ćwiczenia powtórkowe", () => {
    for (const [conceptId, step] of Object.entries(
      cargoDependencyReviewExercises,
    )) {
      expect(step.kind).toBe("recall");
      expect(step.editorMode).toBe("toml");
      expect(step.editorFile).toBeTruthy();
      expect(step.editorFile).toBe(
        conceptId === "cargo-dependency-contract"
          ? "telemetry/Cargo.toml"
          : "crates/telemetry-cli/Cargo.toml",
      );
      expect(step.evaluator?.kind).toBe("manifest-contract");
      expect(step.solution).toBeTruthy();
      expect(evaluate(step.evaluator!, { code: step.solution })).toMatchObject({
        passed: true,
      });
      expect(step.id).toBe(`${conceptId}-review`);
    }
  });

  it("akceptuje równoważne formy zależności i kolejność feature", () => {
    const dependencyStep = cargoDependencyLessons[0].steps.find(
      (step) => step.id === "cargo-dependency-contract-gate",
    )!;
    const dependency = dependencyStep.evaluator!;
    expect(
      evaluate(dependency, {
        code: `[workspace]\nmembers=["crates/frame-probe","crates/frame-protocol"]\nresolver="3"\n[workspace.package]\nrust-version="1.85.0"\npublish=false\n[workspace.dependencies]\nserde = { default-features = false, version = "^1.0.229" }`,
      }).passed,
    ).toBe(true);

    const featureStep = cargoDependencyLessons[1].steps.find(
      (step) => step.id === "cargo-resolver-feature-unification-gate",
    )!;
    expect(
      evaluate(featureStep.evaluator!, {
        code: `[package]\nname="frame-protocol"\nversion.workspace=true\nedition.workspace=true\nrust-version.workspace=true\nauthors.workspace=true\ndescription.workspace=true\nlicense.workspace=true\nrepository.workspace=true\nreadme.workspace=true\npublish.workspace=true\n[features]\nformat=["serde/derive","dep:serde","serde/alloc"]\ndefault=[]\ndiagnostics=[]\n[dependencies]\nserde={optional=true,workspace=true}\n[lints]\nworkspace=true`,
      }).passed,
    ).toBe(true);

    const dependencyBlank = cargoDependencyLessons[0].steps.find(
      (step) => step.id === "cargo-dependency-contract-blank",
    )!;
    expect(
      evaluate(dependencyBlank.evaluator!, {
        code: `[package]\nname="catalog-tool"\nversion="0.1.0"\nedition="2024"\nrust-version="1.85.0"\npublish=false\n[dependencies.wire_serde]\npackage="serde"\nversion="^1.0.229"\ndefault-features=false\n[dev-dependencies.wire_serde]\npackage="serde"\nversion="1.0.229"\ndefault-features=false\nfeatures=["alloc"]`,
      }).passed,
    ).toBe(true);
  });

  it("odrzuca scope, defaults, optionalność, alias i weak forwarding", () => {
    const dependencyStep = cargoDependencyLessons[0].steps.find(
      (step) => step.id === "cargo-dependency-contract-blank",
    )!;
    for (const code of [
      dependencyStep.solution!.replace(
        "[dev-dependencies]",
        "[build-dependencies]",
      ),
      dependencyStep.solution!.replace(
        '\n[dev-dependencies]\nwire_serde = { package = "serde", version = "1.0.229", default-features = false, features = ["alloc"] }\n',
        "\n",
      ),
      dependencyStep.solution!.replace(
        "default-features = false",
        "default-features = true",
      ),
      dependencyStep.solution!.replace(
        'wire_serde = { package = "serde"',
        'wire_serde = { optional = true, package = "serde"',
      ),
      dependencyStep.solution!.replace("wire_serde", "serde"),
      dependencyStep.solution!.replace(
        'version = "1.0.229"',
        'path = "../serde"',
      ),
    ])
      expect(evaluate(dependencyStep.evaluator!, { code }).passed).toBe(false);

    const featureStep = cargoDependencyLessons[1].steps.find(
      (step) => step.id === "cargo-resolver-feature-unification-blank",
    )!;
    for (const code of [
      featureStep.solution!.replace(
        '"packet-lib/diagnostics"',
        '"packet-lib?/diagnostics"',
      ),
      featureStep.solution!.replace('"packet-lib/format"', '"serde/derive"'),
      featureStep.solution!.replace(
        'packet-lib = { path = "../packet-lib" }',
        'serde = "1.0.229"',
      ),
      featureStep.solution!.replace(
        'format = ["packet-lib/format"]',
        'packet-cli = ["packet-lib/format"]',
      ),
      featureStep.solution!.replace(
        "[dependencies]\n",
        '[dependencies]\nserialization = { package = "serde", version = "1.0.229" }\n',
      ),
    ])
      expect(evaluate(featureStep.evaluator!, { code }).passed).toBe(false);

    const featureReview =
      cargoDependencyReviewExercises["cargo-resolver-feature-unification"];
    expect(
      evaluate(featureReview.evaluator!, {
        code: featureReview.solution!.replace(
          'json = ["telemetry_core/json"]',
          'telemetry-cli = ["telemetry_core/json"]',
        ),
      }).passed,
    ).toBe(false);

    const dependencyReview =
      cargoDependencyReviewExercises["cargo-dependency-contract"];
    expect(
      evaluate(dependencyReview.evaluator!, {
        code: dependencyReview.solution!.replace(
          'serde_wire = { package = "serde"',
          'serde_wire = { optional = true, package = "serde"',
        ),
      }).passed,
    ).toBe(false);

    const primary = cargoDependencyLessons[1].steps.find(
      (step) => step.id === "cargo-resolver-feature-unification-gate",
    )!;
    for (const code of [
      primary.solution!.replace('"serde/alloc", ', ""),
      primary.solution!.replace('"serde/derive"', ""),
      primary.solution!.replace("optional = true", "optional = false"),
      primary.solution!.replace(
        "version.workspace = true",
        'version = "1.0.0"',
      ),
      primary.solution!.replace(
        'format = ["dep:serde", "serde/alloc", "serde/derive"]',
        'frame-protocol = ["dep:serde", "serde/alloc", "serde/derive"]',
      ),
    ])
      expect(evaluate(primary.evaluator!, { code }).passed).toBe(false);
  });
});
