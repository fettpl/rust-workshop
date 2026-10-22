import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  PrefixFileRef,
  PrefixMode,
  PrefixToolchainBinding,
} from "./unsafe-miri-initialized-prefix-proof";
import {
  createInitializedPrefixAttempt,
  qualifyInitializedPrefixToolchain,
} from "./unsafe-miri-initialized-prefix-recorder";

// Fixed Node metadata fakes exercise production qualification, never installed Rust tools.
const ref = (path: string): PrefixFileRef => {
  const bytes = readFileSync(path);
  return {
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
};
const json = (path: string, value: unknown) =>
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const changedKeys = [
  "RUSTUP_HOME",
  "PATH",
  "RUST_WORKSHOP_INITIALIZED_PREFIX_CARGO_CONFIG",
  "RUST_WORKSHOP_INITIALIZED_PREFIX_SYSROOT_MANIFEST",
  "RUST_WORKSHOP_INITIALIZED_PREFIX_TOOLCHAIN_QUALIFICATION",
  "MIRI_SYSROOT",
] as const;

function fixture(mode: PrefixMode, wrongLookup = false) {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "qualification-node-fakes-")),
  );
  const inputs = join(root, "initialized-prefix-native-inputs");
  const evidence = join(root, "initialized-prefix-artifacts");
  const tools = join(root, "selected-tools");
  const rustupBin = join(root, "rustup-bin");
  const rustupHome = join(root, "private-rustup");
  for (const p of [inputs, tools, rustupBin, rustupHome]) mkdirSync(p);
  const toolchain =
    mode === "stable"
      ? "stable"
      : mode === "msrv"
        ? "1.85.0"
        : "nightly-2026-08-08";
  const release =
    mode === "miri" ? "1.99.0-nightly" : mode === "msrv" ? "1.85.0" : "1.99.1";
  const versions: Record<string, string> = {
    rustup: "rustup 1.29.2 (synthetic metadata fixture)",
    rustc: `rustc ${release} (synthetic fixture)\ncommit-date: 2026-08-07`,
    rustdoc: `rustdoc ${release} (synthetic fixture)`,
    cargo: `cargo ${release} (synthetic fixture)`,
    "cargo-miri": "miri 0.1.0 (synthetic fixture)",
    miri: "rustc 1.99.0-nightly (synthetic fixture)",
  };
  const names = [
    "rustup",
    "rustc",
    "rustdoc",
    "cargo",
    ...(mode === "miri" ? ["cargo-miri", "miri"] : []),
  ];
  const paths = Object.fromEntries(
    names.map((n) => [n, join(n === "rustup" ? rustupBin : tools, n)]),
  );
  for (const name of names) {
    const lookups = Object.fromEntries(
      ["rustc", "rustdoc", "cargo"].map((n) => [
        JSON.stringify(["which", "--toolchain", toolchain, n]),
        wrongLookup && n === "rustc"
          ? join(tools, "different-rustc")
          : paths[n],
      ]),
    );
    const versionArgv =
      name === "cargo-miri"
        ? ["miri", "--version"]
        : name === "rustup" || name === "miri"
          ? ["--version"]
          : ["--version", "--verbose"];
    writeFileSync(
      paths[name],
      `#!${process.execPath}\n// Fixed harmless metadata fake; unsupported requests fail.\nconst argv = JSON.stringify(process.argv.slice(2));\nconst lookups = ${JSON.stringify(name === "rustup" ? lookups : {})};\nif (Object.hasOwn(lookups, argv)) process.stdout.write(lookups[argv] + "\\n");\nelse if (argv === ${JSON.stringify(JSON.stringify(versionArgv))}) process.stdout.write(${JSON.stringify(versions[name] + "\n")});\nelse process.exit(64);\n`,
      { flag: "wx" },
    );
    chmodSync(paths[name], 0o755);
  }
  if (wrongLookup)
    writeFileSync(join(tools, "different-rustc"), "inert alternative tool\n");
  const config = join(inputs, "cargo-config.toml");
  writeFileSync(config, "[net]\noffline = true\n", { flag: "wx" });
  const profile = {
    schema: "initialized-prefix-toolchain-qualification-v1",
    mode,
    toolchain,
    executables: Object.fromEntries(names.map((n) => [n, ref(paths[n])])),
    versionContains: Object.fromEntries(names.map((n) => [n, versions[n]])),
    ...(mode === "miri"
      ? {
          nightlyDistributionDate: "2026-08-08",
          compilerCommitDate: "2026-08-07",
        }
      : {}),
  };
  const qualification = join(inputs, "qualification.json");
  let sysroot: string | undefined;
  let sysrootManifest: string | undefined;
  if (mode === "miri") {
    sysroot = join(root, "synthetic-sysroot");
    mkdirSync(sysroot);
    const file = join(sysroot, "synthetic.rlib");
    writeFileSync(file, "inert sysroot fixture\n");
    sysrootManifest = join(inputs, "sysroot.json");
    json(sysrootManifest, {
      schema: "initialized-prefix-sysroot-v1",
      root: sysroot,
      toolchain,
      complete: true,
      files: [ref(file)],
    });
  }
  const attempt = createInitializedPrefixAttempt({
    mode,
    evidenceDirectory: evidence,
  });
  return {
    root,
    evidence,
    attempt,
    paths,
    profile,
    qualification,
    config,
    rustupHome,
    rustupBin,
    tools,
    sysroot,
    sysrootManifest,
  };
}

