import { createHash } from "node:crypto";
import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it, vi } from "vitest";

it("resolves a configured relative evidence root before native consumers use it", () => {
  const repository = process.cwd();
  const relativeEvidenceRoot = `.m11-native-relative-${process.pid}-${Date.now()}`;
  const child = spawnSync(
    process.execPath,
    [
      "./node_modules/vitest/vitest.mjs",
      "run",
      "src/content/async-lending-transfer-boundaries.test.ts",
      "-t",
      "local-operation-static",
    ],
    {
      cwd: repository,
      encoding: "utf8",
      env: { ...process.env, M11_NATIVE_EVIDENCE_DIR: relativeEvidenceRoot },
      timeout: 60_000,
    },
  );
  try {
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status, `${child.stdout}\n${child.stderr}`).toBe(0);

    const records: {
      argv: string[];
      cwd: string;
      status: number | null;
      signal: string | null;
      sourceHashes: Record<string, string>;
    }[] = [];
    const readRecords = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) readRecords(path);
        else if (entry.name === "command.json")
          records.push(JSON.parse(readFileSync(path, "utf8")));
      }
    };
    readRecords(resolve(repository, relativeEvidenceRoot));

    const successfulCompile = records.find(
      (record) =>
        record.argv[0]?.endsWith("/rustc") &&
        record.argv.some((argument) => argument.endsWith("canonical-pass.rs")),
    );
    expect(successfulCompile).toMatchObject({
      status: 0,
      signal: null,
    });
    expect(isAbsolute(successfulCompile!.cwd)).toBe(true);
    expect(dirname(successfulCompile!.cwd)).toBe(
      resolve(repository, relativeEvidenceRoot),
    );
    const sourcePath = successfulCompile!.argv.find((argument) =>
      argument.endsWith("canonical-pass.rs"),
    )!;
    expect(sourcePath).toBe(join(successfulCompile!.cwd, "canonical-pass.rs"));
    expect(successfulCompile!.sourceHashes[sourcePath]).toMatch(
      /^[0-9a-f]{64}$/,
    );
  } finally {
    rmSync(resolve(repository, relativeEvidenceRoot), {
      recursive: true,
      force: true,
    });
  }
}, 60_000);

it("keeps an empty evidence root in disposable mode", () => {
  const repository = process.cwd();
  const disposableRoot = mkdtempSync(join(tmpdir(), "m11-native-disposable-"));
  try {
    const child = spawnSync(
      process.execPath,
      [
        "./node_modules/vitest/vitest.mjs",
        "run",
        "src/content/async-lending-transfer-boundaries.test.ts",
        "-t",
        "local-operation-static",
      ],
      {
        cwd: repository,
        encoding: "utf8",
        env: {
          ...process.env,
          M11_NATIVE_EVIDENCE_DIR: "",
          TMPDIR: disposableRoot,
        },
        timeout: 60_000,
      },
    );
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status, `${child.stdout}\n${child.stderr}`).toBe(0);
    expect(readdirSync(disposableRoot)).toEqual([]);
  } finally {
    rmSync(disposableRoot, { recursive: true, force: true });
  }
}, 60_000);

