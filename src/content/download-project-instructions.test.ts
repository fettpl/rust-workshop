/** Local controls for instructions shipped inside downloadable project archives. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { projects } from "./course";
import { projectFiles } from "../domain/project-package";

function project(id: string) {
  const found = projects.find((entry) => entry.package?.id === id);
  if (!found?.package) throw new Error(`Missing authored package ${id}`);
  return { contract: found, archive: found.package };
}

it("Number Guessing instructions preserve the exact version shipped in its manifest", () => {
  const { contract, archive } = project("number-guessing-workshop");
  const files = projectFiles(archive, "solution");
  const version = files["Cargo.toml"].match(
    /rand = \{ version = "=([\d.]+)"/,
  )![1];
  expect(archive.instructions.join(" ")).toContain(`rand ${version}`);
  expect(contract.constraints.join(" ")).toContain(`rand ${version}`);
});

it.each(["log-analyzer-workshop", "service-operations-workshop"])(
  "%s documents fetching its locked dependencies before offline commands",
  (id) => {
    const { archive } = project(id);
    const readme = projectFiles(archive, "starter")["README.md"];
    expect(readme.indexOf("cargo fetch --locked")).toBeGreaterThanOrEqual(0);
    expect(readme.indexOf("cargo fetch --locked")).toBeLessThan(
      readme.indexOf("--offline"),
    );
    expect(archive.instructions.join(" ")).toContain("cargo fetch --locked");
  },
);

it.each([
  "miri-safety-workshop",
  "ffi-buffer-workshop",
  "property-contracts-workshop",
])(
  "%s emits Markdown code markers rather than literal escaped backticks",
  (id) => {
    for (const [path, text] of Object.entries(
      projectFiles(project(id).archive, "solution"),
    )) {
      if (path.endsWith(".md")) expect(text, path).not.toContain("\\`");
    }
  },
);

it("the Miri download documents Cargo commands that run from the extracted package", () => {
  const files = projectFiles(
    project("miri-safety-workshop").archive,
    "solution",
  );
  const readme = files["README.md"];
  expect(readme).toContain("cargo check --offline --locked --all-targets");
  expect(readme).toContain("cargo test --offline --locked");
  expect(readme).toContain("package.json");
  const dir = mkdtempSync(join(tmpdir(), "download-miri-instructions-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      const target = join(dir, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text);
    }
    // Only the safe root crate is run; fixtures/ is a separate package.
    for (const args of [
      ["check", "--offline", "--locked", "--all-targets"],
      ["test", "--offline", "--locked"],
    ]) {
      const run = spawnSync("cargo", args, {
        cwd: dir,
        encoding: "utf8",
        timeout: 60_000,
      });
      expect(run.error).toBeUndefined();
      expect(run.status, run.stdout + run.stderr).toBe(0);
      if (args[0] === "test")
        expect(run.stdout).toMatch(/test result: ok\. [1-9]\d* passed/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 60_000);
