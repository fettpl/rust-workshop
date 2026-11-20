import { expect, it, vi } from "vitest";
import { projectFiles } from "../src/domain/project-package";
import { logAnalyzerPackage } from "../src/content/projects/log-analyzer";

const forbidden = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("Import must not launch tools or materialize an archive");
  }),
);
vi.mock("node:child_process", () => ({ spawnSync: forbidden }));
vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  mkdtempSync: forbidden,
  mkdirSync: forbidden,
  writeFileSync: forbidden,
  rmSync: forbidden,
}));

it("imports the pure verifier seam without probing tools or creating, writing, or removing files", async () => {
  await expect(import("./verify-performance")).resolves.toBeTruthy();
  expect(forbidden).not.toHaveBeenCalled();
});

it("accepts only the two A7 modes while preserving legacy argument combinations", () => {
  expect(api.parsePerformanceArgs([])).toEqual({
    a7: false,
    fetch: false,
    msrv: false,
  });
  expect(api.parsePerformanceArgs(["--msrv"])).toEqual({
    a7: false,
    fetch: false,
    msrv: true,
  });
  expect(api.parsePerformanceArgs(["--fetch", "--msrv"])).toEqual({
    a7: false,
    fetch: true,
    msrv: true,
  });
  expect(api.parsePerformanceArgs(["--a7"])).toEqual({
    a7: true,
    fetch: false,
    msrv: false,
  });
  expect(api.parsePerformanceArgs(["--a7", "--msrv"])).toEqual({
    a7: true,
    fetch: false,
    msrv: true,
  });
  for (const args of [
    ["--a7", "--fetch"],
    ["--a7", "--a7"],
    ["--msrv", "--msrv"],
    ["--unknown"],
  ]) {
    expect(() => api.parsePerformanceArgs(args)).toThrow();
  }
});

it("classifies terminal command metadata without collapsing failures into a pass", () => {
  expect(
    api.classifyA7CommandResult({
      status: 0,
      signal: null,
      timedOut: false,
      error: null,
    }),
  ).toBe("passed");
  expect(
    api.classifyA7CommandResult({
      status: 7,
      signal: null,
      timedOut: false,
      error: null,
    }),
  ).toBe("failed");
  expect(
    api.classifyA7CommandResult({
      status: null,
      signal: null,
      timedOut: true,
      error: "ETIMEDOUT",
    }),
  ).toBe("infrastructure");
  expect(
    api.classifyA7CommandResult({
      status: null,
      signal: "SIGTERM",
      timedOut: false,
      error: null,
    }),
  ).toBe("infrastructure");
  expect(
    api.classifyA7CommandResult({
      status: null,
      signal: null,
      timedOut: false,
      error: "ENOENT",
    }),
  ).toBe("infrastructure");
});

it("extracts tool paths from raw probe output rather than sanitized report tails", () => {
  expect(
    api.parseQualifiedToolPath("/opt/trusted-rust/stable/bin/cargo\n"),
  ).toBe("/opt/trusted-rust/stable/bin/cargo");
  expect(() =>
    api.parseQualifiedToolPath("<home>/.rustup/toolchains/stable/bin/cargo\n"),
  ).toThrow();
});

type EnvironmentApi = typeof import("./verify-performance") & {
  buildA7ChildEnvironment(input: {
    ambient: NodeJS.ProcessEnv;
    realHome: string;
    cargoHome: string;
    rustupHome: string;
    criterionHome: string;
    targetDir: string;
    tempDir: string;
    requestedToolchain: "stable" | "1.85.0";
    rustup: string;
    tools: { cargo: string; rustc: string; rustdoc: string };
    systemPathDirs: readonly string[];
  }): {
    env: Record<string, string>;
    omittedKeys: string[];
    pathEntries: string[];
  };
  validateA7CargoConfigPolicy(input: {
    cargoHomeConfig: string | null;
    ancestorConfigs: readonly string[];
  }): { config: "absent" | "fixed-offline" };
  selectA7CanonicalRustup(candidates: readonly {
    raw: string;
    canonical: string;
    regularExecutable: boolean;
  }[]): string;
  validateA7LocalRootRelationship(
    candidate: string,
    realHome: string,
    packageRoot: string,
  ): void;
  validateA7HomeBinding(input: {
    configuredHome: string;
    osHome: string;
    canonicalHome: string;
    exists: boolean;
    regularDirectory: boolean;
    canonicalAncestors: boolean;
  }): string;
  a7ArchiveTempPrefix(tempDir: string): string;
  parseA7RustupVersion(raw: string): string;
};

