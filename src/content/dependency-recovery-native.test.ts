import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { dependencyRecoverySteps } from "./dependency-assurance-recovery";

const mutations: Record<string, [string, string]> = {
  "dependency-graph-diagnosis-edge-audit-transfer": [
    "edges.iter().filter(|e| e.enabled).collect()",
    "edges.iter().collect()",
  ],
  "dependency-source-license-policy-batch-transfer": [
    'e.source == "registry" && ',
    "",
  ],
  "dependency-source-license-policy-reason-transfer": [
    'source == "registry"',
    "true",
  ],
  "dependency-advisory-exceptions-scope-transfer": [
    " && as_of <= row.expires_ymd",
    "",
  ],
  "dependency-advisory-exceptions-ledger-transfer": [
    "if !([row.advisory,row.package,row.owner,row.scope,row.reason].iter().all(|s| !s.is_empty()))",
    "if false",
  ],
  "dependency-release-dossier-missing-transfer": [
    "if proof.config.is_empty() { reasons.push(HoldReason::Config); }",
    "",
  ],
  "dependency-release-dossier-batch-transfer": [" && !row.publish", ""],
};

it.each(Object.values(dependencyRecoverySteps).flat())(
  "$id rejects its compiling contract regression",
  (step) => {
    const [before, after] = mutations[step.id];
    const solution = step.solution!;
    expect(solution).toContain(before);
    expect(step.evaluator?.kind).toBe("tests");
    if (step.evaluator?.kind !== "tests") return;
    const directory = mkdtempSync(
      join(tmpdir(), "dependency-recovery-mutant-"),
    );
    try {
      const source = join(directory, "fixture.rs");
      const binary = join(directory, "fixture");
      writeFileSync(
        source,
        appendHiddenTests(
          solution.replace(before, after),
          step.evaluator.tests,
        ),
      );
      const compiled = spawnSync(
        "rustc",
        ["--edition=2024", "--test", source, "-o", binary],
        { cwd: directory, encoding: "utf8", timeout: 60_000 },
      );
      expect(compiled.error).toBeUndefined();
      expect(compiled.status, compiled.stderr).toBe(0);
      const executed = spawnSync(binary, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
      });
      expect(executed.error).toBeUndefined();
      expect(executed.signal).toBeNull();
      expect(executed.status, executed.stdout + executed.stderr).toBe(101);
      expect(executed.stdout).toContain("FAILED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
