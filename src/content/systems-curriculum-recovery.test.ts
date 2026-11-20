import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { LessonStep } from "../domain/types";
import { evaluate } from "../engine/evaluate";
import { appendHiddenTests } from "../runner";
import { guessingIoLessons, guessingIoReviewExercises } from "./guessing-io";
import { logAnalyzerLessons, logAnalyzerReviewExercises } from "./log-analyzer";
import { atomicStateReviewExercises } from "./atomic-state";
import { memoryOrderingReviewExercises } from "./memory-ordering";

function step(id: string): LessonStep {
  const result = [...guessingIoLessons, ...logAnalyzerLessons]
    .flatMap((lesson) => lesson.steps)
    .find((item) => item.id === id);
  if (!result) throw new Error(`Missing authored step ${id}`);
  return result;
}

// Closed over repository-authored examples and fixed mutations below; never learner input.
function runAuthored(task: LessonStep, source = task.solution!) {
  if (task.evaluator?.kind !== "tests")
    throw new Error("Expected test evaluator");
  const directory = mkdtempSync(join(tmpdir(), "systems-recovery-"));
  try {
    const file = join(directory, "fixture.rs");
    const binary = join(directory, "fixture");
    writeFileSync(file, appendHiddenTests(source, task.evaluator.tests));
    const compile = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      {
        encoding: "utf8",
        timeout: 60_000,
      },
    );
    expect(compile.error).toBeUndefined();
    expect(compile.status, compile.stderr).toBe(0);
    const run = spawnSync(binary, ["--test-threads=1"], {
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(run.error).toBeUndefined();
    return { status: run.status, output: run.stdout + run.stderr };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function rejects(task: LessonStep, source: string) {
  expect(source).not.toBe(task.solution);
  const result = runAuthored(task, source);
  expect(result.status, result.output).toBe(101);
}

it.each([
  "guess-session-io-blank",
  "guess-random-boundary-blank",
  "records-transfer",
])("%s accepts its authored solution", (id) => {
  const result = runAuthored(step(id));
  expect(result.status, result.output).toBe(0);
});

it("notice reception rejects a missing flush and a flush delayed until after input", () => {
  const task = step("guess-session-io-blank");
  rejects(task, task.solution!.replace("    writer.flush()?;", ""));
  rejects(
    task,
    task
      .solution!.replace("    writer.flush()?;", "")
      .replace(
        "    if bytes.is_empty() && !terminated {",
        "    writer.flush()?;\n    if bytes.is_empty() && !terminated {",
      ),
  );
});

it("notice reception publishes the entire prompt before reading", () => {
  const task = step("guess-session-io-blank");
  const write = 'writer.write_all(b"NOTICE READY\\nnotice> ")?;';
  const flush = "writer.flush()?;";
  const original = write + "\n    " + flush;
  rejects(task, task.solution!.replace(original, flush + "\n    " + write));
  const split =
    'writer.write_all(b"NOTICE READY\\n")?;\n    writer.flush()?;\n    writer.write_all(b"notice> ")?;';
  rejects(task, task.solution!.replace(original, split));
  const valid = runAuthored(
    task,
    task.solution!.replace(original, split + "\n    " + flush),
  );
  expect(valid.status, valid.output).toBe(0);
});

it("notice reception preserves read, write and flush failures", () => {
  const task = step("guess-session-io-blank");
  rejects(
    task,
    task.solution!.replaceAll(
      "reader.fill_buf()?",
      "reader.fill_buf().unwrap_or(&[])",
    ),
  );
  rejects(
    task,
    task.solution!.replace(
      'writer.write_all(b"NOTICE READY\\nnotice> ")?;',
      'let _ = writer.write_all(b"NOTICE READY\\nnotice> ");',
    ),
  );
  rejects(
    task,
    task.solution!.replace("writer.flush()?;", "let _ = writer.flush();"),
  );
});

it("notice reception rejects invalid UTF-8 and accepts the exact raw-byte boundary", () => {
  const task = step("guess-session-io-blank");
  rejects(
    task,
    task.solution!.replace(
      /String::from_utf8\(bytes\)[\s\S]*?\n}/,
      "Ok(Some(String::from_utf8_lossy(&bytes).into_owned()))\n}",
    ),
  );
  rejects(
    task,
    task.solution!.replaceAll("> 64", ">= 64").replaceAll("<= 64", "< 64"),
  );
});

it("the sensor transfer rejects invalid, signed, non-ASCII and overflowing timestamps", () => {
  const task = step("records-transfer");
  rejects(
    task,
    task.solution!.replace(
      /    if at_text.is_empty\(\)[\s\S]*?    let \(unit, note\)/,
      "    let at = at_text.parse::<u64>().unwrap_or(42);\n    let (unit, note)",
    ),
  );
});

it("the sensor transfer accepts zero and the u64 upper boundary", () => {
  const task = step("records-transfer");
  rejects(
    task,
    task.solution!.replace(
      "    let (unit, note)",
      "    if at == 0 || at == u64::MAX { return Err(ReadingError::InvalidTime); }\n    let (unit, note)",
    ),
  );
});

it("shift assignment tests both sides of both ranges", () => {
  const task = step("guess-random-boundary-blank");
  rejects(
    task,
    task.solution!.replace(
      "(2..=9).contains(&crew)",
      "(2..=10).contains(&crew)",
    ),
  );
  rejects(
    task,
    task.solution!.replace(
      "(100..=999).contains(&badge)",
      "(100..=1000).contains(&badge)",
    ),
  );
  rejects(
    task,
    task.solution!.replace(
      "(100..=999).contains(&badge)",
      "(101..=998).contains(&badge)",
    ),
  );
});

it("the Loom recall rejects mixed correct and incorrect publication evidence", () => {
  const task = memoryOrderingReviewExercises["loom-evidence"];
  expect(runAuthored(task).status).toBe(0);
  rejects(
    task,
    task.solution!.replace(
      /    assert!\(outcomes.iter\(\).all[\s\S]*?    }\)\);/,
      "",
    ),
  );
});

