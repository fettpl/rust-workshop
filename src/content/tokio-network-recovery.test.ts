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
import { appendHiddenTests } from "../runner";
import {
  cargoExecutable,
  behavioralRejection,
  testCounts,
} from "../../scripts/cargo-observation";
import { expect, it } from "vitest";
import { lessons, modules, projects } from "./course";
import {
  revealCourseProjectPackageVariant,
  courseGateRecovery,
  recordCourseEvidence,
  evidenceForLessonStep,
  courseModuleGate,
} from "./learning-context";
import { createInitialState } from "../persistence/state";
const lessonId = "tokio-frame-deadlines";
const stepId = "tokio-frame-deadlines-owned-discard-transfer";
it("offers an independent owned connection contract after both borrowed frame directions are supplied", () => {
  const lesson = lessons.find((entry) => entry.id === lessonId)!;
  const step = lesson.steps.find((entry) => entry.id === stepId);
  expect(step).toBeDefined();
  const stage = modules.find((entry) => entry.id === "tokio-network-service")!;
  const criterion = stage.gateCriteria!.find(
    (entry) => entry.id === "tokio-frame-deadlines-contract",
  )!;
  let state = revealCourseProjectPackageVariant(
    createInitialState(),
    projects.find((entry) => entry.package?.id === "tokio-service-workshop")!
      .package!,
    lessons,
    "solution",
    1000,
  );
  expect(courseGateRecovery(state, criterion)).toEqual({
    status: "available",
    task: { lessonId, stepId },
  });
  expect(step!.solution).toContain(
    "Result<(TcpStream, Vec<u8>), ReceiveError>",
  );
  state = recordCourseEvidence(state, {
    id: "frame-recovery/clean",
    lessonId,
    stepId,
    ...evidenceForLessonStep(lesson, step!),
    kind: step!.evidenceKind,
    evaluator: "tests",
    gate: true,
    passed: true,
    hints: 0,
    revealed: false,
    at: 1001,
  });
  expect(
    courseModuleGate(state, lessons, stage).criteria[
      stage.gateCriteria!.indexOf(criterion)
    ].passed,
  ).toBe(true);
});

it("the fixed owned-frame reference and equivalent pass native tests while compiling protocol regressions fail", () => {
  const step = lessons
    .find((entry) => entry.id === lessonId)!
    .steps.find((entry) => entry.id === stepId)!;
  if (step.evaluator?.kind !== "tests")
    throw new Error("Missing authored frame tests");
  const directory = mkdtempSync(join(tmpdir(), "owned-frame-recovery-"));
  try {
    const profile = new URL(
      "../../scripts/fixtures/tokio-runtime-1.54.1/",
      import.meta.url,
    );
    copyFileSync(new URL("Cargo.toml", profile), join(directory, "Cargo.toml"));
    copyFileSync(new URL("Cargo.lock", profile), join(directory, "Cargo.lock"));
    mkdirSync(join(directory, "src"));
    writeFileSync(join(directory, "src/main.rs"), "fn main() {}\n");
    const reference = step.solution!;
    const cases = [
      { source: reference, passed: true },
      {
        source: reference.replace(
          "u16::from_be_bytes(header)",
          "((header[0] as u16) << 8) | header[1] as u16",
        ),
        passed: true,
      },
      {
        source: `use tokio::{io::{self, AsyncReadExt}, net::TcpStream, time::{Instant, timeout_at}};
#[derive(Debug)]
pub enum ReceiveError { Timeout, TooLarge, Io(io::Error) }
pub async fn receive_frame_or_discard(mut stream: TcpStream, limit: u16, deadline: Instant) -> Result<(TcpStream, Vec<u8>), ReceiveError> {
    let budget = deadline.saturating_duration_since(Instant::now());
    let mut header = [0; 2];
    timeout_at(deadline, stream.read_exact(&mut header)).await.map_err(|_| ReceiveError::Timeout)?.map_err(ReceiveError::Io)?;
    let length = u16::from_be_bytes(header);
    if length > limit { return Err(ReceiveError::TooLarge); }
    let mut body = vec![0; usize::from(length)];
    timeout_at(Instant::now() + budget, stream.read_exact(&mut body)).await.map_err(|_| ReceiveError::Timeout)?.map_err(ReceiveError::Io)?;
    Ok((stream, body))
}`,
        passed: false,
        marker: "WHOLE_FRAME_DEADLINE",
      },
      { source: step.code!, passed: false },
      {
        source: reference.replace(
          "u16::from_be_bytes(header)",
          "u16::from_le_bytes(header)",
        ),
        passed: false,
      },
      {
        source: reference.replace(
          "if length > limit",
          "if length > limit && false",
        ),
        passed: false,
      },
      {
        source: reference.replace(
          "Ok((stream, body))",
          "Ok((stream, Vec::new()))",
        ),
        passed: false,
      },
    ];
    for (const fixture of cases) {
      writeFileSync(
        join(directory, "src/lib.rs"),
        appendHiddenTests(fixture.source, step.evaluator.tests),
      );
      const compile = spawnSync(
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
          env: { ...process.env, CARGO_TARGET_DIR: join(directory, "target") },
        },
      );
      expect(compile.error).toBeUndefined();
      expect(compile.signal).toBeNull();
      expect(compile.status, compile.stdout + compile.stderr).toBe(0);
      const binary = cargoExecutable(
        compile.stdout,
        "rust_workshop_tokio_fixtures",
      );
      expect(binary).toBeDefined();
      expect(
        resolve(binary!).startsWith(resolve(directory, "target") + sep),
      ).toBe(true);
      const run = spawnSync(binary!, ["--test-threads=1"], {
        cwd: directory,
        encoding: "utf8",
        timeout: 8_000,
      });
      expect(run.error).toBeUndefined();
      expect(run.signal).toBeNull();
      const counts = testCounts(run.stdout);
      expect(counts).toBeDefined();
      expect(run.status, run.stdout + run.stderr).toBe(
        fixture.passed ? 0 : 101,
      );
      if (fixture.passed) {
        expect(counts!.passed).toBe(6);
        expect(counts!.failed).toBe(0);
      } else {
        expect(behavioralRejection(run)).toBe(true);
        if ("marker" in fixture)
          expect(run.stdout + run.stderr).toContain(fixture.marker);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 90_000);