async function withFixture<T>(
  mode: PrefixMode,
  run: (f: ReturnType<typeof fixture>) => Promise<T>,
  options: { wrongLookup?: boolean } = {},
) {
  const saved = Object.fromEntries(changedKeys.map((k) => [k, process.env[k]]));
  const f = fixture(mode, options.wrongLookup);
  json(f.qualification, f.profile);
  try {
    process.env.RUSTUP_HOME = f.rustupHome;
    process.env.PATH = `${f.rustupBin}:/usr/bin:/bin`;
    process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_CARGO_CONFIG = f.config;
    process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_TOOLCHAIN_QUALIFICATION =
      f.qualification;
    if (f.sysroot && f.sysrootManifest) {
      process.env.MIRI_SYSROOT = f.sysroot;
      process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_SYSROOT_MANIFEST =
        f.sysrootManifest;
    } else {
      delete process.env.MIRI_SYSROOT;
      delete process.env.RUST_WORKSHOP_INITIALIZED_PREFIX_SYSROOT_MANIFEST;
    }
    return await run(f);
  } finally {
    for (const key of changedKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function expectBinding(
  binding: PrefixToolchainBinding,
  f: ReturnType<typeof fixture>,
) {
  const lookups = ["lookup-rustc", "lookup-rustdoc", "lookup-cargo"];
  const versions = [
    "version-rustc",
    "version-rustdoc",
    "version-cargo",
    "version-rustup",
    ...(binding.mode === "miri" ? ["version-cargo-miri", "version-miri"] : []),
  ];
  expect(Object.keys(binding.versions).sort()).toEqual(
    [...lookups, ...versions].sort(),
  );
  expect(binding.env.RUSTC).toBe(f.paths.rustc);
  expect(binding.env.RUSTDOC).toBe(f.paths.rustdoc);
  expect(binding.env.PATH).toBe(`${f.tools}:${f.rustupBin}:/usr/bin:/bin`);
  expect(JSON.parse(readFileSync(binding.ref.path, "utf8")).env).toEqual(
    binding.env,
  );
  expect(ref(binding.ref.path)).toEqual(binding.ref);
  for (const [id, entry] of Object.entries(binding.versions)) {
    expect(entry.record.spec.env, id).toEqual(binding.env);
    expect(entry.record.guard, id).toEqual({ ok: true, reasons: [] });
    expect(entry.record.outcome, id).toEqual({
      exitCode: 0,
      signal: null,
      spawnError: null,
      timedOut: false,
      outputLimit: false,
      drainTimedOut: false,
    });
    expect(ref(entry.ref.path)).toEqual(entry.ref);
    expect(JSON.parse(readFileSync(entry.ref.path, "utf8"))).toEqual(
      entry.record,
    );
    const directory = dirname(entry.ref.path);
    expect(
      JSON.parse(readFileSync(join(directory, "status.json"), "utf8")),
    ).toEqual(entry.record.outcome);
    for (const stream of ["stdout", "stderr"] as const) {
      expect(ref(entry.record[stream].path)).toEqual(entry.record[stream]);
      expect(readFileSync(entry.record[stream].path)).toEqual(
        readFileSync(join(directory, "raw", `${stream}.bin`)),
      );
    }
    for (const archived of [...entry.record.before, ...entry.record.after]) {
      expect(ref(archived.input.path)).toEqual(archived.input);
      expect(ref(archived.archive.path)).toEqual(archived.archive);
    }
    if (lookups.includes(id)) {
      expect(entry.record.spec.executable).toEqual(
        f.profile.executables.rustup,
      );
      expect(entry.record.spec.argv).toEqual([
        "which",
        "--toolchain",
        f.profile.toolchain,
        id.slice("lookup-".length),
      ]);
    }
  }
}

describe("production qualification with fixed Node metadata fakes", () => {
  it.each(["stable", "msrv", "miri"] as const)(
    "retains one canonical environment for %s including workflow sibling inputs",
    async (mode) => {
      await withFixture(mode, async (f) => {
        const binding = await qualifyInitializedPrefixToolchain({
          mode,
          attemptDirectory: f.attempt,
        });
        expectBinding(binding, f);
      });
    },
  );

  it("rejects a preflight executable hash mismatch before any child", async () => {
    await withFixture("stable", async (f) => {
      writeFileSync(f.paths.rustdoc, "// changed synthetic executable\n", {
        flag: "a",
      });
      await expect(
        qualifyInitializedPrefixToolchain({
          mode: "stable",
          attemptDirectory: f.attempt,
        }),
      ).rejects.toThrow(/qualification.*rustdoc|rustdoc.*qualification/);
      expect(readdirSync(join(f.attempt, "commands"))).toEqual([]);
      const rejection = JSON.parse(
        readFileSync(
          join(
            f.attempt,
            "toolchain",
            readdirSync(join(f.attempt, "toolchain")).find((n) =>
              n.startsWith("rejected-"),
            ) ?? "missing-rejection",
            "rejection.json",
          ),
          "utf8",
        ),
      );
      expect(rejection.phase).toBe("before-child");
      expect(rejection.recordedIds).toEqual([]);
    });
  });

  it("rejects a different lookup selection after preflight and before versions", async () => {
    await withFixture(
      "stable",
      async (f) => {
        await expect(
          qualifyInitializedPrefixToolchain({
            mode: "stable",
            attemptDirectory: f.attempt,
          }),
        ).rejects.toThrow(
          /root-qualified rustc identity differs before version/,
        );
        expect(readdirSync(join(f.attempt, "commands"))).toEqual([
          "lookup-rustc",
        ]);
        const rejection = JSON.parse(
          readFileSync(
            join(
              f.attempt,
              "toolchain",
              readdirSync(join(f.attempt, "toolchain")).find((n) =>
                n.startsWith("rejected-"),
              ) ?? "missing-rejection",
              "rejection.json",
            ),
            "utf8",
          ),
        );
        expect(rejection.phase).toBe("after-recorded-children");
        expect(rejection.recordedIds).toEqual(["lookup-rustc"]);
      },
      { wrongLookup: true },
    );
  });

  it("rejects an unbound ancestor Cargo configuration before any child", async () => {
    await withFixture("stable", async (f) => {
      mkdirSync(join(f.evidence, ".cargo"));
      writeFileSync(
        join(f.evidence, ".cargo/config.toml"),
        "[net]\noffline = true\n",
      );
      await expect(
        qualifyInitializedPrefixToolchain({
          mode: "stable",
          attemptDirectory: f.attempt,
        }),
      ).rejects.toThrow(/ancestor Cargo config would be consumed/);
      expect(readdirSync(join(f.attempt, "commands"))).toEqual([]);
      const rejection = JSON.parse(
        readFileSync(
          join(
            f.attempt,
            "toolchain",
            readdirSync(join(f.attempt, "toolchain")).find((n) =>
              n.startsWith("rejected-"),
            ) ?? "missing-rejection",
            "rejection.json",
          ),
          "utf8",
        ),
      );
      expect(rejection.phase).toBe("before-child");
      expect(rejection.recordedIds).toEqual([]);
    });
  });

  it("keeps workflow configuration inputs outside the evidence ancestor tree", () => {
    const workflow = readFileSync(
      join(process.cwd(), ".github/workflows/ci.yml"),
      "utf8",
    );
    expect(workflow).not.toContain("initialized-prefix-artifacts/config");
    expect(workflow.match(/initialized-prefix-native-inputs/g)).toHaveLength(5);
  });
});