function environmentApi(): EnvironmentApi {
  return api as EnvironmentApi;
}

const environmentFixture = {
  ambient: {
    HOME: "/home/learner",
    PATH: "/evil/bin:/ambient/bin",
    CARGO_HOME: "/ambient/cargo",
    RUSTUP_HOME: "/ambient/rustup",
    CARGO_TARGET_DIR: "/ambient/target",
    CARGO_CONFIG: "/ambient/config.toml",
    RUSTFLAGS: "-C link-arg=/evil/linker",
    RUSTC_WRAPPER: "/evil/wrapper",
    RUSTC_WORKSPACE_WRAPPER: "/evil/workspace-wrapper",
    CARGO_ENCODED_RUSTFLAGS: "-Cdebug-assertions=no",
    RUSTUP_TOOLCHAIN: "nightly",
    CARGO_PROFILE_RELEASE_DEBUG: "true",
    CARGO_NET_GIT_FETCH_WITH_CLI: "true",
    CARGO_HTTP_PROXY: "http://evil.invalid",
    CARGO_REGISTRIES_CRATES_IO_PROTOCOL: "sparse",
    RUSTUP_DIST_SERVER: "https://evil.invalid",
  },
  realHome: "/home/learner",
  cargoHome: "/stage/cargo-home",
  rustupHome: "/home/learner/.rustup",
  criterionHome: "/repo/test-results/performance-a7/run/criterion",
  targetDir: "/repo/test-results/performance-a7/run/target",
  tempDir: "/repo/test-results/performance-a7/run/tmp",
  requestedToolchain: "stable" as const,
  rustup: "/opt/rustup/bin/rustup",
  tools: {
    cargo: "/opt/rustup/bin/cargo",
    rustc: "/opt/rustup/bin/rustc",
    rustdoc: "/opt/rustup/bin/rustdoc",
  },
  systemPathDirs: ["/usr/bin", "/bin", "/usr/bin", "/sbin"],
};

it("projects a closed child environment and neutralizes ambient CI overrides", () => {
  const result = environmentApi().buildA7ChildEnvironment(environmentFixture);
  expect(result.env).toEqual({
    HOME: "/home/learner",
    PATH: "/opt/rustup/bin:/usr/bin:/bin:/sbin",
    CARGO_HOME: "/stage/cargo-home",
    RUSTUP_HOME: "/home/learner/.rustup",
    RUSTUP_TOOLCHAIN: "stable",
    RUSTUP_AUTO_INSTALL: "0",
    CARGO_NET_OFFLINE: "true",
    CRITERION_HOME: "/repo/test-results/performance-a7/run/criterion",
    CARGO_TARGET_DIR: "/repo/test-results/performance-a7/run/target",
    TMPDIR: "/repo/test-results/performance-a7/run/tmp",
    TMP: "/repo/test-results/performance-a7/run/tmp",
    TEMP: "/repo/test-results/performance-a7/run/tmp",
    CARGO_TERM_COLOR: "never",
    RUSTC: "/opt/rustup/bin/rustc",
    RUSTDOC: "/opt/rustup/bin/rustdoc",
  });
  expect(result.pathEntries).toEqual([
    "/opt/rustup/bin",
    "/usr/bin",
    "/bin",
    "/sbin",
  ]);
  expect(result.omittedKeys).toEqual([
    "CARGO_CONFIG",
    "CARGO_ENCODED_RUSTFLAGS",
    "CARGO_HOME",
    "CARGO_HTTP_PROXY",
    "CARGO_NET_GIT_FETCH_WITH_CLI",
    "CARGO_PROFILE_RELEASE_DEBUG",
    "CARGO_REGISTRIES_CRATES_IO_PROTOCOL",
    "CARGO_TARGET_DIR",
    "PATH",
    "RUSTC_WORKSPACE_WRAPPER",
    "RUSTC_WRAPPER",
    "RUSTFLAGS",
    "RUSTUP_DIST_SERVER",
    "RUSTUP_HOME",
    "RUSTUP_TOOLCHAIN",
  ]);
});

