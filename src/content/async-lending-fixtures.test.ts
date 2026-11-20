import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { asyncLendingBoundaryFixtures } from "./async-lending-fixtures";

it.each(asyncLendingBoundaryFixtures)(
  "$id keeps its compiler boundary",
  (fixture) => {
    const directory = mkdtempSync(join(tmpdir(), "async-lending-fixture-"));
    try {
      const file = join(directory, "fixture.rs");
      writeFileSync(file, fixture.source);
      const result = spawnSync("rustc", ["--edition=2024", file], {
        cwd: directory,
        encoding: "utf8",
        timeout: 30_000,
      });
      if (fixture.mode === "pass") {
        expect(result.status, `${fixture.id}: ${result.stderr}`).toBe(0);
      } else {
        expect(result.status, `${fixture.id}: ${result.stderr}`).not.toBe(0);
        expect(`${result.stdout}\n${result.stderr}`, fixture.id).toContain(
          fixture.diagnostic!,
        );
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
