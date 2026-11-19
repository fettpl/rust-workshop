import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  cargoExecutable,
  behavioralRejection,
  testCounts,
} from "../../scripts/cargo-observation";
import { lessons } from "./course";

const mutations: Record<string, Array<[string, string]>> = {
  "tokio-graceful-shutdown-fallible-drain-transfer": [
    ["input.close(); stopping=true;", "stopping=true;"],
    [
      "results.push(consume(value))",
      "{ let result=consume(value); if result.is_err() { results.push(result); return results; } results.push(result); }",
    ],
  ],
  "tokio-receiver-stream-drain-partition-transfer": [
    ["    stream.close();", ""],
    ["if keep(&value)", "if true"],
  ],
  "tokio-receiver-stream-drain-batch-or-stop-transfer": [
    [
      "biased;\n            _ = &mut *stop => return BatchRead::Stopped(values),\n            value=stream.next() => match value {Some(value)=>values.push(value),None=>return BatchRead::Closed(values)},",
      "biased;\n            value=stream.next() => match value {Some(value)=>values.push(value),None=>return BatchRead::Closed(values)},\n            _ = &mut *stop => return BatchRead::Stopped(values),",
    ],
    ["while values.len()<limit", "while values.len()<=limit"],
  ],
};

it.each(Object.keys(mutations))(
  "%s passes native tests and rejects compiling protocol regressions",
  (id) => {
    const step = lessons
      .flatMap((lesson) => lesson.steps)
      .find((step) => step.id === id)!;
    expect(step.evaluator?.kind).toBe("tests");
    if (step.evaluator?.kind !== "tests") return;
    const directory = mkdtempSync(join(tmpdir(), "tokio-recovery-"));
    try {
      const profile = new URL(
        "../../scripts/fixtures/tokio-runtime-1.54.1/",
        import.meta.url,
      );
      copyFileSync(
        new URL("Cargo.toml", profile),
        join(directory, "Cargo.toml"),
      );
      copyFileSync(
        new URL("Cargo.lock", profile),
        join(directory, "Cargo.lock"),
      );
      mkdirSync(join(directory, "src"));
      writeFileSync(join(directory, "src/main.rs"), "fn main() {}\n");
      const cases = [
        { source: step.solution!, mutant: false },
        ...mutations[id].map(([before, after]) => {
          expect(step.solution).toContain(before);
          return {
            source: step.solution!.replace(before, after),
            mutant: true,
          };
        }),
      ];
      for (const fixture of cases) {
        writeFileSync(
          join(directory, "src/lib.rs"),
          appendHiddenTests(fixture.source, step.evaluator.tests),
        );
        const compiled = spawnSync(
          "cargo",
          [
            "test",
            "--offline",
            "--locked",
            "--no-run",
            "--lib",
            "--message-format=json",
          ],
          {
            cwd: directory,
            encoding: "utf8",
            timeout: 60_000,
            env: {
              ...process.env,
              CARGO_TARGET_DIR: join(directory, "target"),
            },
          },
        );
        expect(compiled.error).toBeUndefined();
        expect(compiled.signal).toBeNull();
        expect(compiled.status, compiled.stdout + compiled.stderr).toBe(0);
        const binary = cargoExecutable(
          compiled.stdout,
          "rust_workshop_tokio_fixtures",
        );
        expect(binary).toBeDefined();
        expect(
          resolve(binary!).startsWith(resolve(directory, "target") + sep),
        ).toBe(true);
        const executed = spawnSync(binary!, ["--test-threads=1"], {
          cwd: directory,
          encoding: "utf8",
          timeout: 8_000,
        });
        expect(executed.error).toBeUndefined();
        expect(executed.signal).toBeNull();
        const counts = testCounts(executed.stdout);
        expect(counts).toBeDefined();
        if (fixture.mutant) {
          expect(executed.status, executed.stdout + executed.stderr).toBe(101);
          expect(behavioralRejection(executed)).toBe(true);
        } else {
          expect(executed.status, executed.stdout + executed.stderr).toBe(0);
          expect(counts!.passed).toBeGreaterThan(0);
          expect(counts!.failed).toBe(0);
        }
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  90_000,
);