it("accepts only absent or exact fixed offline Cargo configuration", () => {
  expect(
    environmentApi().validateA7CargoConfigPolicy({
      cargoHomeConfig: null,
      ancestorConfigs: [],
    }),
  ).toEqual({ config: "absent" });
  expect(
    environmentApi().validateA7CargoConfigPolicy({
      cargoHomeConfig: "[net]\noffline = true\n",
      ancestorConfigs: [],
    }),
  ).toEqual({ config: "fixed-offline" });
  for (const input of [
    { cargoHomeConfig: "[build]\nrustc-wrapper = '/evil'\n", ancestorConfigs: [] },
    { cargoHomeConfig: null, ancestorConfigs: ["/tmp/package/.cargo/config.toml"] },
    { cargoHomeConfig: "[net]\noffline = true\n", ancestorConfigs: ["/tmp/package/.cargo/config"] },
  ]) {
    expect(() =>
      environmentApi().validateA7CargoConfigPolicy(input),
    ).toThrow();
  }
});

it("does not echo rejected Cargo config contents into an error", () => {
  const secret = "[build]\nrustc-wrapper = 'SECRET_CONFIG_SENTINEL'\n";
  try {
    environmentApi().validateA7CargoConfigPolicy({
      cargoHomeConfig: secret,
      ancestorConfigs: [],
    });
    throw new Error("expected config rejection");
  } catch (error) {
    expect(String(error)).not.toContain("SECRET_CONFIG_SENTINEL");
  }
});

it("selects one canonical rustup binary while rejecting missing or ambiguous candidates", () => {
  expect(
    environmentApi().selectA7CanonicalRustup([
      {
        raw: "/opt/homebrew/bin/rustup",
        canonical: "/opt/homebrew/Cellar/rustup/bin/rustup",
        regularExecutable: true,
      },
      {
        raw: "/opt/homebrew/bin/rustup",
        canonical: "/opt/homebrew/Cellar/rustup/bin/rustup",
        regularExecutable: true,
      },
    ]),
  ).toBe("/opt/homebrew/Cellar/rustup/bin/rustup");
  expect(() =>
    environmentApi().selectA7CanonicalRustup([
      { raw: "/missing/rustup", canonical: "/missing/rustup", regularExecutable: false },
    ]),
  ).toThrow();
  expect(() =>
    environmentApi().selectA7CanonicalRustup([
      { raw: "/one/rustup", canonical: "/one/rustup", regularExecutable: true },
      { raw: "/two/rustup", canonical: "/two/rustup", regularExecutable: true },
    ]),
  ).toThrow();
});

it("rejects broad, package-ancestor, and package-descendant cache roots", () => {
  expect(() =>
    environmentApi().validateA7LocalRootRelationship(
      "/home/learner/.cargo",
      "/home/learner",
      "/repo/archive/package",
    ),
  ).not.toThrow();
  for (const candidate of [
    "/",
    "/home/learner",
    "/repo/archive",
    "/repo/archive/package",
    "/repo/archive/package/cache",
  ]) {
    expect(() =>
      environmentApi().validateA7LocalRootRelationship(
        candidate,
        "/home/learner",
        "/repo/archive/package",
      ),
    ).toThrow();
  }
});

