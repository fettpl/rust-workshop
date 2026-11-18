/** Fixed, repository-authored Rust probes for the reviewed assessment boundaries. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate } from "../engine/evaluate";
import { appendHiddenTests } from "../runner";
import { closuresLessons } from "./closures";
import { threadsLessons } from "./threads";
import { memoryOrderingLessons } from "./memory-ordering";
import { propertyFoundationLessons } from "./property-foundations";
import { propertyFoundationAssessmentFixtures } from "./property-foundation-assessment-fixtures";

const steps = [
  closuresLessons,
  threadsLessons,
  memoryOrderingLessons,
  propertyFoundationLessons,
].flatMap((lessons) => lessons.flatMap((lesson) => lesson.steps));
function assessment(id: string) {
  const step = steps.find((candidate) => candidate.id === id);
  if (!step?.solution || step.evaluator?.kind !== "tests")
    throw new Error(`Missing authored assessment ${id}`);
  return { solution: step.solution, evaluator: step.evaluator };
}
const clearingRecorder = `fn record_lengths<'a>(items: &'a [&'a str], offset: usize, output: &mut Vec<usize>) {
    output.clear();
    output.extend(items.iter().map(|item| item.len() + offset));
}`;
const singleSelectionCase = `fn assert_selection_property(candidate: fn(&[&str], &str, usize) -> Vec<(usize, String, bool)>) {
    assert_eq!(candidate(&["Rust", "Rust"], "Rust", 0), vec![(0, "Rust".to_owned(), true), (1, "Rust".to_owned(), true)]);
}`;
const singleMalformedCase = `fn assert_log_summary_property(candidate: fn(&[&str], Option<&str>) -> (usize, usize, usize, usize)) {
    assert_eq!(candidate(&["bad INFO broken"], Some("ERROR")), (0, 0, 0, 1));
}`;
const existenceOnlyEvidence = `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Observation { Published(usize), NotReady, Inconsistent }
pub fn assert_model_evidence(observations: &[Observation], expected_payload: usize) {
    assert!(observations.iter().any(|item| *item == Observation::Published(expected_payload)));
}`;
const alternateRecorder = `fn record_lengths<'a>(items: &'a [&'a str], offset: usize, output: &mut Vec<usize>) {
    output.extend(items.iter().map(|text| text.len() + offset));
}`;
const alternateEvidence = `#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Observation { Published(usize), NotReady, Inconsistent }
pub fn assert_model_evidence(observations: &[Observation], expected_payload: usize) {
    let mut published = false;
    for observation in observations {
        match observation {
            Observation::Published(value) => { assert_eq!(*value, expected_payload); published = true; },
            Observation::NotReady => {},
            Observation::Inconsistent => panic!("inconsistent"),
        }
    }
    assert!(published);
}`;
const alternateJoin = `use std::thread;
fn run_jobs(jobs: Vec<(u32, Box<dyn FnOnce(u32, thread::ThreadId) -> u32 + Send>)>) -> (u32, Vec<thread::ThreadId>) {
    let mut result = (0, Vec::new());
    let mut panic = None;
    for (value, callback) in jobs {
        let handle = thread::spawn(move || {
            let id = thread::current().id();
            (callback(value, id), id)
        });
        match handle.join() {
            Ok((value, id)) => { result.0 += value; result.1.push(id); },
            Err(payload) => { if panic.is_none() { panic = Some(payload); } },
        }
    }
    if let Some(payload) = panic { std::panic::resume_unwind(payload); }
    result
}`;

const alternateJoinAll = `use std::thread;
fn join_all_jobs(jobs: Vec<(u32, Box<dyn FnOnce(u32, thread::ThreadId) -> Result<u32, &'static str> + Send>)>) -> (u32, Vec<thread::ThreadId>, usize) {
    let handles: Vec<_> = jobs.into_iter().map(|(value, worker)| {
        let handle = thread::spawn(move || worker(value, thread::current().id()));
        (handle.thread().id(), handle)
    }).collect();
    handles.into_iter().fold((0, Vec::new(), 0), |(mut total, mut ids, mut failures), (id, handle)| {
        ids.push(id);
        match handle.join() {
            Ok(Ok(value)) => total += value,
            _ => failures += 1,
        }
        (total, ids, failures)
    })
}`;

const probes = [
  {
    id: "capture-gate",
    equivalent: alternateRecorder,
    bad: [["clears previous output", clearingRecorder]],
  },
  {
    id: "join-report-blank",
    equivalent: alternateJoin,
    bad: [
      [
        "reverses input IDs",
        assessment("join-report-blank").solution.replace(
          "    (total, ids)",
          "    ids.reverse();\n    (total, ids)",
        ),
      ],
      [
        "propagates before later joins",
        assessment("join-report-blank").solution.replace(
          "let outcomes: Vec<_> = handles.into_iter().map(|handle| handle.join()).collect();",
          "let outcomes = handles.into_iter().map(|handle| handle.join());",
        ),
      ],
    ],
  },
  {
    id: "join-all-gate",
    equivalent: alternateJoinAll,
    bad: [
      [
        "reverses input IDs",
        assessment("join-all-gate").solution.replace(
          "    (total, ids, failures)",
          "    ids.reverse();\n    (total, ids, failures)",
        ),
      ],
    ],
  },
  {
    id: "loom-evidence-assertions-gate",
    equivalent: alternateEvidence,
    bad: [["accepts contradictory publication", existenceOnlyEvidence]],
  },
  ...["property-invariants-gate", "property-generated-inputs-gate"].map(
    (id) => ({
      id,
      equivalent: propertyFoundationAssessmentFixtures.find(
        (fixture) => fixture.id === id,
      )!.equivalent,
      bad: [
        [
          "checks just one case",
          id === "property-invariants-gate"
            ? singleSelectionCase
            : singleMalformedCase,
        ],
      ],
    }),
  ),
];

function runAuthoredProbe(id: string, source: string, shouldPass: boolean) {
  const { evaluator } = assessment(id);
  const directory = mkdtempSync(join(tmpdir(), "assessment-boundary-"));
  try {
    const file = join(directory, "probe.rs");
    const binary = join(directory, "probe");
    writeFileSync(file, appendHiddenTests(source, evaluator.tests));
    const compiled = spawnSync(
      "rustc",
      ["--edition=2024", "--test", file, "-o", binary],
      { cwd: directory, encoding: "utf8", timeout: 60_000 },
    );
    expect(compiled.error, compiled.stderr).toBeUndefined();
    expect(compiled.signal, compiled.stderr).toBeNull();
    expect(compiled.status, compiled.stderr).toBe(0);
    const run = spawnSync(binary, ["--test-threads=1"], {
      cwd: directory,
      encoding: "utf8",
      timeout: 8_000,
    });
    const output = run.stdout + run.stderr;
    expect(run.error, output).toBeUndefined();
    expect(run.signal, output).toBeNull();
    expect(run.status, output).toBe(shouldPass ? 0 : 101);
    const counts = output.match(
      /test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed;/,
    );
    expect(counts, output).not.toBeNull();
    expect(
      evaluate(evaluator, {
        code: source,
        result: {
          status: run.status === 0 ? "success" : "test-failure",
          stdout: run.stdout,
          stderr: run.stderr,
          diagnostics: [],
          durationMs: 0,
          tests: { passed: Number(counts![1]), failed: Number(counts![2]) },
        },
      }).passed,
    ).toBe(shouldPass);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("reviewed assessment false positives", () => {
  for (const probe of probes) {
    it(`${probe.id} accepts the canonical and another valid implementation`, () => {
      runAuthoredProbe(probe.id, assessment(probe.id).solution, true);
      runAuthoredProbe(probe.id, probe.equivalent, true);
    }, 120_000);
    for (const [description, source] of probe.bad) {
      it(`${probe.id} rejects a compiling implementation that ${description}`, () => {
        runAuthoredProbe(probe.id, source, false);
      }, 120_000);
    }
  }
});
