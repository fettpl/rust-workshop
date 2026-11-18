import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { selectProfileTestExecutable } from "./profile-test-executable";

it("selects the exact authored test artifact from a nonstandard owned Cargo target directory", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "profile-artifact-")));
  try {
    const packageRoot = join(root, "package");
    const targetRoot = join(root, "owned-build");
    const source = join(packageRoot, "tests/source_model_contract.rs");
    const executable = join(
      targetRoot,
      "custom-layout/source_model_contract-abc",
    );
    mkdirSync(join(packageRoot, "tests"), { recursive: true });
    mkdirSync(join(targetRoot, "custom-layout"), { recursive: true });
    writeFileSync(source, "// Fixed nonexecuted test fixture.\n");
    writeFileSync(executable, "fixed nonexecuted artifact");
    chmodSync(executable, 0o700);
    const artifact = {
      reason: "compiler-artifact",
      manifest_path: join(packageRoot, "Cargo.toml"),
      target: {
        name: "source_model_contract",
        kind: ["test"],
        src_path: source,
      },
      profile: { test: true },
      executable,
    };
    const build = (row: unknown) =>
      JSON.stringify(row) +
      "\n" +
      JSON.stringify({ reason: "build-finished", success: true }) +
      "\n";
    expect(
      selectProfileTestExecutable(build(artifact), packageRoot, targetRoot),
    ).toBe(executable);
    const invalid = [
      build({ ...artifact, executable: source }),
      build({ ...artifact, manifest_path: join(root, "other/Cargo.toml") }),
      build({ ...artifact, target: { ...artifact.target, name: "other" } }),
      build({
        ...artifact,
        target: {
          ...artifact.target,
          src_path: join(packageRoot, "src/main.rs"),
        },
      }),
      build({ ...artifact, profile: { test: false } }),
      build({ ...artifact, executable: null }),
      build(artifact) + JSON.stringify(artifact) + "\n",
      JSON.stringify(artifact) + "\n",
      build(artifact).replace('"success":true', '"success":false'),
      "not JSON\n",
    ];
    for (const stdout of invalid)
      expect(() =>
        selectProfileTestExecutable(stdout, packageRoot, targetRoot),
      ).toThrow();
    chmodSync(executable, 0o600);
    expect(() =>
      selectProfileTestExecutable(build(artifact), packageRoot, targetRoot),
    ).toThrow();
    chmodSync(executable, 0o700);
    const alias = join(targetRoot, "linked");
    symlinkSync(executable, alias);
    expect(() =>
      selectProfileTestExecutable(
        build({ ...artifact, executable: alias }),
        packageRoot,
        targetRoot,
      ),
    ).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
