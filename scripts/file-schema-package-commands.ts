import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const packageId = "file-schema-evolution-workshop";

export function fileSchemaPackageLockCommand(
  id: string,
  packageRoot: string,
): string[] {
  if (id !== packageId) return [];
  assert(
    isAbsolute(packageRoot) && resolve(packageRoot) === packageRoot,
    "package root must be absolute and canonical",
  );
  return [
    "generate-lockfile",
    "--offline",
    "--manifest-path",
    join(packageRoot, "Cargo.toml"),
  ];
}

function lockBinding(path: string) {
  const st = lstatSync(path);
  assert(
    st.isFile() && !st.isSymbolicLink() && realpathSync(path) === path,
    "generated lock must be a canonical regular file",
  );
  const bytes = readFileSync(path);
  assert(bytes.length > 0, "generated lock is empty");
  return {
    path,
    bytes: bytes.length,
    mode: st.mode & 0o7777,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** The only package with an intentionally unauthored lockfile. */
export function generateFileSchemaPackageLock(
  id: string,
  packageRoot: string,
  run: (argv: string[]) => boolean,
) {
  const argv = fileSchemaPackageLockCommand(id, packageRoot);
  if (argv.length === 0) return undefined;
  assert(
    lstatSync(packageRoot).isDirectory() &&
      realpathSync(packageRoot) === packageRoot,
    "owned package root required",
  );
  const path = join(packageRoot, "Cargo.lock");
  assert.throws(
    () => lstatSync(path),
    { code: "ENOENT" },
    "new archive must not contain a lockfile",
  );
  assert.equal(run(argv), true, "file schema lock generation failed");
  const binding = lockBinding(path);
  return {
    binding,
    assertUnchanged() {
      assert.deepEqual(
        lockBinding(path),
        binding,
        "generated Cargo.lock changed",
      );
    },
  };
}