it("the CAS recall rejects a separate load/store implementation", () => {
  const task = atomicStateReviewExercises["atomic-cas"];
  const source = `use std::sync::atomic::{AtomicUsize, Ordering};
fn raise_to(cell: &AtomicUsize, target: usize) -> bool {
    if cell.load(Ordering::Relaxed) >= target { return false; }
    cell.store(target, Ordering::Relaxed);
    true
}`;
  // This mutation passes sequential result tests; the published evaluator must also reject its store.
  expect(runAuthored(task, source).status).toBe(0);
  expect(
    evaluate(task.evaluator!, {
      code: source,
      result: {
        status: "success",
        stdout: "",
        stderr: "",
        diagnostics: [],
        durationMs: 1,
        tests: { passed: 2, failed: 0 },
      },
    }).passed,
  ).toBe(false);
});

it("review prompts disclose tested error names and the CAS retry bound", () => {
  const pair = atomicStateReviewExercises["atomic-limits"];
  for (const error of ["nieaktualny", "niedobór", "przepełnienie"])
    expect(pair.prompt).toContain(error);
  expect(atomicStateReviewExercises["atomic-cas"].prompt).toContain("8");
});

it("access-parser recall checks timestamp rejection and the original borrowed remainder", () => {
  const task = logAnalyzerReviewExercises["log-borrowed-records"];
  expect(runAuthored(task).status).toBe(0);
  rejects(
    task,
    task.solution!.replace(
      /    if time.is_empty\(\)[\s\S]*?    let \(action, details\)/,
      "    let at = time.parse::<u64>().unwrap_or(7);\n    let (action, details)",
    ),
  );
  rejects(
    task,
    task.solution!.replace(
      "Ok(Access { at, action, details })",
      "Ok(Access { at, action, details: Box::leak(details.to_owned().into_boxed_str()) })",
    ),
  );
});

it("report recall cannot pass by reproducing its single displayed sample", () => {
  const task = logAnalyzerReviewExercises["log-deterministic-report"];
  expect(runAuthored(task).status).toBe(0);
  rejects(
    task,
    task.solution!.replace(
      /    format!\([\s\S]*?    \)/,
      '    String::from("ACCESS V1\\nALLOW 1\\nDENY 2\\nMALFORMED 0\\n")',
    ),
  );
});

it("scanner recall propagates output failures instead of returning success", () => {
  const task = guessingIoReviewExercises["guess-session-io"];
  expect(runAuthored(task).status).toBe(0);
  rejects(
    task,
    task.solution!.replace(
      'writeln!(writer, "SCANNER {station} READY")?;',
      'let _ = writeln!(writer, "SCANNER {station} READY");',
    ),
  );
  rejects(
    task,
    task.solution!.replace(
      "    writer.flush()",
      "    let _ = writer.flush();\n    Ok(())",
    ),
  );
});
