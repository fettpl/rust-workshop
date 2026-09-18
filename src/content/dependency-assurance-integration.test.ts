import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { modules, projects, reviewExercises } from "./course";
import {
  dependencyAssuranceLessons,
  dependencyAssuranceReviewExercises,
} from "./dependency-assurance";
import { dependencyAssuranceModule } from "./dependency-assurance-module";
import {
  projectFiles,
  validateProjectPackage,
} from "../domain/project-package";
import { frameProtocolPackage } from "./projects/frame-protocol";

it("connects Dependency Assurance to eight gates and four coding retrievals", () => {
  const lessonIds = dependencyAssuranceLessons.map((lesson) => lesson.id);
  expect(
    modules.find((module) => module.id === dependencyAssuranceModule.id),
  ).toBe(dependencyAssuranceModule);
  expect(dependencyAssuranceModule.lessonIds).toEqual(lessonIds);
  expect(dependencyAssuranceModule.gateCriteria).toHaveLength(8);
  expect(
    dependencyAssuranceLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evidenceGate),
    ),
  ).toHaveLength(8);
  for (const lesson of dependencyAssuranceLessons) {
    expect(lesson.steps.filter((step) => step.kind === "blank")).toHaveLength(
      1,
    );
    expect(
      lesson.steps.filter(
        (step) => step.kind === "recall" && step.evaluator?.kind === "tests",
      ),
    ).toHaveLength(1);
    expect(reviewExercises[lesson.conceptIds[0]]?.evaluator?.kind).toBe(
      "tests",
    );
  }
});

it("compiles and runs every independent reference fixture", () => {
  const steps = [
    ...dependencyAssuranceLessons.flatMap((lesson) =>
      lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
    ),
  ];
  const reviewSteps = Object.values(dependencyAssuranceReviewExercises);
  const fixtures = [...steps, ...reviewSteps];
  expect(fixtures).toHaveLength(16);

  for (const step of fixtures) {
    if (!step.solution || step.evaluator?.kind !== "tests") {
      throw new Error(`Missing reference fixture: ${step.id}`);
    }
    const directory = mkdtempSync(join(tmpdir(), "dependency-assurance-"));
    try {
      const source = join(directory, "fixture.rs");
      const binary = join(directory, "fixture");
      writeFileSync(
        source,
        appendHiddenTests(step.solution, step.evaluator.tests),
      );
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", source, "-o", binary],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error, `${step.id}: compiler`).toBeUndefined();
      expect(compiled.status, `${step.id}: ${compiled.stderr}`).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
      });
      expect(executed.error, `${step.id}: runner`).toBeUndefined();
      expect(
        executed.status,
        `${step.id}: ${executed.stdout}${executed.stderr}`,
      ).toBe(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}, 30_000);

it("keeps the Frame Protocol supply-chain artifacts bounded and fail-closed", () => {
  expect(validateProjectPackage(frameProtocolPackage)).toEqual([]);
  const files = projectFiles(frameProtocolPackage, "solution");
  expect(files["deny.toml"]).toContain('multiple-versions = "deny"');
  expect(files["deny.toml"]).toContain('unknown = "deny"');
  expect(files["DEPENDENCY-POLICY.md"]).toContain("bounded");
  expect(files["RELEASE-CHECKLIST.md"]).toContain(
    "authored solution ZIP listing",
  );
  expect(files["exceptions/advisories.toml"]).toContain("expires_ymd");
  expect(files["evidence/duplicate-dependencies.toml"]).toContain(
    'status = "hold"',
  );
  expect(files["evidence/duplicate-dependencies.toml"]).toMatch(/synthetic/i);
  expect(files["evidence/actual-cargo-tree.txt"]).toContain(
    'duplicate_status = "not-observed"',
  );
  expect(files["evidence/cargo-deny-snapshot.json"]).toContain(
    '"network_access": false',
  );
  expect(files["evidence/cargo-deny-snapshot.json"]).toContain(
    '"execution_status": "unsupported/infrastructure"',
  );
  expect(files["evidence/release-evidence.json"]).toContain('"publish": false');
  expect(files["evidence/release-evidence.json"]).toMatch(
    /"manifest_sha256": "sha256:[0-9a-f]{64}"/,
  );
  expect(files["evidence/release-evidence.json"]).toContain(
    '"archive_kind": "authored-project-zip"',
  );
  expect(files["fixtures/external-consumer/src/main.rs"]).toContain(
    "Frame::try_from_payload",
  );
  expect(
    projects.find((project) => project.id === "frame-protocol")?.lessonIds,
  ).toEqual(expect.arrayContaining(dependencyAssuranceModule.lessonIds));
});

it("keeps negative fixture cases tied to required fields", () => {
  const stepTests = (lessonId: string, stepId: string) => {
    const lesson = dependencyAssuranceLessons.find(
      (candidate) => candidate.id === lessonId,
    );
    const step = lesson?.steps.find((candidate) => candidate.id === stepId);
    if (!step || step.evaluator?.kind !== "tests") {
      throw new Error(`Missing evaluator tests: ${lessonId}/${stepId}`);
    }
    return step.evaluator.tests;
  };

  expect(
    stepTests("dependency-graph-diagnosis", "dependency-graph-diagnosis-gate"),
  ).toContain('source: "git"');
  expect(
    stepTests(
      "dependency-source-license-policy",
      "dependency-source-license-policy-gate",
    ),
  ).toContain('policy("path", "Apache-2.0")');
  expect(
    stepTests(
      "dependency-advisory-exceptions",
      "dependency-advisory-exceptions-gate",
    ),
  ).toContain('owner: ""');
  expect(
    stepTests(
      "dependency-advisory-exceptions",
      "dependency-advisory-exceptions-gate",
    ),
  ).toContain("20261001");
  const dossier = stepTests(
    "dependency-release-dossier",
    "dependency-release-dossier-gate",
  );
  expect(dossier).toContain('artifact: ""');
  expect(dossier).toContain('config: ""');
  expect(dossier).toContain("consumer: false");
  expect(dossier).toContain("publish: true");
});

it("registers the restricted supply-chain verifier in npm and CI", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { scripts?: Record<string, string> };
  expect(packageJson.scripts?.["content:supply-chain"]).toBe(
    "node --import tsx scripts/verify-supply-chain.ts",
  );
  const verifier = readFileSync(
    new URL("../../scripts/verify-supply-chain.ts", import.meta.url),
    "utf8",
  );
  expect(verifier).toContain("Only --fetch and --msrv are supported");
  expect(verifier).toContain("publish = false");
  expect(verifier).toContain("sha256File");
  expect(verifier).toContain("fixtures/external-consumer/Cargo.toml");
  const ci = readFileSync(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  expect(ci).toMatch(/content:supply-chain -- --fetch[\s\S]*content:cargo/);
  expect(ci).toMatch(
    /content:supply-chain -- --fetch --msrv[\s\S]*content:cargo/,
  );
});
