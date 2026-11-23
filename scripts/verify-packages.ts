/** Verifies repository-authored archives only. Never accepts user code, paths or imports. */
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { unzipSync } from "fflate";
import { projects } from "../src/content/course";
import { buildProjectArchive } from "./project-archive";
import { generateFileSchemaPackageLock } from "./file-schema-package-commands";
import { verifyMiniGrepMutants } from "./mini-grep-mutants";

const args = process.argv.slice(2);
const msrv = args.length === 1 && args[0] === "--msrv";
if (args.length && !msrv) throw new Error("Expected no options or --msrv");

const durableLogPackages = new Set([
  "durable-log-service-workspace",
  "durable-log-retry-workspace",
]);

const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-cargo-"));
let failures = 0;
function command(
  directory: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  expectFailure = false,
) {
  const result = spawnSync("cargo", args, {
    cwd: directory,
    env,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const passedTests = [
    ...stdout.matchAll(/test result: ok\. (\d+) passed/g),
  ].reduce((sum, match) => sum + Number(match[1]), 0);
  const passed =
    !result.error &&
    (expectFailure
      ? result.status !== 0 &&
        /test result: FAILED/.test(stdout) &&
        /not yet implemented/.test(stderr + stdout)
      : result.status === 0 && (args[0] !== "test" || passedTests > 0));
  console.log(
    `${passed ? "ok" : "FAIL"} ${directory.split("/").slice(-2).join("/")}: cargo ${args.join(" ")}${expectFailure ? " (starter fails unfinished behavior)" : ""}`,
  );
  if (!passed) {
    failures++;
    console.error(result.error?.message ?? stdout + stderr);
  }
  if (args[0] === "generate-lockfile") {
    console.log(
      JSON.stringify({
        argv: ["cargo", ...args],
        cwd: directory,
        status: result.status,
        signal: result.signal,
        error: result.error?.message ?? null,
        stdout,
        stderr,
      }),
    );
  }
  return passed;
}
try {
  const packages = projects.flatMap((project) =>
    project.package ? [project.package] : [],
  );
  if (!packages.length) throw new Error("No authored Cargo packages to verify");
  for (const project of packages) {
    const env = msrv
      ? {
          ...process.env,
          RUSTUP_TOOLCHAIN: durableLogPackages.has(project.id)
            ? "1.89.0"
            : "1.85.0",
        }
      : process.env;
    for (const variant of ["starter", "solution"] as const) {
      const bytes = buildProjectArchive(project, variant);
      const served = readFileSync(
        join(process.cwd(), "public", "projects", project.id, `${variant}.zip`),
      );
      if (!served.equals(Buffer.from(bytes)))
        throw new Error(`Stale downloadable archive: ${project.id}/${variant}`);
      const directory = join(root, variant);
      for (const [path, contents] of Object.entries(unzipSync(bytes))) {
        const target = join(directory, path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, contents);
      }
      const packageRoot = join(directory, project.id);
      const lock = generateFileSchemaPackageLock(
        project.id,
        packageRoot,
        (args) => command(packageRoot, args, env),
      );
      if (lock) console.log(JSON.stringify({ generatedLock: lock.binding }));
      command(packageRoot, ["fmt", "--all", "--", "--check"], env);
      lock?.assertUnchanged();
      command(
        packageRoot,
        ["check", "--workspace", "--offline", "--locked", "--all-targets"],
        env,
      );
      lock?.assertUnchanged();
      command(
        packageRoot,
        [
          "test",
          ...(variant === "starter" ? ["--no-fail-fast"] : []),
          "--workspace",
          "--offline",
          "--locked",
        ],
        env,
        variant === "starter",
      );
      lock?.assertUnchanged();
      if (variant === "solution")
        command(
          packageRoot,
          [
            "clippy",
            "--workspace",
            "--offline",
            "--locked",
            "--all-targets",
            "--",
            "-D",
            "warnings",
          ],
          env,
        );
      lock?.assertUnchanged();
      if (variant === "solution" && project.id === "mini-grep-workshop")
        verifyMiniGrepMutants(packageRoot, env);
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
if (failures) process.exitCode = 1;