it("records the executable selected by PATH when earlier candidates are not runnable", async () => {
  const retainEvidence = Boolean(process.env.M11_NATIVE_EVIDENCE_DIR);
  let evidenceRoot: string | undefined;
  let workspace: string | undefined;
  let shadowDirectory: string | undefined;
  let executableDirectory: string | undefined;
  try {
    evidenceRoot = retainEvidence
      ? resolve(process.env.M11_NATIVE_EVIDENCE_DIR!)
      : mkdtempSync(join(tmpdir(), "m11-native-executable-evidence-"));
    mkdirSync(evidenceRoot!, { recursive: true });
    workspace = mkdtempSync(join(evidenceRoot!, "workspace-"));
    const command = `m11-native-node-${process.pid}`;
    shadowDirectory = mkdtempSync(join(evidenceRoot!, "shadow-"));
    executableDirectory = mkdtempSync(join(evidenceRoot!, "executable-"));
    const executablePath = join(executableDirectory!, command);
    symlinkSync(process.execPath, executablePath);
    const executableHash = createHash("sha256")
      .update(readFileSync(process.execPath))
      .digest("hex");
    type NativeRecord = {
      argv: string[];
      requestedArgv: string[];
      executablePath?: string;
      sourceHashes: Record<string, string>;
      stderrSha256: string;
      status: number | null;
      signal: string | null;
      error?: string;
      executableResolution: string;
    };
    const recordFor = (cwd: string, marker: string) => {
      const commandRecordPath = readdirSync(cwd)
        .filter((entry) => entry.startsWith("command-"))
        .map((entry) => join(cwd, entry, "command.json"))
        .find((path) =>
          JSON.parse(readFileSync(path, "utf8")).argv.includes(marker),
        );
      expect(commandRecordPath).toBeDefined();
      return JSON.parse(
        readFileSync(commandRecordPath!, "utf8"),
      ) as NativeRecord;
    };
    vi.stubEnv("M11_NATIVE_EVIDENCE_DIR", evidenceRoot);
    vi.resetModules();
    const { nativeRun } = await import("./async-lending-native-test-support");
    const scenarios = [
      {
        name: "skips-non-executable-shadow",
        setup: (cwd: string) => {
          void cwd;
          const shadow = join(shadowDirectory!, command);
          writeFileSync(shadow, "shadow\n");
          chmodSync(shadow, 0o644);
          return {
            path: `${shadowDirectory}:${executableDirectory}`,
            expected: executablePath,
          };
        },
      },
      {
        name: "resolves-relative-entry-from-child-cwd",
        setup: (cwd: string) => {
          const relativeDirectory = join(cwd, "relative-bin");
          mkdirSync(relativeDirectory);
          const relativeExecutable = join(relativeDirectory, command);
          symlinkSync(process.execPath, relativeExecutable);
          return {
            path: `relative-bin:${shadowDirectory!}:${executableDirectory!}`,
            expected: relativeExecutable,
          };
        },
      },
      {
        name: "resolves-empty-entry-from-child-cwd",
        setup: (cwd: string) => {
          const emptyEntryExecutable = join(cwd, command);
          symlinkSync(process.execPath, emptyEntryExecutable);
          return {
            path: `:${executableDirectory!}`,
            expected: emptyEntryExecutable,
          };
        },
      },
      {
        name: "skips-directory-candidate",
        setup: (cwd: string) => {
          mkdirSync(join(cwd, command));
          return {
            path: `${cwd}:${executableDirectory!}`,
            expected: executablePath,
          };
        },
      },
    ];
    for (const scenario of scenarios) {
      const cwd = mkdtempSync(join(workspace!, `${scenario.name}-`));
      const { path, expected } = scenario.setup(cwd);
      vi.stubEnv("PATH", path);
      const marker = scenario.name;
      const result = nativeRun(
        command,
        ["-e", `process.stdout.write(${JSON.stringify(marker)})`, marker],
        cwd,
        60_000,
      );
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(result.stdout).toBe(marker);
      const record = recordFor(cwd, marker);
      expect(record).toMatchObject({
        argv: [expected, "-e", expect.any(String), marker],
        requestedArgv: [command, "-e", expect.any(String), marker],
        executablePath: expected,
        status: result.status,
        signal: result.signal,
        executableResolution: "selected",
      });
      expect(record.sourceHashes[expected]).toBe(executableHash);
      expect(record.stderrSha256).toBe(
        createHash("sha256")
          .update(result.stderr ?? "")
          .digest("hex"),
      );
    }

    const fallbackCwd = mkdtempSync(join(workspace!, "default-path-fallback-"));
    const fallbackMarker = "default-path-fallback";
    delete process.env.PATH;
    const fallbackResult = nativeRun(
      "sh",
      ["-c", `printf %s ${JSON.stringify(fallbackMarker)}`, fallbackMarker],
      fallbackCwd,
      60_000,
    );
    expect(fallbackResult.error).toBeUndefined();
    expect(fallbackResult.signal).toBeNull();
    expect(fallbackResult.status).toBe(0);
    expect(fallbackResult.stdout).toBe(fallbackMarker);
    const fallbackRecord = recordFor(fallbackCwd, fallbackMarker);
    const fallbackExecutable = ["/usr/bin/sh", "/bin/sh"].find((path) => {
      try {
        return (
          statSync(path).isFile() &&
          accessSync(path, constants.X_OK) === undefined
        );
      } catch {
        return false;
      }
    });
    expect(fallbackExecutable).toBeDefined();
    expect(fallbackRecord.sourceHashes[fallbackExecutable!]).toBe(
      createHash("sha256")
        .update(readFileSync(fallbackExecutable!))
        .digest("hex"),
    );
    expect(fallbackRecord).toMatchObject({
      argv: [fallbackExecutable, "-c", expect.any(String), fallbackMarker],
      requestedArgv: ["sh", "-c", expect.any(String), fallbackMarker],
      executablePath: fallbackExecutable,
      status: 0,
      signal: null,
      executableResolution: "selected",
    });

    const invalidCwd = mkdtempSync(join(workspace!, "invalid-shebang-"));
    const invalidDirectory = mkdtempSync(join(evidenceRoot!, "invalid-"));
    const invalidPath = join(invalidDirectory, command);
    writeFileSync(invalidPath, "#!/m11-missing-interpreter\nprintf invalid\\n");
    chmodSync(invalidPath, 0o755);
    const invalidMarker = "invalid-shebang";
    vi.stubEnv("PATH", `${invalidDirectory}:${executableDirectory!}`);
    const invalidResult = nativeRun(
      command,
      [
        "-e",
        `process.stdout.write(${JSON.stringify(invalidMarker)})`,
        invalidMarker,
      ],
      invalidCwd,
      60_000,
    );
    expect(invalidResult.error).toBeDefined();
    expect(invalidResult.signal).toBeNull();
    const invalidRecord = recordFor(invalidCwd, invalidMarker);
    expect(invalidRecord).toMatchObject({
      argv: [invalidPath, "-e", expect.any(String), invalidMarker],
      requestedArgv: [command, "-e", expect.any(String), invalidMarker],
      executablePath: invalidPath,
      status: null,
      signal: null,
      executableResolution: "selected",
    });
    expect(invalidRecord.sourceHashes[invalidPath]).toBe(
      createHash("sha256").update(readFileSync(invalidPath)).digest("hex"),
    );

    const directCwd = mkdtempSync(join(workspace!, "direct-non-executable-"));
    const directName = `direct-non-executable-${process.pid}`;
    const directPath = join(directCwd, directName);
    writeFileSync(directPath, "direct\n");
    chmodSync(directPath, 0o644);
    const directMarker = "direct-non-executable";
    const directResult = nativeRun(
      `./${directName}`,
      [directMarker],
      directCwd,
      60_000,
    );
    expect(directResult.error).toBeDefined();
    expect(directResult.signal).toBeNull();
    expect(directResult.status).toBeNull();
    const directRecord = recordFor(directCwd, directMarker);
    expect(directRecord).toMatchObject({
      argv: [`./${directName}`, directMarker],
      requestedArgv: [`./${directName}`, directMarker],
      status: null,
      signal: null,
      executableResolution: "unresolved",
    });
    expect(directRecord.executablePath).toBeUndefined();
    expect(directRecord.error).toBeDefined();
    expect(
      directRecord.sourceHashes[resolve(directCwd, directPath)],
    ).toBeUndefined();
  } finally {
    vi.unstubAllEnvs();
    vi.resetModules();
    if (!retainEvidence) {
      for (const directory of [
        workspace,
        shadowDirectory,
        executableDirectory,
        evidenceRoot,
      ])
        if (directory) rmSync(directory, { recursive: true, force: true });
    }
  }
}, 60_000);
