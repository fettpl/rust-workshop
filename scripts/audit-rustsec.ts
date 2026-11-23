/** Audit generated repository downloads and tracked native fixture lockfiles. */
import {
  execFileSync,
  spawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { projects } from "../src/content/course";
import { fileSchemaPackageId } from "./file-schema-package-commands";
import { projectArchiveDownloads } from "./project-archive";

const advisoryDatabaseUrl = "https://github.com/RustSec/advisory-db.git";
const cargoAuditVersion = "0.23.0";
const fixtureLockfilePattern = ":(glob)scripts/fixtures/**/Cargo.lock";

type Origin = { path: string; entry?: string };
type Lockfile = { bytes: Uint8Array; origin: Origin };
type LockfileGroup = { sha256: string; bytes: Uint8Array; origins: Origin[] };
type AuditResult = Pick<
  SpawnSyncReturns<string>,
  "status" | "signal" | "stdout" | "stderr" | "error"
>;

function isLockfile(path: string) {
  return path === "Cargo.lock" || path.endsWith("/Cargo.lock");
}

export function readArchiveLockfiles(
  archive: Uint8Array,
  path: string,
  packageId: string,
  expectedEntries: string[],
): Lockfile[] {
  const manifest = `${packageId}/Cargo.toml`;
  const expected = new Set(expectedEntries);
  const seen = new Set<string>();
  let hasManifest = false;
  try {
    const entries = unzipSync(archive, {
      // Only decompress lockfiles. ZIP paths never become filesystem paths.
      filter: ({ name }) => {
        if (name === manifest) hasManifest = true;
        if (!isLockfile(name)) return false;
        if (!expected.has(name)) throw new Error(`unexpected ${name}`);
        if (seen.has(name)) throw new Error(`duplicate ${name}`);
        seen.add(name);
        return true;
      },
    });
    if (!hasManifest) throw new Error(`missing ${manifest}`);
    return expectedEntries.map((entry) => {
      if (!Object.hasOwn(entries, entry)) throw new Error(`missing ${entry}`);
      const bytes = entries[entry];
      if (!bytes.length) throw new Error(`empty ${entry}`);
      return { bytes, origin: { path, entry } };
    });
  } catch (error) {
    throw new Error(`Unable to read ${path}: ${errorMessage(error)}`, {
      cause: error,
    });
  }
}

export function groupLockfiles(lockfiles: Lockfile[]): LockfileGroup[] {
  const groups = new Map<string, LockfileGroup>();
  for (const { bytes, origin } of lockfiles) {
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const group = groups.get(sha256);
    if (group) group.origins.push(origin);
    else groups.set(sha256, { sha256, bytes, origins: [origin] });
  }
  return [...groups.values()];
}

function readRepositoryFile(repository: string, path: string) {
  const target = join(repository, path);
  if (
    !target.startsWith(repository + sep) ||
    !lstatSync(target).isFile() ||
    realpathSync(target) !== target
  )
    throw new Error(`Expected a regular repository file at ${path}`);
  const bytes = readFileSync(target);
  if (!bytes.length) throw new Error(`Empty repository file at ${path}`);
  return bytes;
}

export function collectLockfiles(repository: string) {
  const archives: string[] = [];
  const locklessArchives: string[] = [];
  const lockfiles: Lockfile[] = [];
  for (const { package: project } of projects) {
    if (!project) continue;
    const entries = project.files
      .filter(({ path }) => isLockfile(path))
      .map(({ path }) => `${project.id}/${path}`);
    // The file-schema exercises generate a lockfile later in their own verifier.
    if (
      !entries.includes(`${project.id}/Cargo.lock`) &&
      project.id !== fileSchemaPackageId
    )
      throw new Error(`Missing authored root Cargo.lock for ${project.id}`);
    for (const { url } of projectArchiveDownloads(project)) {
      const path = `public${url}`;
      const members = readArchiveLockfiles(
        readRepositoryFile(repository, path),
        path,
        project.id,
        entries,
      );
      archives.push(path);
      lockfiles.push(...members);
      if (!members.length) locklessArchives.push(path);
    }
  }
  if (!lockfiles.length)
    throw new Error("No Cargo.lock entries in downloadable project archives");

  const fixtures = git(repository, [
    "ls-files",
    "-z",
    "--error-unmatch",
    "--",
    fixtureLockfilePattern,
  ])
    .split("\0")
    .filter(Boolean);
  for (const path of fixtures)
    lockfiles.push({
      bytes: readRepositoryFile(repository, path),
      origin: { path },
    });
  return { archives, locklessArchives, groups: groupLockfiles(lockfiles) };
}

type AuditReport = {
  database?: { "advisory-count": number };
  lockfile?: { "dependency-count": number };
  vulnerabilities?: { found: boolean; count: number; list: unknown[] };
  warnings?: Record<string, unknown[]>;
};

function readAuditReport(stdout: string) {
  const audit = JSON.parse(stdout) as AuditReport | null;
  const { database, lockfile, vulnerabilities, warnings } = audit ?? {};
  if (
    !database ||
    !Number.isSafeInteger(database["advisory-count"]) ||
    database["advisory-count"] < 1 ||
    !lockfile ||
    !Number.isSafeInteger(lockfile["dependency-count"]) ||
    lockfile["dependency-count"] < 1 ||
    !Array.isArray(vulnerabilities?.list) ||
    vulnerabilities.count !== vulnerabilities.list.length ||
    vulnerabilities.found !== vulnerabilities.count > 0 ||
    !warnings ||
    typeof warnings !== "object" ||
    Array.isArray(warnings) ||
    !Object.values(warnings).every(Array.isArray)
  )
    throw new Error("Invalid cargo-audit report fields");
  return { audit, vulnerabilities, warnings };
}

type FindingKind = "vulnerability" | "unsound" | "unmaintained" | "notice";
type Finding = {
  advisoryId: string;
  packageName: string;
  packageVersion: string;
  kind: FindingKind;
  origins: Origin[];
};

function isWarningKind(
  kind: string,
): kind is Exclude<FindingKind, "vulnerability"> {
  return kind === "unsound" || kind === "unmaintained" || kind === "notice";
}

function normalizeFindings(
  entries: unknown[],
  kind: FindingKind,
  origins: Origin[],
  findings: Finding[],
  errors: string[],
) {
  for (const [index, entry] of entries.entries()) {
    const data = entry as {
      advisory?: { id?: unknown };
      package?: { name?: unknown; version?: unknown };
    } | null;
    const advisoryId = data?.advisory?.id;
    const packageName = data?.package?.name;
    const packageVersion = data?.package?.version;
    if (
      typeof advisoryId !== "string" ||
      !/^RUSTSEC-\d{4}-\d{4,}$/.test(advisoryId) ||
      typeof packageName !== "string" ||
      !/^[a-z0-9_-]+$/i.test(packageName) ||
      typeof packageVersion !== "string" ||
      !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(packageVersion)
    ) {
      errors.push(
        `Invalid cargo-audit ${kind} finding #${index + 1} (expected advisory ID, package name, and version)`,
      );
      continue;
    }

    findings.push({ advisoryId, packageName, packageVersion, kind, origins });
    if (kind === "vulnerability" || kind === "unsound") {
      const label =
        kind === "vulnerability"
          ? "Security vulnerability"
          : "Unsound advisory";
      errors.push(`${label} ${advisoryId} in ${packageName}@${packageVersion}`);
    }
  }
}

export function auditLockfiles(
  groups: LockfileGroup[],
  scratch: string,
  database: string,
  run: (args: string[]) => AuditResult,
) {
  return groups.map(({ sha256, bytes, origins }) => {
    const lock = join(scratch, `${sha256}.lock`);
    writeFileSync(lock, bytes, { flag: "wx" });
    const result = run([
      "audit",
      "--file",
      lock,
      "--db",
      database,
      "--no-fetch",
      "--no-yanked",
      "--deny",
      "unsound",
      "--json",
    ]);
    const errors = [];
    const findings: Finding[] = [];
    if (result.error) errors.push(result.error.message);
    if (result.signal)
      errors.push(`cargo-audit terminated by ${result.signal}`);
    if (result.status !== 0)
      errors.push(`cargo-audit exit status ${result.status}`);

    let audit = null;
    try {
      const parsed = readAuditReport(result.stdout);
      audit = parsed.audit;
      normalizeFindings(
        parsed.vulnerabilities.list,
        "vulnerability",
        origins,
        findings,
        errors,
      );
      for (const [kind, entries] of Object.entries(parsed.warnings)) {
        if (isWarningKind(kind))
          normalizeFindings(entries, kind, origins, findings, errors);
        else
          errors.push(
            `Unexpected cargo-audit warning category ${JSON.stringify(kind)}`,
          );
      }
    } catch {
      errors.push("Invalid or incomplete cargo-audit report");
    }
    return {
      sha256,
      origins,
      status: result.status,
      signal: result.signal,
      errors,
      findings,
      audit,
      stderr: result.stderr,
      invalidOutput: audit === null ? result.stdout : undefined,
    };
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function git(cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
  return execFileSync("git", args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 60_000,
  });
}

function main() {
  const repository = realpathSync(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  const reportPath = join(
    repository,
    "test-results",
    "rustsec-audit",
    "report.json",
  );
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCommit: null as string | null,
    tool: {
      version: null as string | null,
      requiredVersion: cargoAuditVersion,
    },
    advisoryDatabase: {
      url: advisoryDatabaseUrl,
      revision: null as string | null,
    },
    archives: [] as string[],
    locklessArchives: [] as string[],
    lockfiles: [] as Omit<LockfileGroup, "bytes">[],
    scans: [] as ReturnType<typeof auditLockfiles>,
    errors: [] as string[],
  };
  let scratch: string | undefined;
  try {
    if (process.argv.length !== 2)
      throw new Error("This audit takes no arguments");
    report.sourceCommit = git(repository, ["rev-parse", "HEAD"]).trim();
    const { archives, locklessArchives, groups } = collectLockfiles(repository);
    report.archives = archives;
    report.locklessArchives = locklessArchives;
    report.lockfiles = groups.map(({ sha256, origins }) => ({
      sha256,
      origins,
    }));

    scratch = mkdtempSync(join(tmpdir(), "rust-workshop-rustsec-"));
    const database = join(scratch, "advisory-db");
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      PATH: process.env.PATH,
      HOME: scratch,
      CARGO_HOME: join(scratch, "cargo"),
      CARGO_NET_OFFLINE: "true",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
    };
    const run = (args: string[]) =>
      spawnSync("cargo-audit", args, {
        cwd: scratch,
        env,
        encoding: "utf8",
        timeout: 30_000,
        maxBuffer: 4 * 1024 * 1024,
      });
    const version = run(["audit", "--version"]);
    report.tool.version = version.stdout?.trim() || null;
    if (
      version.status !== 0 ||
      report.tool.version !== `cargo-audit-audit ${cargoAuditVersion}`
    )
      throw new Error(
        `Expected cargo-audit ${cargoAuditVersion}: ${version.error?.message ?? (report.tool.version || version.stderr)}`,
      );

    git(
      scratch,
      ["clone", "--quiet", "--depth=1", advisoryDatabaseUrl, database],
      env,
    );
    const revision = git(
      database,
      ["rev-parse", "--verify", "HEAD"],
      env,
    ).trim();
    if (!/^[0-9a-f]{40}$/.test(revision))
      throw new Error("Missing RustSec advisory database revision");
    report.advisoryDatabase.revision = revision;
    report.scans = auditLockfiles(groups, scratch, database, run);
    for (const scan of report.scans) {
      if (scan.errors.length) {
        const origins = scan.origins.map(({ path, entry }) =>
          entry ? `${path}!${entry}` : path,
        );
        report.errors.push(
          `${scan.errors.join(", ")} [${scan.sha256}]\n  ${origins.join("\n  ")}`,
        );
      }
    }
  } catch (error) {
    report.errors.push(errorMessage(error));
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    mkdirSync(join(repository, "test-results", "rustsec-audit"), {
      recursive: true,
    });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (report.errors.length) {
    for (const error of report.errors) console.error(error);
    process.exitCode = 1;
  }
  console.log(
    `RustSec database ${report.advisoryDatabase.revision ?? "unavailable"}: ${report.scans.length}/${report.lockfiles.length} distinct lockfiles from ${report.archives.length} ZIPs and tracked fixtures. Report: ${reportPath}`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