it("binds HOME to the independent canonical OS home without repurposing it", () => {
  expect(
    environmentApi().validateA7HomeBinding({
      configuredHome: "/home/learner",
      osHome: "/home/learner",
      canonicalHome: "/home/learner",
      exists: true,
      regularDirectory: true,
      canonicalAncestors: true,
    }),
  ).toBe("/home/learner");
  for (const defect of [
    {
      configuredHome: "/evil",
      osHome: "/home/learner",
      canonicalHome: "/home/learner",
      exists: true,
      regularDirectory: true,
      canonicalAncestors: true,
    },
    {
      configuredHome: "/home/learner",
      osHome: "/home/learner",
      canonicalHome: "/private/home",
      exists: true,
      regularDirectory: true,
      canonicalAncestors: true,
    },
    {
      configuredHome: "/home/learner",
      osHome: "/home/learner",
      canonicalHome: "/home/learner",
      exists: false,
      regularDirectory: true,
      canonicalAncestors: true,
    },
  ]) {
    expect(() =>
      environmentApi().validateA7HomeBinding(defect),
    ).toThrow();
  }
});

it("keeps archive extraction under the owned campaign temp root", () => {
  expect(environmentApi().a7ArchiveTempPrefix("/repo/run/tmp")).toBe(
    "/repo/run/tmp/archive-",
  );
  expect(() => environmentApi().a7ArchiveTempPrefix("<tmp>")).toThrow();
});

it("parses only a raw qualified rustup version receipt", () => {
  expect(environmentApi().parseA7RustupVersion("rustup 1.28.2 (x86_64-apple-darwin)\n")).toBe(
    "rustup 1.28.2 (x86_64-apple-darwin)",
  );
  expect(() => environmentApi().parseA7RustupVersion("cargo 1.85.0\n")).toThrow();
});

import { createHash } from "node:crypto";
import { beforeAll } from "vitest";

let api: typeof import("./verify-performance");
beforeAll(async () => {
  api = await import("./verify-performance");
});
const baselineId = "log_analyzer_a7/baseline/filtered-mixed-2048-v1";
const candidateId = "log_analyzer_a7/candidate/filtered-mixed-2048-v1";
const namespace = "a7-stable-literal-control";
type RawFile = {
  path: string;
  namespace: string;
  raw: string;
  byteLength: number;
  sha256: string;
};
function file(id: string, name: string, value: unknown): RawFile {
  const raw = JSON.stringify(value);
  return {
    path: `test-results/performance-a7/${namespace}/criterion/${id}/new/${name}.json`,
    namespace,
    raw,
    byteLength: Buffer.byteLength(raw),
    sha256: createHash("sha256").update(raw).digest("hex"),
  };
}
function estimates(point = 10, low = 9, high = 11) {
  return {
    mean: {
      point_estimate: point,
      confidence_interval: {
        confidence_level: 0.95,
        lower_bound: low,
        upper_bound: high,
      },
      standard_error: 0.2,
    },
  };
}
function record(id: string, candidate = false) {
  return {
    id,
    files: [
      file(id, "benchmark", {
        full_id: id,
        group_id: "log_analyzer_a7",
        function_id: candidate ? "candidate" : "baseline",
        value_str: "filtered-mixed-2048-v1",
        directory_name: id,
        throughput: { Bytes: 44123 },
      }),
      file(id, "estimates", candidate ? estimates(6, 5, 7) : estimates()),
      file(id, "sample", {
        sampling_mode: "Linear",
        iters: [10, 20, 30],
        times: candidate ? [60, 120, 180] : [100, 200, 300],
      }),
    ],
  };
}
function pair() {
  return {
    namespace,
    records: [record(baselineId), record(candidateId, true)],
  };
}
function replaceJson(
  input: ReturnType<typeof pair>,
  index: number,
  filename: string,
  value: unknown,
) {
  const n = input.records[index].files.findIndex((f) =>
    f.path.endsWith(`/${filename}.json`),
  );
  input.records[index].files[n] = file(
    input.records[index].id,
    filename,
    value,
  );
}

it("retains both exact IDs, ns/iteration means, samples and raw-byte provenance from a literal valid control", () => {
  const result = api.parseA7CriterionTriplet(pair());
  expect(result.baseline).toMatchObject({
    id: baselineId,
    unit: "ns/iteration",
    sampleCount: 3,
    pointEstimate: 10,
    ci95: { confidenceLevel: 0.95, low: 9, high: 11 },
    throughputBytes: 44123,
  });
  expect(result.candidate).toMatchObject({
    id: candidateId,
    pointEstimate: 6,
    ci95: { low: 5, high: 7 },
  });
  expect(result.baseline.artifacts).toEqual(
    pair().records[0].files.map(({ path, byteLength, sha256 }) => ({
      path,
      bytes: byteLength,
      sha256,
    })),
  );
});
for (const count of [0, 1, 3])
  it(`rejects ${count} benchmark records instead of exactly two`, () => {
    const input = pair();
    input.records =
      count === 3
        ? [...input.records, record(candidateId, true)]
        : input.records.slice(0, count);
    expect(() => api.parseA7CriterionTriplet(input)).toThrow();
  });
