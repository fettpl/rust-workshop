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

const root = mkdtempSync(join(tmpdir(), "rust-workshop-authored-cargo-"));
let failures = 0;
function command(directory: string, args: string[], expectFailure = false) {
  const result = spawnSync("cargo", args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const passedTests = [
    ...result.stdout.matchAll(/test result: ok\. (\d+) passed/g),
  ].reduce((sum, match) => sum + Number(match[1]), 0);
  const passed =
    !result.error &&
    (expectFailure
      ? result.status !== 0 &&
        /test result: FAILED/.test(result.stdout) &&
        /not yet implemented/.test(result.stderr + result.stdout)
      : result.status === 0 && (args[0] !== "test" || passedTests > 0));
  console.log(
    `${passed ? "ok" : "FAIL"} ${directory.split("/").slice(-2).join("/")}: cargo ${args.join(" ")}${expectFailure ? " (starter fails unfinished behavior)" : ""}`,
  );
  if (!passed) {
    failures++;
    console.error(result.error?.message ?? result.stdout + result.stderr);
  }
}
try {
  const packages = projects.flatMap((project) =>
    project.package ? [project.package] : [],
  );
  if (!packages.length) throw new Error("No authored Cargo packages to verify");
  for (const project of packages)
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
      command(packageRoot, ["fmt", "--all", "--", "--check"]);
      command(packageRoot, [
        "check",
        "--workspace",
        "--offline",
        "--locked",
        "--all-targets",
      ]);
      command(
        packageRoot,
        ["test", "--workspace", "--offline", "--locked"],
        variant === "starter",
      );
      if (variant === "solution")
        command(packageRoot, [
          "clippy",
          "--workspace",
          "--offline",
          "--locked",
          "--all-targets",
          "--",
          "-D",
          "warnings",
        ]);
    }
} finally {
  rmSync(root, { recursive: true, force: true });
}
if (failures) process.exitCode = 1;
