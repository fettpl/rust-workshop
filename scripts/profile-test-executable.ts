import assert from "node:assert/strict";
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

/** Selects only the authored integration test from the final successful Cargo build. */
export function selectProfileTestExecutable(
  stdout: string,
  packageRoot: string,
  targetRoot: string,
): string {
  const messages = stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert(messages.every((message) => message && typeof message === "object"));
  const finished = messages.filter(
    (message) => message.reason === "build-finished",
  );
  assert.equal(finished.length, 1, "Expected one Cargo build result");
  assert.equal(finished[0].success, true, "Cargo build must succeed");
  assert.equal(
    messages.at(-1),
    finished[0],
    "Cargo build result must be final",
  );
  const artifacts = messages.filter(
    (message) =>
      message.reason === "compiler-artifact" &&
      message.target?.name === "source_model_contract" &&
      message.target?.kind?.length === 1 &&
      message.target.kind[0] === "test" &&
      message.profile?.test === true &&
      message.manifest_path === join(packageRoot, "Cargo.toml") &&
      message.target.src_path ===
        join(packageRoot, "tests/source_model_contract.rs"),
  );
  assert.equal(
    artifacts.length,
    1,
    "Expected exactly one authored source model test artifact",
  );
  const executable: unknown = artifacts[0].executable;
  assert(typeof executable === "string" && isAbsolute(executable));
  assert.equal(
    executable,
    resolve(executable),
    "Cargo executable must be canonical",
  );
  const ownedTarget = realpathSync(targetRoot);
  assert.equal(
    ownedTarget,
    resolve(targetRoot),
    "Cargo target directory must be canonical",
  );
  const path = relative(ownedTarget, executable);
  assert(
    path && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path),
    "Cargo executable must be inside the owned target directory",
  );
  const info = lstatSync(executable);
  assert(
    info.isFile() && !info.isSymbolicLink() && (info.mode & 0o111) !== 0,
    "Cargo test artifact must be an executable regular file",
  );
  assert.equal(
    realpathSync(executable),
    executable,
    "Cargo test artifact cannot use a symlink alias",
  );
  return executable;
}
