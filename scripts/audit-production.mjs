import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const reportDirectory = resolve(
  process.env.AUDIT_REPORT_DIR ?? "test-results/dependency-audit",
);
mkdirSync(reportDirectory, { recursive: true });

const generatedAt = new Date().toISOString();
const errors = [];

function runGit(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch (error) {
    errors.push(`git ${args.join(" ")} failed: ${error.message}`);
    return null;
  }
}

function sha256(path) {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch (error) {
    errors.push(`cannot hash ${path}: ${error.message}`);
    return null;
  }
}

const lockfilePath = resolve("package-lock.json");
const commit = runGit(["rev-parse", "HEAD"]);
const lockfileSha256 = sha256(lockfilePath);

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : "npm";
const npmPrefix = npmExecPath ? [npmExecPath] : [];
const vulnerabilityFields = [
  "info",
  "low",
  "moderate",
  "high",
  "critical",
  "total",
];

function validVulnerabilityCounts(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return vulnerabilityFields.every(
    (field) =>
      Object.hasOwn(value, field) &&
      Number.isInteger(value[field]) &&
      value[field] >= 0,
  );
}

function runAudit(name, args) {
  const command = [npmCommand, ...npmPrefix, ...args];
  const result = spawnSync(npmCommand, [...npmPrefix, ...args], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const reportPath = join(reportDirectory, `${name}.json`);
  writeFileSync(reportPath, stdout);

  let report = null;
  let parseError = null;
  try {
    report = JSON.parse(stdout);
  } catch (error) {
    parseError = error.message;
  }

  const valid =
    parseError === null &&
    Number.isInteger(report?.auditReportVersion) &&
    validVulnerabilityCounts(report?.metadata?.vulnerabilities);

  if (!valid) {
    errors.push(
      `${name} audit did not return a valid npm audit JSON response${parseError ? `: ${parseError}` : ""}`,
    );
  }
  if (result.error)
    errors.push(`${name} audit could not start: ${result.error.message}`);
  if (result.signal)
    errors.push(`${name} audit terminated by ${result.signal}`);

  return {
    name,
    command,
    status: result.status ?? 1,
    signal: result.signal,
    valid,
    reportPath,
    stderr,
    vulnerabilities: valid ? report.metadata.vulnerabilities : null,
  };
}

const full = runAudit("full", ["audit", "--json"]);
const production = runAudit("production", [
  "audit",
  "--omit=dev",
  "--audit-level=high",
  "--json",
]);
const productionHasBlockingFindings =
  production.valid &&
  (production.vulnerabilities.high > 0 ||
    production.vulnerabilities.critical > 0);
if (productionHasBlockingFindings) {
  errors.push(
    `production audit reports high=${production.vulnerabilities.high} and critical=${production.vulnerabilities.critical}`,
  );
}

const summary = {
  schemaVersion: 1,
  generatedAt,
  commit,
  lockfile: { path: "package-lock.json", sha256: lockfileSha256 },
  threshold: "high",
  reports: [full, production].map(({ stderr, ...report }) => ({
    ...report,
    stderr: stderr || null,
  })),
  errors,
};
const summaryPath = join(reportDirectory, "summary.json");
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

for (const report of [full, production]) {
  if (report.stderr)
    process.stderr.write(`${report.name} audit stderr:\n${report.stderr}`);
}

if (
  !full.valid ||
  !production.valid ||
  production.status !== 0 ||
  productionHasBlockingFindings ||
  errors.length
) {
  process.stderr.write(
    `Production audit gate failed; inspect ${summaryPath} and the retained JSON reports.\n`,
  );
  process.exitCode = 1;
}
