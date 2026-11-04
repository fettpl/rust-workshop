import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import { evaluate } from "../engine/evaluate";
import { serviceClientRetryLessons, serviceClientRetryReviewExercises } from "./service-client-retry";

type RunExpectation = "passed" | "semantic-failure";
type RustExecution = {
  status: "success" | "test-failure" | "compile-error";
  stdout: string;
  stderr: string;
  tests?: { passed: number; failed: number };
};

function compileAndRun(id: string, source: string, tests: string, expectation: RunExpectation): RustExecution {
  const directory = mkdtempSync(join(tmpdir(), `service-client-retry-${id}-`));
  try {
    const file = join(directory, `${id}.rs`);
    const binary = join(directory, id);
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
    });
    expect(compiled.error, `${id}: compiler`).toBeUndefined();
    expect(compiled.status, `${id}: ${compiled.stderr}`).toBe(0);
    const executed = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
    });
    expect(executed.error, `${id}: runner`).toBeUndefined();
    const output = `${executed.stdout}${executed.stderr}`;
    const counts = output.match(/test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/);
    expect(counts, `${id}: exact test counts`).not.toBeNull();
    const execution: RustExecution = {
      status: executed.status === 0 ? "success" : "test-failure",
      stdout: executed.stdout,
      stderr: executed.stderr,
      tests: { passed: Number(counts![1]), failed: Number(counts![2]) },
    };
    if (expectation === "passed") {
      expect(executed.status, `${id}: ${output}`).toBe(0);
      expect(output, `${id}: exact named test count`).toMatch(/test result: ok\. 1 passed/);
    } else {
      expect(executed.status, `${id}: ${output}`).toBe(101);
      expect(output, `${id}: semantic mutant must fail the hidden assertion`).toMatch(
        /test __rust_workshop_hidden_tests::[A-Za-z0-9_]+ \.\.\. FAILED/,
      );
    }
    return execution;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function compileStarter(id: string, source: string, tests: string): RustExecution {
  const directory = mkdtempSync(join(tmpdir(), `service-client-retry-starter-${id}-`));
  try {
    const file = join(directory, `${id}.rs`);
    const binary = join(directory, id);
    writeFileSync(file, appendHiddenTests(source, tests));
    const compiled = spawnSync("rustc", ["--edition=2024", "--test", file, "-o", binary], {
      cwd: directory,
      encoding: "utf8",
      timeout: 60_000,
    });
    if (compiled.status !== 0 || compiled.error) {
      return { status: "compile-error", stdout: compiled.stdout ?? "", stderr: compiled.stderr ?? "" };
    }
    const executed = spawnSync(binary, ["--test-threads=1"], { cwd: directory, encoding: "utf8", timeout: 8_000 });
    const output = `${executed.stdout}${executed.stderr}`;
    const counts = output.match(/test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/);
    return {
      status: executed.status === 0 ? "success" : "test-failure",
      stdout: executed.stdout,
      stderr: executed.stderr,
      ...(counts ? { tests: { passed: Number(counts[1]), failed: Number(counts[2]) } } : {}),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const nextActionEquivalent = `#[derive(Debug, PartialEq)]
enum Action { Retry, Stop, NotAttempted }
fn next_action(attempts_started: u32, max_attempts: u32, now: u64, deadline: u64, backoff: u64, status: &str) -> Action {
    if attempts_started == 0 || max_attempts == 0 || now >= deadline { return Action::NotAttempted; }
    match status {
        "BUSY" | "QUEUE_FULL" if attempts_started < max_attempts && now.checked_add(backoff).is_some_and(|next| next < deadline) => Action::Retry,
        _ => Action::Stop,
    }
}`;
const nextActionMutant = nextActionEquivalent.replace(
  '"BUSY" | "QUEUE_FULL" if attempts_started < max_attempts && now.checked_add(backoff).is_some_and(|next| next < deadline)',
  '"BUSY" | "QUEUE_FULL"',
);

const budgetEquivalent = `#[derive(Debug, PartialEq, Clone, Copy)]
enum StopReason { InvalidPolicy, AttemptLimit, Deadline, BackoffOverflow }
#[derive(Debug, PartialEq)]
enum Reservation { Ready { attempt_end: u64, next_start: u64 }, Stop(StopReason) }
fn reserve(attempts_started: u32, max_attempts: u32, deadline: u64, now: u64, per_attempt: u64, backoff: u64) -> Reservation {
    if max_attempts == 0 || per_attempt == 0 || backoff == 0 { return Reservation::Stop(StopReason::InvalidPolicy); }
    if attempts_started >= max_attempts { return Reservation::Stop(StopReason::AttemptLimit); }
    if now >= deadline { return Reservation::Stop(StopReason::Deadline); }
    let next_start = backoff.checked_mul(attempts_started as u64).and_then(|delay| now.checked_add(delay)).ok_or(StopReason::BackoffOverflow);
    let attempt_end = next_start.clone().and_then(|start| start.checked_add(per_attempt).map(|value| value.min(deadline)).ok_or(StopReason::BackoffOverflow));
    match (attempt_end, next_start) {
        (Ok(attempt_end), Ok(next_start)) if next_start < deadline => Reservation::Ready { attempt_end, next_start },
        (Err(reason), _) | (_, Err(reason)) => Reservation::Stop(reason),
        _ => Reservation::Stop(StopReason::Deadline),
    }
}`;
const budgetMutant = budgetEquivalent.replace("attempts_started >= max_attempts", "attempts_started > max_attempts");

const frameEquivalent = `#[derive(Debug, PartialEq, Clone, Copy)]
enum ReceiptDisposition { Inserted, Duplicate }
#[derive(Debug, PartialEq, Clone, Copy)]
struct Receipt { sequence: u64, disposition: ReceiptDisposition }
#[derive(Debug, PartialEq, Clone, Copy)]
enum TerminalRefusal { Conflict, Full, Schema, TooLarge, Utf8, Version, Fields, Validation }
#[derive(Debug, PartialEq, Clone, Copy)]
enum StopReason { Terminal, AttemptLimit, Deadline, InvalidPolicy }
#[derive(Debug, PartialEq, Clone, Copy)]
enum LastObservation { Receipt(Receipt), Refusal(TerminalRefusal), Transport, Malformed }
#[derive(Debug, PartialEq, Clone, Copy)]
enum Reply { Delivered(Receipt), Refused(TerminalRefusal), Transport }
#[derive(Debug, PartialEq, Clone, Copy)]
enum DriverResult { Delivered { receipt: Receipt, attempts: usize }, Refused { reason: TerminalRefusal, stopped: StopReason, attempts: usize }, Unknown { last: LastObservation, stopped: StopReason, attempts: usize }, NotAttempted { stopped: StopReason } }
fn drive<F>(frame: Vec<u8>, max_attempts: usize, mut send: F) -> DriverResult
where F: FnMut(&[u8]) -> Reply {
    if max_attempts == 0 { return DriverResult::NotAttempted { stopped: StopReason::InvalidPolicy }; }
    let immutable = frame;
    let mut attempt = 0;
    loop {
        attempt += 1;
        match send(&immutable) {
            Reply::Delivered(receipt) if receipt.sequence > 0 => break DriverResult::Delivered { receipt, attempts: attempt },
            Reply::Delivered(_) => break DriverResult::Unknown { last: LastObservation::Malformed, stopped: StopReason::Terminal, attempts: attempt },
            Reply::Refused(reason) => break DriverResult::Refused { reason, stopped: StopReason::Terminal, attempts: attempt },
            Reply::Transport if attempt == max_attempts => break DriverResult::Unknown { last: LastObservation::Transport, stopped: StopReason::AttemptLimit, attempts: attempt },
            Reply::Transport => {}
        }
    }
}`;
const frameMutant = frameEquivalent.replace("Reply::Delivered(receipt) if receipt.sequence > 0 => break DriverResult::Delivered { receipt, attempts: attempt },", "Reply::Delivered(_receipt) => break DriverResult::Delivered { receipt: Receipt { sequence: 0, disposition: ReceiptDisposition::Inserted }, attempts: attempt },");

const aggregateEquivalent = `#[derive(Debug, PartialEq, Clone, Copy)]
enum ReceiptDisposition { Inserted, Duplicate }
#[derive(Debug, PartialEq, Clone, Copy)]
struct Receipt { sequence: u64, disposition: ReceiptDisposition }
#[derive(Debug, PartialEq, Clone, Copy)]
enum TerminalRefusal { Busy, QueueFull, Conflict, Full, Schema, TooLarge, Utf8, Version, Fields, Validation }
#[derive(Debug, PartialEq, Clone, Copy)]
enum Observation { Timeout, Transport, Busy, QueueFull, Storage, Malformed, Unrecognized, Terminal(TerminalRefusal), Receipt(Receipt) }
#[derive(Debug, PartialEq, Clone, Copy)]
enum StopReason { Terminal, AttemptLimit, Deadline, InvalidPolicy }
#[derive(Debug, PartialEq, Clone, Copy)]
enum LastObservation { Receipt(Receipt), Refusal(TerminalRefusal), Transport, Deadline, Storage, Malformed, Unrecognized }
#[derive(Debug, PartialEq, Clone, Copy)]
enum Final { Delivered { receipt: Receipt, attempts: u32 }, Refused { reason: TerminalRefusal, stopped: StopReason, attempts: u32 }, Unknown { last: LastObservation, stopped: StopReason, attempts: u32 }, NotAttempted { stopped: StopReason } }
fn aggregate(observations: &[Observation], stopped: StopReason) -> Final {
    let attempts = observations.len() as u32;
    if attempts == 0 { return Final::NotAttempted { stopped }; }
    let last = match observations.last().unwrap() {
        Observation::Busy => LastObservation::Refusal(TerminalRefusal::Busy), Observation::QueueFull => LastObservation::Refusal(TerminalRefusal::QueueFull),
        Observation::Timeout => LastObservation::Deadline, Observation::Transport => LastObservation::Transport,
        Observation::Storage => LastObservation::Storage, Observation::Malformed => LastObservation::Malformed,
        Observation::Unrecognized => LastObservation::Unrecognized, Observation::Terminal(reason) => LastObservation::Refusal(*reason),
        Observation::Receipt(receipt) if receipt.sequence > 0 => LastObservation::Receipt(*receipt),
        Observation::Receipt(_) => LastObservation::Malformed,
    };
    if let Some(receipt) = observations.iter().find_map(|item| match item { Observation::Receipt(receipt) if receipt.sequence > 0 => Some(*receipt), _ => None }) { return Final::Delivered { receipt, attempts }; }
    let uncertain = observations.iter().any(|item| matches!(item, Observation::Timeout | Observation::Transport | Observation::Storage | Observation::Malformed | Observation::Unrecognized));
    if observations.iter().all(|item| matches!(item, Observation::Busy | Observation::QueueFull)) {
        return Final::Refused { reason: if observations.iter().all(|item| matches!(item, Observation::Busy)) { TerminalRefusal::Busy } else { TerminalRefusal::QueueFull }, stopped, attempts };
    }
    if uncertain || !matches!(stopped, StopReason::Terminal) { return Final::Unknown { last, stopped, attempts }; }
    match last { LastObservation::Refusal(reason) => Final::Refused { reason, stopped, attempts }, _ => Final::Unknown { last, stopped, attempts } }
}`;
const aggregateMutant = aggregateEquivalent.replace("if let Some(receipt) = observations.iter().find_map(|item| match item { Observation::Receipt(receipt) if receipt.sequence > 0 => Some(*receipt), _ => None }) { return Final::Delivered { receipt, attempts }; }", "if let Some(_receipt) = observations.iter().find_map(|item| match item { Observation::Receipt(receipt) => Some(*receipt), _ => None }) { return Final::Delivered { receipt: Receipt { sequence: 0, disposition: ReceiptDisposition::Inserted }, attempts }; }");

it("runs canonical, equivalent, and compiling semantic-mutant controls for all four A10 families", () => {
  const stepById = new Map(serviceClientRetryLessons.flatMap((lesson) => lesson.steps).map((step) => [step.id, step]));
  const reviewById = new Map(Object.values(serviceClientRetryReviewExercises).map((step) => [step.id, step]));
  const cases = [
    ["next-action", stepById.get("service-client-retry-next-action"), nextActionEquivalent, nextActionMutant],
    ["budget", stepById.get("service-client-retry-budget-reservation"), budgetEquivalent, budgetMutant],
    ["next-action-blank", stepById.get("bounded-retry-blank"), nextActionEquivalent, nextActionMutant],
    ["budget-blank", stepById.get("bounded-retry-budget-blank"), budgetEquivalent, budgetMutant],
    ["frame", stepById.get("service-client-immutable-frame-replay"), frameEquivalent, frameMutant],
    ["aggregate", stepById.get("service-client-aggregate-uncertainty"), aggregateEquivalent, aggregateMutant],
    ["frame-blank", stepById.get("ambiguous-driver-frame-blank"), frameEquivalent, frameMutant],
    ["aggregate-blank", stepById.get("ambiguous-driver-blank"), aggregateEquivalent, aggregateMutant],
    ["review-next-action", reviewById.get("review-service-client-retry-policy"), nextActionEquivalent, nextActionMutant],
    ["review-aggregate", reviewById.get("review-service-client-ambiguity-contract"), aggregateEquivalent, aggregateMutant],
  ] as const;
  for (const [id, step, equivalent, mutant] of cases) {
    expect(step?.evaluator?.kind, id).toBe("tests");
    if (!step || step.evaluator?.kind !== "tests" || !step.solution) continue;
    expect(step.evaluator.tests.match(/#\[test\]/g)?.length, id).toBe(1);
    for (const [variant, source, expected] of [
      ["canonical", step.solution, true],
      ["equivalent", equivalent, true],
      ["mutant", mutant, false],
    ] as const) {
      const execution = compileAndRun(`${id}-${variant}`, source, step.evaluator.tests, expected ? "passed" : "semantic-failure");
      expect(execution.tests, `${id}/${variant}: nonempty evaluator count`).toEqual(
        expected ? { passed: 1, failed: 0 } : { passed: 0, failed: 1 },
      );
      const evaluation = evaluate(step.evaluator, {
        code: source,
        result: {
          status: execution.status,
          stdout: execution.stdout,
          stderr: execution.stderr,
          diagnostics: [],
          durationMs: 0,
          tests: execution.tests,
        },
      });
      expect(evaluation.passed, `${id}/${variant}: evaluator outcome`).toBe(expected);
    }
  }
  const codingSteps = [
    ...serviceClientRetryLessons.flatMap((lesson) => lesson.steps),
    ...Object.values(serviceClientRetryReviewExercises),
  ].filter((step) => step.evaluator?.kind === "tests");
  expect(codingSteps, "lesson and review starter coverage").toHaveLength(10);
  for (const step of codingSteps) {
    expect(step.code, `${step.id}: bounded starter`).toBeTruthy();
    expect(step.solution, `${step.id}: authored solution`).toBeTruthy();
    expect(step.code, `${step.id}: starter differs`).not.toBe(step.solution);
    if (step.evaluator?.kind !== "tests" || !step.code) continue;
    const execution = compileStarter(step.id, step.code, step.evaluator.tests);
    expect(execution.status, `${step.id}: starter cannot satisfy its contract`).not.toBe("success");
    const evaluation = evaluate(step.evaluator, {
      code: step.code,
      result: {
        status: execution.status,
        stdout: execution.stdout,
        stderr: execution.stderr,
        diagnostics: [],
        durationMs: 0,
        tests: execution.tests,
      },
    });
    expect(evaluation.passed, `${step.id}: starter evaluator`).toBe(false);
  }
}, 60_000);