it("rejects duplicate candidate identity rather than accepting two plausible measurements", () => {
  const input = pair();
  input.records = [record(candidateId, true), record(candidateId, true)];
  expect(() => api.parseA7CriterionTriplet(input)).toThrow();
});
it("rejects a swapped full ID even when its JSON byte metadata is recomputed", () => {
  const input = pair();
  replaceJson(input, 1, "benchmark", { full_id: baselineId });
  expect(() => api.parseA7CriterionTriplet(input)).toThrow();
});
it("rejects duplicate triplet paths and missing members", () => {
  const input = pair();
  input.records[0].files[2] = input.records[0].files[1];
  expect(() => api.parseA7CriterionTriplet(input)).toThrow();
});
for (const defect of [
  "old-directory",
  "wrong-namespace",
  "bad-hash",
  "bad-length",
  "malformed-json",
] as const)
  it(`rejects artifact ${defect}`, () => {
    const input = pair(),
      target = input.records[0].files[0];
    if (defect === "old-directory")
      target.path = target.path.replace("/new/", "/base/");
    if (defect === "wrong-namespace")
      target.namespace = "a7-stable-previous-run";
    if (defect === "bad-hash") target.sha256 = "0".repeat(64);
    if (defect === "bad-length") target.byteLength += 1;
    if (defect === "malformed-json") {
      target.raw = "{";
      target.byteLength = 1;
      target.sha256 = createHash("sha256").update(target.raw).digest("hex");
    }
    expect(() => api.parseA7CriterionTriplet(input)).toThrow();
  });
for (const [label, value] of [
  [
    "confidence",
    {
      mean: {
        ...estimates().mean,
        confidence_interval: {
          confidence_level: 0.9,
          lower_bound: 9,
          upper_bound: 11,
        },
      },
    },
  ],
  ["reversed", estimates(10, 12, 8)],
  ["missing", { mean: { point_estimate: 10 } }],
  ["nonfinite", estimates(Number.NaN, 9, 11)],
  ["zero", estimates(0, 0, 0)],
] as const)
  it(`rejects invalid ${label} mean interval`, () => {
    const input = pair();
    replaceJson(input, 0, "estimates", value);
    expect(() => api.parseA7CriterionTriplet(input)).toThrow();
  });
for (const [label, iters, times] of [
  ["empty", [], []],
  ["unequal", [1], [10, 20]],
  ["zero iterations", [0], [10]],
  ["zero time", [1], [0]],
  ["negative", [-1], [10]],
  ["fractional iterations", [1.5], [10]],
  ["nonfinite", [1], [Number.POSITIVE_INFINITY]],
] as const)
  it(`rejects ${label} samples`, () => {
    const input = pair();
    replaceJson(input, 0, "sample", { sampling_mode: "Linear", iters, times });
    expect(() => api.parseA7CriterionTriplet(input)).toThrow();
  });
it("rejects unequal workload byte counts across baseline and candidate", () => {
  const input = pair();
  const benchmark = JSON.parse(input.records[1].files[0].raw) as Record<
    string,
    unknown
  >;
  benchmark.throughput = { Bytes: 1 };
  replaceJson(input, 1, "benchmark", benchmark);
  expect(() => api.parseA7CriterionTriplet(input)).toThrow();
});
function interval(low: number, high: number) {
  return {
    unit: "ns/iteration",
    pointEstimate: (low + high) / 2,
    ci95: { confidenceLevel: 0.95, low, high },
  };
}
for (const [name, b, c, expected] of [
  ["strict faster", [9, 11], [5, 7], "measured-faster-on-this-workload"],
  ["strict slower", [5, 7], [9, 11], "measured-slower-on-this-workload"],
  ["partial overlap", [5, 9], [7, 11], "overlap-inconclusive"],
  ["equal", [5, 7], [5, 7], "overlap-inconclusive"],
  ["touching", [5, 7], [3, 5], "overlap-inconclusive"],
] as const)
  it(`compares ${name} mean intervals without a point-estimate shortcut`, () => {
    expect(
      api.compareA7Intervals(interval(b[0], b[1]), interval(c[0], c[1])),
    ).toBe(expected);
  });
