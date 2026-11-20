import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { projects } from "./course";

it("wires Service Operations to its authored bounded fixture", () => {
  const project = projects.find((entry) => entry.id === "service-operations");
  expect(project?.package?.id).toBe("service-operations-workshop");
  expect(project?.lessonIds).toEqual([
    "service-trust-admission",
    "service-correlated-telemetry",
    "service-readiness-drain",
    "service-incident-diagnosis",
  ]);
  expect(project?.package?.files.map((file) => file.path)).toEqual(
    expect.arrayContaining([
      "src/operations.rs",
      "tests/operations_contract.rs",
      "THREAT_MODEL.md",
      "RUNBOOK.md",
    ]),
  );
  expect(project?.requiredEvidence).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/payload/),
    ]),
  );
});

it("runs the Service Operations verifier before generic Cargo on stable and MSRV", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { scripts?: Record<string, string> };
  expect(packageJson.scripts?.["precontent:operations"]).toBe(
    "npm run content:packages",
  );
  expect(packageJson.scripts?.["content:operations"]).toBe(
    "node --import tsx scripts/verify-operations.ts",
  );

  const ci = readFileSync(
    new URL("../../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  expect(ci).toMatch(
    /- run: npm run content:operations -- --fetch\n[\s\S]*- run: npm run content:cargo/,
  );
  expect(ci).toMatch(
    /- run: npm run content:operations -- --fetch --msrv\n[\s\S]*- run: npm run content:cargo/,
  );
});

it("requires served Service Operations archives to match authored bytes", () => {
  const verifier = readFileSync(
    new URL("../../scripts/verify-operations.ts", import.meta.url),
    "utf8",
  );
  expect(verifier).toMatch(/Stale Service Operations \$\{variant\} archive/);
  expect(verifier).toMatch(/Missing served \$\{variant\} archive/);
});
