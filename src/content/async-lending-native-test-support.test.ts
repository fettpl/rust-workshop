import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

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
        record.argv[0] === "rustc" &&
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