it("never uses throughput to reverse the ns/iteration interval direction", () => {
  expect(
    api.compareA7Intervals(
      { ...interval(9, 11), throughputBytes: 1 },
      { ...interval(5, 7), throughputBytes: 999999 },
    ),
  ).toBe("measured-faster-on-this-workload");
  expect(() =>
    api.compareA7Intervals(
      { ...interval(9, 11), unit: "bytes/s" },
      interval(5, 7),
    ),
  ).toThrow();
});
function command(status: number | null = 0) {
  return {
    status,
    signal: null as string | null,
    timedOut: false,
    error: null as string | null,
    stdout: "",
    stderr: "",
  };
}
function rejected() {
  return {
    compile: command(),
    run: {
      ...command(101),
      stdout:
        "test a7_filter_ignored_v1_named_oracle ... FAILED\ntest result: FAILED. 0 passed; 1 failed; 0 ignored;",
      stderr:
        "assertion `left == right` failed: A7_FILTER_IGNORED_ORACLE\n  left: Summary { info: 1, warn: 1, error: 2, malformed: 2 }\n right: Summary { info: 0, warn: 0, error: 2, malformed: 2 }",
    },
  };
}
it("accepts only the compiled named behavioral rejection with the literal replay counterexample", () => {
  expect(api.classifyA7Mutant(rejected())).toBe("expected-rejection");
});
it("separates an unexpected accepted mutant from wrong failures and compile errors", () => {
  expect(api.classifyA7Mutant({ compile: command(), run: command() })).toBe(
    "unexpected-pass",
  );
  expect(api.classifyA7Mutant({ compile: command(1) })).toBe("compile-error");
  for (const word of [
    "a7_filter_ignored_v1_named_oracle",
    "A7_FILTER_IGNORED_ORACLE",
    "left == right",
    "info: 1",
  ]) {
    const input = rejected();
    input.run.stdout = input.run.stdout.replaceAll(word, "unrelated");
    input.run.stderr = input.run.stderr.replaceAll(word, "unrelated");
    expect(api.classifyA7Mutant(input)).toBe("wrong-failure");
  }
});
for (const [field, value, expected] of [
  ["error", "ENOENT", "tool-error"],
  ["timedOut", true, "timeout"],
  ["signal", "SIGTERM", "signal"],
] as const)
  it(`preserves ${expected} instead of treating infrastructure as a rejected control`, () => {
    const input = rejected();
    Object.assign(input.run, { [field]: value });
    expect(api.classifyA7Mutant(input)).toBe(expected);
    Object.assign(input.compile, { [field]: value });
    expect(api.classifyA7Mutant(input)).toBe(expected);
  });
it("distinguishes missing stages from completed negative evidence", () => {
  expect(api.classifyA7Mutant({})).toBe("not-run");
  expect(api.classifyA7Mutant({ compile: command() })).toBe("not-run");
});

for (const field of ["timedOut", "signal", "error"] as const)
  it(`rejects omitted ${field} metadata in either mutant stage`, () => {
    const input = rejected();
    const compile: Record<string, unknown> = { ...input.compile };
    delete compile[field];
    expect(api.classifyA7Mutant({ ...input, compile })).toBe("tool-error");
    const run: Record<string, unknown> = { ...input.run };
    delete run[field];
    expect(api.classifyA7Mutant({ ...input, run })).toBe("tool-error");
  });

