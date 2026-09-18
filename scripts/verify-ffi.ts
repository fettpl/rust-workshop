/** Verifies only the repository-authored FFI package and native integration. */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { ffiBufferPackage } from "../src/content/projects/ffi-buffer";
import { buildProjectArchive } from "./project-archive";

const args = process.argv.slice(2);
if (
  !args.every((argument) => argument === "--fetch" || argument === "--msrv") ||
  new Set(args).size !== args.length
) {
  throw new Error(
    "Only --fetch and --msrv are supported once each; code, paths and dependency overrides are not accepted.",
  );
}

const fetchDependencies = args.includes("--fetch");
const useMsrv = args.includes("--msrv");
const env = { ...process.env };
let cargo = "cargo";

if (useMsrv) {
  const paths: Record<string, string> = {};
  for (const tool of ["cargo", "rustc", "rustdoc"]) {
    const result = spawnSync(
      "rustup",
      ["which", "--toolchain", "1.85.0", tool],
      { encoding: "utf8", timeout: 10_000 },
    );
    if (result.error || result.status !== 0) {
      throw result.error ?? new Error(`rustup which failed for ${tool}`);
    }
    paths[tool] = result.stdout.trim();
    const version = spawnSync(paths[tool], ["--version"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    if (version.error || version.status !== 0) {
      throw version.error ?? new Error(`${tool} --version failed`);
    }
    if (!version.stdout.startsWith(`${tool} 1.85.0 `)) {
      throw new Error(`Expected exact MSRV ${tool}: ${version.stdout}`);
    }
    console.log(version.stdout.trim());
  }
  cargo = paths.cargo;
  env.RUSTC = paths.rustc;
  env.RUSTDOC = paths.rustdoc;
  env.PATH = `${dirname(cargo)}${delimiter}${env.PATH ?? ""}`;
} else {
  const version = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  if (version.error || version.status !== 0) {
    throw version.error ?? new Error("rustc --version failed");
  }
  if (version.stdout.includes("nightly")) {
    throw new Error(`stable rustc required: ${version.stdout}`);
  }
  console.log(version.stdout.trim());
}

const root = join(tmpdir(), `rust-workshop-${ffiBufferPackage.id}`);
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

function execute(directory: string, commandArgs: string[]) {
  const result = spawnSync(cargo, commandArgs, {
    cwd: directory,
    encoding: "utf8",
    timeout: 60_000,
    env,
    maxBuffer: 2 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  return result;
}

function run(directory: string, commandArgs: string[]) {
  const result = execute(directory, commandArgs);
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`cargo ${commandArgs.join(" ")} failed`);
  }
  console.log(`ok cargo ${commandArgs.join(" ")}`);
}

function extractArchive(bytes: Uint8Array, directory: string) {
  for (const [path, contents] of Object.entries(unzipSync(bytes))) {
    const target = join(directory, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
}

function expectNoOpDropMutantRejected(directory: string) {
  const commandArgs = [
    "test",
    "--offline",
    "--locked",
    "--test",
    "native_integration",
    "drop_releases_the_native_owner_without_manual_free",
    "--",
    "--exact",
    "--test-threads=1",
  ];
  const result = execute(directory, commandArgs);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (
    result.error ||
    result.status === 0 ||
    !output.includes("test result: FAILED")
  ) {
    throw new Error(
      `controlled no-op Drop mutant was not rejected:\n${output}`,
    );
  }
  console.log("ok controlled no-op Drop mutant rejected");
}

try {
  const archives = Object.fromEntries(
    (["starter", "solution"] as const).map((variant) => {
      const bytes = buildProjectArchive(ffiBufferPackage, variant);
      const servedPath = join(
        process.cwd(),
        "public",
        "projects",
        ffiBufferPackage.id,
        `${variant}.zip`,
      );
      if (!existsSync(servedPath))
        throw new Error(`Missing served ${variant} archive: ${servedPath}`);
      if (!readFileSync(servedPath).equals(Buffer.from(bytes)))
        throw new Error(
          `Stale FFI ${variant} archive; run content:packages first`,
        );
      return [variant, bytes];
    }),
  ) as Record<"starter" | "solution", Uint8Array>;
  const bytes = archives.solution;

  const solutionRoot = join(root, "solution");
  const mutantRoot = join(root, "mutant");
  extractArchive(bytes, solutionRoot);
  extractArchive(bytes, mutantRoot);
  const packageRoot = join(solutionRoot, ffiBufferPackage.id);
  const mutantPackageRoot = join(mutantRoot, ffiBufferPackage.id);
  const dropSourcePath = join(mutantPackageRoot, "src", "lib.rs");
  const dropSource = readFileSync(dropSourcePath, "utf8");
  const noOpDrop = dropSource.replace(
    "unsafe { sys::ffi_buffer_destroy(self.raw.as_ptr()) };",
    "/* controlled no-op Drop mutant */",
  );
  if (noOpDrop === dropSource)
    throw new Error("No-op Drop mutation did not modify the authored source");
  writeFileSync(dropSourcePath, noOpDrop);

  if (fetchDependencies) run(packageRoot, ["fetch", "--locked"]);
  run(packageRoot, ["fmt", "--all", "--", "--check"]);
  run(packageRoot, ["check", "--all-targets", "--offline", "--locked"]);
  run(packageRoot, ["test", "--offline", "--locked"]);
  run(packageRoot, [
    "clippy",
    "--all-targets",
    "--locked",
    "--",
    "-D",
    "warnings",
  ]);
  expectNoOpDropMutantRejected(mutantPackageRoot);
} finally {
  rmSync(root, { recursive: true, force: true });
}
