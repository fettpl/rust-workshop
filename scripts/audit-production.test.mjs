import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { after, describe, it } from "node:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = join(repositoryRoot, "scripts/audit-production.mjs");
const testRoot = mkdtempSync(join(tmpdir(), "audit-production-policy-"));

const npmStub = `
import { readFileSync } from "node:fs";

const production = process.argv.includes("--omit=dev");
if (process.env.AUDIT_STUB_MODE === "signal" && production)
  process.kill(process.pid, "SIGTERM");
process.stdout.write(readFileSync(process.env.AUDIT_FIXTURE_PATH, "utf8"));
process.exitCode = Number(
  process.env[production ? "AUDIT_PRODUCTION_STATUS" : "AUDIT_FULL_STATUS"] ?? "1",
);
`;

const counts = ({ moderate = 0, high = 0, critical = 0 } = {}) => ({
  info: 0,
  low: 0,
  moderate,
  high,
  critical,
  total: moderate + high + critical,
});

function runCase(name, output, options = {}) {
  const caseDirectory = mkdtempSync(join(testRoot, `${name}-`));
  const fixturePath = join(caseDirectory, "audit-output");
  const stubPath = join(caseDirectory, "npm-stub.mjs");
  const reportDirectory = join(caseDirectory, "reports");
  writeFileSync(fixturePath, output);
  writeFileSync(stubPath, npmStub);

  const environment = {
    ...process.env,
    AUDIT_REPORT_DIR: reportDirectory,
    AUDIT_FIXTURE_PATH: fixturePath,
    AUDIT_FULL_STATUS: String(options.fullStatus ?? 1),
    AUDIT_PRODUCTION_STATUS: String(options.productionStatus ?? 0),
    AUDIT_STUB_MODE: options.stubMode ?? "normal",
    npm_execpath: options.startupFailure
      ? join(caseDirectory, "missing.mjs")
      : stubPath,
  };
  const result = spawnSync(process.execPath, [helperPath], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: environment,
  });

  for (const file of ["full.json", "production.json", "summary.json"])
    assert.ok(
      existsSync(join(reportDirectory, file)),
      `${name}: retained ${file}`,
    );

  return {
    result,
    summary: JSON.parse(
      readFileSync(join(reportDirectory, "summary.json"), "utf8"),
    ),
  };
}

after(() => rmSync(testRoot, { recursive: true, force: true }));

describe("production audit policy", () => {
  it("allows moderate-only production findings when npm exits successfully", () => {
    const outcome = runCase(
      "moderate-only",
      JSON.stringify({
        auditReportVersion: 2,
        metadata: { vulnerabilities: counts({ moderate: 2 }) },
      }),
      { fullStatus: 1, productionStatus: 0 },
    );
    assert.equal(outcome.result.status, 0);
    assert.equal(outcome.summary.reports[1].status, 0);
    assert.equal(outcome.summary.errors.length, 0);
  });

  for (const [name, vulnerabilities] of [
    ["high-status-zero", counts({ high: 1 })],
    ["critical-status-zero", counts({ critical: 1 })],
    ["high-critical-status-zero", counts({ high: 1, critical: 1 })],
  ]) {
    it(`blocks ${name} independently of npm status`, () => {
      const outcome = runCase(
        name,
        JSON.stringify({
          auditReportVersion: 2,
          metadata: { vulnerabilities },
        }),
        { fullStatus: 1, productionStatus: 0 },
      );
      assert.equal(outcome.result.status, 1);
      assert.match(outcome.summary.errors.join("\n"), /high|critical/);
    });
  }

  it("blocks a nonzero production status even when counts are zero", () => {
    const outcome = runCase(
      "nonzero-zero-counts",
      JSON.stringify({
        auditReportVersion: 2,
        metadata: { vulnerabilities: counts() },
      }),
      { fullStatus: 0, productionStatus: 1 },
    );
    assert.equal(outcome.result.status, 1);
    assert.equal(outcome.summary.reports[1].status, 1);
  });

  for (const [name, vulnerabilities] of [
    ["missing-count", { info: 0, low: 0, moderate: 0, high: 0, critical: 0 }],
    ["negative-count", { ...counts(), high: -1 }],
    ["string-count", { ...counts(), high: "0" }],
    ["array-counts", []],
    ["array-count-field", { ...counts(), high: [] }],
  ]) {
    it(`rejects ${name} as malformed audit metadata`, () => {
      const outcome = runCase(
        name,
        JSON.stringify({
          auditReportVersion: 2,
          metadata: { vulnerabilities },
        }),
      );
      assert.equal(outcome.result.status, 1);
      assert.match(outcome.summary.errors.join("\n"), /valid npm audit JSON/);
    });
  }

  it("rejects invalid JSON and registry error responses", () => {
    for (const [name, output] of [
      ["invalid-json", "registry unavailable"],
      ["registry-error", JSON.stringify({ error: { code: "EAI_AGAIN" } })],
    ]) {
      const outcome = runCase(name, output);
      assert.equal(outcome.result.status, 1);
      assert.match(outcome.summary.errors.join("\n"), /valid npm audit JSON/);
    }
  });

  it("rejects a terminated audit process and retains all reports", () => {
    const outcome = runCase(
      "signal",
      JSON.stringify({
        auditReportVersion: 2,
        metadata: { vulnerabilities: counts() },
      }),
      { stubMode: "signal" },
    );
    assert.equal(outcome.result.status, 1);
    assert.match(
      outcome.summary.errors.join("\n"),
      /terminated|valid npm audit JSON/,
    );
  });

  it("rejects an audit process that cannot start and retains all reports", () => {
    const outcome = runCase(
      "startup-failure",
      JSON.stringify({
        auditReportVersion: 2,
        metadata: { vulnerabilities: counts() },
      }),
      { startupFailure: true },
    );
    assert.equal(outcome.result.status, 1);
    assert.match(
      outcome.summary.errors.join("\n"),
      /could not start|valid npm audit JSON/,
    );
  });
});