it("projects raw mutant artifact streams without dropping terminal metadata", () => {
  const complete = {
    ...command(101),
    outcome: "failed" as const,
    stdoutPath: "logs/commands/mutant.stdout",
    stderrPath: "logs/commands/mutant.stderr",
    stdoutTail: "sanitized stdout tail",
    stderrTail: "sanitized stderr tail",
  };
  expect(
    api.projectA7MutantCommand(complete, "raw stdout", "raw stderr"),
  ).toMatchObject({
    status: 101,
    signal: null,
    timedOut: false,
    error: null,
    stdout: "raw stdout",
    stderr: "raw stderr",
  });
  expect(
    api.projectA7MutantCommand(
      { ...complete, outcome: "not-run" as const },
      "",
      "",
    ),
  ).toBeUndefined();
});

it("does not complete a run for a blocked mutant protocol outcome", () => {
  expect(api.isA7RunComplete(true, false, "wrong-failure")).toBe(false);
  expect(api.isA7RunComplete(true, false, "compile-error")).toBe(false);
  expect(api.isA7RunComplete(true, false, "expected-rejection")).toBe(true);
  expect(api.isA7RunComplete(true, false, "unexpected-pass")).toBe(true);
  expect(api.isA7RunComplete(false, false, "expected-rejection")).toBe(false);
  expect(api.isA7RunComplete(true, true, "expected-rejection")).toBe(false);
});

function a7PackageFiles() {
  return projectFiles(logAnalyzerPackage, "solution");
}

function a7ExtractedEntries(files = a7PackageFiles()) {
  return Object.fromEntries(
    Object.entries(files).map(([path, contents]) => [
      `log-analyzer-workshop/${path}`,
      new TextEncoder().encode(contents),
    ]),
  );
}

it("accepts the exact extracted A7 Cargo manifest and lock graph", () => {
  const files = a7PackageFiles();
  expect(
    api.validateA7CargoBinding({
      manifest: files["Cargo.toml"],
      lock: files["Cargo.lock"],
    }),
  ).toMatchObject({
    manifestSha256:
      "7fd629a19e5aba4b51fa03b1daec55153973cd5534f40b19e6c29052f7d59436",
    lockSha256:
      "c822762f52d50dc2083478d8549ea0361b0fe93692654994812041075a556da5",
    criterionVersion: "0.5.1",
    package: { name: "log-analyzer-workshop", version: "0.1.0" },
  });
});

it("rejects mutated, missing, and wrong-version A7 Cargo bindings", () => {
  const files = a7PackageFiles();
  expect(() =>
    api.validateA7CargoBinding({
      manifest: files["Cargo.toml"].replace(
        'version = "0.1.0"',
        'version = "0.1.1"',
      ),
      lock: files["Cargo.lock"],
    }),
  ).toThrow();
  expect(() =>
    api.validateA7CargoBinding({
      manifest: files["Cargo.toml"],
      lock: files["Cargo.lock"].replace(
        'name = "criterion"\nversion = "0.5.1"',
        'name = "criterion"\nversion = "0.5.2"',
      ),
    }),
  ).toThrow();
  expect(() =>
    api.validateA7CargoBinding({
      manifest: files["Cargo.toml"],
      lock: undefined,
    }),
  ).toThrow();
});

it("requires extracted authored ZIP bytes to equal projectFiles exactly", () => {
  const files = a7PackageFiles();
  expect(
    api.validateA7ExtractedAuthoredBytes(
      a7ExtractedEntries(),
      "log-analyzer-workshop",
      files,
    ),
  ).toMatchObject({ authoredFileCount: 26 });
  const mutated = a7ExtractedEntries(files);
  mutated["log-analyzer-workshop/Cargo.toml"] = new TextEncoder().encode(
    `${files["Cargo.toml"]}\n`,
  );
  expect(() =>
    api.validateA7ExtractedAuthoredBytes(
      mutated,
      "log-analyzer-workshop",
      files,
    ),
  ).toThrow();
  const missing = a7ExtractedEntries(files);
  delete missing["log-analyzer-workshop/Cargo.lock"];
  expect(() =>
    api.validateA7ExtractedAuthoredBytes(
      missing,
      "log-analyzer-workshop",
      files,
    ),
  ).toThrow();
});
