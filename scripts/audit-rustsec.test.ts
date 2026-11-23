import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, unzipSync, zipSync } from "fflate";
import { expect, it } from "vitest";
import { projects } from "../src/content/course";
import {
  auditLockfiles,
  collectLockfiles,
  groupLockfiles,
  readArchiveLockfiles,
} from "./audit-rustsec";

it("binds every real starter and solution ZIP and tracked fixture to its lockfile bytes", () => {
  const repository = realpathSync(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  const scratch = mkdtempSync(join(realpathSync(tmpdir()), "rustsec-catalog-"));
  try {
    const fixtures = execFileSync(
      "git",
      ["ls-files", "-z", "--", "scripts/fixtures"],
      {
        cwd: repository,
        encoding: "utf8",
      },
    )
      .split("\0")
      .filter((path) => path.endsWith("/Cargo.lock"));
    expect(fixtures).toEqual(
      expect.arrayContaining([
        "scripts/fixtures/api-release/Cargo.lock",
        "scripts/fixtures/macro-contracts/Cargo.lock",
        "scripts/fixtures/tokio-runtime-1.54.1/Cargo.lock",
      ]),
    );
    for (const path of fixtures) {
      mkdirSync(dirname(join(scratch, path)), { recursive: true });
      writeFileSync(join(scratch, path), readFileSync(join(repository, path)));
    }
    execFileSync("git", ["init", "--quiet"], { cwd: scratch });
    execFileSync("git", ["add", "--", ...fixtures], { cwd: scratch });
    writeFileSync(join(scratch, "scripts/fixtures/Cargo.lock"), "untracked");

    execFileSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        join(repository, "scripts/build-project-assets.ts"),
      ],
      { cwd: scratch, timeout: 30_000 },
    );

    const downloads = [
      "public/projects",
      "public/localized-projects/en",
      "public/localized-projects/pl",
    ];
    const expectedArchives = projects.flatMap(({ package: archive }) =>
      archive
        ? downloads.flatMap((directory) =>
            ["starter", "solution"].map(
              (variant) => `${directory}/${archive.id}/${variant}.zip`,
            ),
          )
        : [],
    );
    const { archives, locklessArchives, groups } = collectLockfiles(scratch);
    expect(archives.toSorted()).toEqual(expectedArchives.toSorted());
    expect(archives.toSorted()).toEqual(
      globSync(
        ["public/projects/**/*.zip", "public/localized-projects/**/*.zip"],
        { cwd: scratch },
      ).toSorted(),
    );
    expect(locklessArchives.toSorted()).toEqual(
      downloads
        .flatMap((directory) => [
          `${directory}/file-schema-evolution-workshop/starter.zip`,
          `${directory}/file-schema-evolution-workshop/solution.zip`,
        ])
        .toSorted(),
    );

    const recordedLocks = groups.flatMap(({ sha256, origins }) =>
      origins.map(({ path, entry }) => ({ path, entry, sha256 })),
    );
    const expectedLocks = expectedArchives.flatMap((path) =>
      Object.entries(unzipSync(readFileSync(join(scratch, path))))
        .filter(([entry]) => entry.endsWith("/Cargo.lock"))
        .map(([entry, bytes]) => ({
          path,
          entry,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        })),
    );
    expect(expectedLocks.map(({ entry }) => entry)).toEqual(
      expect.arrayContaining([
        "mini-grep-workshop/fuzz/Cargo.lock",
        "miri-safety-workshop/fixtures/Cargo.lock",
      ]),
    );
    expect(recordedLocks).toHaveLength(expectedLocks.length + fixtures.length);
    expect(recordedLocks).toEqual(
      expect.arrayContaining([
        ...expectedLocks,
        ...fixtures.map((path) => ({
          path,
          sha256: createHash("sha256")
            .update(readFileSync(join(repository, path)))
            .digest("hex"),
        })),
      ]),
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}, 30_000);

const project = "audit-fixture";
const archivePath = "public/localized-projects/en/audit-fixture/starter.zip";
const rootLock = `${project}/Cargo.lock`;
const nestedLock = `${project}/examples/fixture/Cargo.lock`;
const starterLock = strToU8(
  'version = 4\n\n[[package]]\nname = "starter"\nversion = "0.1.0"\n',
);
const solutionLock = strToU8(
  'version = 4\n\n[[package]]\nname = "solution"\nversion = "0.1.0"\n',
);

function fixtureArchive(files: Record<string, Uint8Array>) {
  return zipSync({
    [`${project}/Cargo.toml`]: strToU8('[package]\nname = "audit-fixture"\n'),
    [`${project}/src/main.rs`]: strToU8("fn main() {}"),
    ...files,
  });
}

it("reads the actual top-level and nested Cargo.lock bytes in a ZIP", () => {
  const locks = readArchiveLockfiles(
    fixtureArchive({ [rootLock]: starterLock, [nestedLock]: solutionLock }),
    archivePath,
    project,
    [rootLock, nestedLock],
  );
  expect(locks).toEqual([
    { bytes: starterLock, origin: { path: archivePath, entry: rootLock } },
    { bytes: solutionLock, origin: { path: archivePath, entry: nestedLock } },
  ]);
});

it("records deliberate lockless archives and rejects missing or unexpected members", () => {
  const noLocks = fixtureArchive({});
  expect(readArchiveLockfiles(noLocks, archivePath, project, [])).toEqual([]);
  expect(() =>
    readArchiveLockfiles(noLocks, archivePath, project, [rootLock]),
  ).toThrow(/missing.*Cargo\.lock/i);
  expect(() =>
    readArchiveLockfiles(
      fixtureArchive({
        [rootLock]: starterLock,
        "../unknown/Cargo.lock": starterLock,
      }),
      archivePath,
      project,
      [rootLock],
    ),
  ).toThrow(/unexpected.*Cargo\.lock/i);
  expect(() =>
    readArchiveLockfiles(
      fixtureArchive({ [rootLock]: new Uint8Array() }),
      archivePath,
      project,
      [rootLock],
    ),
  ).toThrow(/empty.*Cargo\.lock/i);
  expect(() =>
    readArchiveLockfiles(zipSync({}), archivePath, project, []),
  ).toThrow(/missing.*Cargo\.toml/i);
});

it("deduplicates identical bytes across variants, locales and fixtures while keeping origins", () => {
  const canonical = {
    path: "public/projects/audit-fixture/starter.zip",
    entry: rootLock,
  };
  const polish = {
    path: "public/localized-projects/pl/audit-fixture/starter.zip",
    entry: rootLock,
  };
  const english = { path: archivePath, entry: rootLock };
  const fixture = { path: "scripts/fixtures/audit-fixture/Cargo.lock" };
  const solution = {
    path: "public/projects/audit-fixture/solution.zip",
    entry: rootLock,
  };
  const groups = groupLockfiles([
    ...[canonical, polish, english, fixture].map((origin) => ({
      bytes: starterLock,
      origin,
    })),
    { bytes: solutionLock, origin: solution },
  ]);
  expect(groups).toEqual([
    {
      sha256: createHash("sha256").update(starterLock).digest("hex"),
      bytes: starterLock,
      origins: [canonical, polish, english, fixture],
    },
    {
      sha256: createHash("sha256").update(solutionLock).digest("hex"),
      bytes: solutionLock,
      origins: [solution],
    },
  ]);
});

const cleanReport = {
  database: { "advisory-count": 100 },
  lockfile: { "dependency-count": 1 },
  vulnerabilities: { found: false, count: 0, list: [] },
  warnings: {},
};

const exampleFinding = {
  advisory: { id: "RUSTSEC-2000-0001" },
  package: { name: "fixture-crate", version: "1.0.0" },
};

it("keeps normalized advisory metadata and every origin while retaining malformed findings in the raw report", () => {
  const scratch = mkdtempSync(join(tmpdir(), "rustsec-findings-"));
  try {
    const origins = [
      { path: archivePath, entry: rootLock },
      { path: "scripts/fixtures/audit-fixture/Cargo.lock" },
    ];
    const groups = groupLockfiles(
      origins.map((origin) => ({ bytes: starterLock, origin })),
    );
    const report = {
      ...cleanReport,
      vulnerabilities: {
        found: true,
        count: 2,
        list: [
          exampleFinding,
          { ...exampleFinding, package: { name: "incomplete" } },
        ],
      },
      warnings: { unmaintained: [exampleFinding], unsound: [exampleFinding] },
    };
    const [scan] = auditLockfiles(
      groups,
      scratch,
      join(scratch, "advisory-db"),
      () => ({
        status: 0,
        signal: null,
        stdout: JSON.stringify(report),
        stderr: "",
      }),
    );
    expect(scan.findings).toEqual(
      ["vulnerability", "unmaintained", "unsound"].map((kind) => ({
        advisoryId: "RUSTSEC-2000-0001",
        packageName: "fixture-crate",
        packageVersion: "1.0.0",
        kind,
        origins,
      })),
    );
    expect(scan.audit).toEqual(report);
    expect(scan.errors).toEqual([
      expect.stringMatching(
        /vulnerabilit.*RUSTSEC-2000-0001.*fixture-crate@1\.0\.0/i,
      ),
      expect.stringMatching(/invalid.*vulnerabilit.*2/i),
      expect.stringMatching(
        /unsound.*RUSTSEC-2000-0001.*fixture-crate@1\.0\.0/i,
      ),
    ]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

it("audits the captured bytes from scratch with the fixed offline policy", () => {
  const scratch = mkdtempSync(join(tmpdir(), "rustsec-test-"));
  try {
    const groups = groupLockfiles([
      { bytes: starterLock, origin: { path: archivePath, entry: rootLock } },
      { bytes: solutionLock, origin: { path: archivePath, entry: nestedLock } },
    ]);
    const database = join(scratch, "advisory-db");
    let count = 0;
    const scans = auditLockfiles(groups, scratch, database, (argv) => {
      const lockfile = join(scratch, `${groups[count].sha256}.lock`);
      expect(argv).toEqual([
        "audit",
        "--file",
        lockfile,
        "--db",
        database,
        "--no-fetch",
        "--no-yanked",
        "--deny",
        "unsound",
        "--json",
      ]);
      expect(new Uint8Array(readFileSync(lockfile))).toEqual(
        groups[count].bytes,
      );
      count++;
      return {
        status: 0,
        signal: null,
        stdout: JSON.stringify(cleanReport),
        stderr: "",
      };
    });
    expect(count).toBe(2);
    expect(scans.map(({ errors }) => errors)).toEqual([[], []]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

it.each([
  [
    "security advisory",
    0,
    {
      ...cleanReport,
      vulnerabilities: { found: true, count: 1, list: [exampleFinding] },
    },
    /vulnerabilit/i,
  ],
  [
    "unsound advisory",
    0,
    { ...cleanReport, warnings: { unsound: [exampleFinding] } },
    /unsound/i,
  ],
  ["tool exit", 1, cleanReport, /exit.*1/i],
  ["missing report", 0, null, /invalid.*report/i],
  [
    "invalid warning finding",
    0,
    {
      ...cleanReport,
      warnings: { notice: [{ ...exampleFinding, advisory: {} }] },
    },
    /invalid.*notice/i,
  ],
  [
    "empty database",
    0,
    { ...cleanReport, database: { "advisory-count": 0 } },
    /invalid.*report/i,
  ],
  [
    "incomplete report",
    0,
    { ...cleanReport, vulnerabilities: { found: true, count: 1, list: [] } },
    /invalid.*report/i,
  ],
])("fails closed for %s", (_label, status, report, error) => {
  const scratch = mkdtempSync(join(tmpdir(), "rustsec-test-"));
  try {
    const groups = groupLockfiles([
      { bytes: starterLock, origin: { path: archivePath, entry: rootLock } },
    ]);
    const [scan] = auditLockfiles(
      groups,
      scratch,
      join(scratch, "advisory-db"),
      () => ({
        status,
        signal: null,
        stdout: JSON.stringify(report),
        stderr: "",
      }),
    );
    expect(scan.errors.join("\n")).toMatch(error);
    expect(scan.origins).toEqual(groups[0].origins);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
