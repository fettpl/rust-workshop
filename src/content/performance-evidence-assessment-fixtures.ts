import { performancePracticeFixtures } from "./performance-recovery-fixtures";
import {
  performanceEvidenceLessons,
  performanceEvidenceReviewExercises,
} from "./performance-evidence";

export interface PerformanceEvidenceFixture {
  id: string;
  equivalent: string;
  mutant: string;
}

const equivalents: Record<string, string> = {
  "workload-gate": `#[derive(Debug, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }
fn inspect_workload(items: &[u8]) -> WorkloadEvidence {
    let accepted = items.iter().filter(|item| item.is_ascii_lowercase()).count();
    WorkloadEvidence { visited: items.len(), accepted, rejected: items.len() - accepted }
}`,
  "workload-budget-gate": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Budget { max_visits: usize, max_rejections: usize }
fn fits_budget(evidence: WorkloadEvidence, budget: Budget) -> bool {
    match evidence { WorkloadEvidence { visited, rejected, .. } => visited <= budget.max_visits && rejected <= budget.max_rejections }
}`,
  "borrow-gate": `fn first_field<'a>(line: &'a str) -> Option<&'a str> {
    let (_, remainder) = line.split_once('|')?;
    Some(remainder)
}`,
  "borrow-stream-gate": `fn matching_views<'a>(lines: &'a [&'a str], prefix: &str) -> Vec<&'a str> {
    lines.iter().copied().filter_map(|line| line.strip_prefix(prefix).map(|_| line)).collect()
}`,
  "buffer-gate": `use std::io::{self, BufRead};
fn count_lines<R: BufRead>(mut reader: R, scratch: &mut String) -> io::Result<usize> {
    let mut count = 0;
    loop {
        scratch.clear();
        match reader.read_line(scratch)? {
            0 => break,
            _ => count += 1,
        }
    }
    Ok(count)
}`,
  "buffer-capacity-gate": `fn within_capacity(scratch: &String, limit: usize) -> bool {
    scratch.capacity().le(&limit)
}`,
  "decision-gate": `#[derive(Debug, PartialEq, Eq)]
enum Decision { Keep, Investigate(&'static str) }
fn decide(baseline: usize, candidate: usize, budget: usize) -> Decision {
    match (candidate <= budget, candidate <= baseline) {
        (true, true) => Decision::Keep,
        (false, _) => Decision::Investigate("budget"),
        (true, false) => Decision::Investigate("regression"),
    }
}`,
  "decision-evidence-gate": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { baseline: usize, candidate: usize, budget: usize }
fn explain(evidence: Evidence) -> &'static str {
    match (evidence.candidate <= evidence.budget, evidence.candidate <= evidence.baseline) {
        (true, true) => "keep",
        _ => "investigate",
    }
}`,
};

const mutants: Record<string, string> = {
  "workload-gate": `#[derive(Debug, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }
fn inspect_workload(items: &[u8]) -> WorkloadEvidence {
    let accepted = items.iter().filter(|item| item.is_ascii_alphanumeric()).count();
    WorkloadEvidence { visited: items.len(), accepted, rejected: items.len() - accepted }
}`,
  "workload-budget-gate": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WorkloadEvidence { visited: usize, accepted: usize, rejected: usize }
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Budget { max_visits: usize, max_rejections: usize }
fn fits_budget(evidence: WorkloadEvidence, budget: Budget) -> bool {
    evidence.visited < budget.max_visits && evidence.rejected < budget.max_rejections
}`,
  "borrow-gate": `fn first_field<'a>(line: &'a str) -> Option<&'a str> {
    line.split_once('|').map(|(field, _)| field)
}`,
  "borrow-stream-gate": `fn matching_views<'a>(lines: &'a [&'a str], prefix: &str) -> Vec<&'a str> {
    lines.iter().copied().filter(|line| line.ends_with(prefix)).collect()
}`,
  "buffer-gate": `use std::io::{self, BufRead};
fn count_lines<R: BufRead>(mut reader: R, scratch: &mut String) -> io::Result<usize> {
    let mut own = String::new();
    let mut count = 0;
    loop {
        scratch.clear();
        if reader.read_line(&mut own)? == 0 { break; }
        own.clear();
        count += 1;
    }
    Ok(count)
}`,
  "buffer-capacity-gate": `fn within_capacity(scratch: &String, limit: usize) -> bool {
    scratch.len() <= limit
}`,
  "decision-gate": `#[derive(Debug, PartialEq, Eq)]
enum Decision { Keep, Investigate(&'static str) }
fn decide(baseline: usize, candidate: usize, budget: usize) -> Decision {
    if candidate < budget && candidate < baseline { Decision::Keep }
    else { Decision::Investigate("regression") }
}`,
  "decision-evidence-gate": `#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Evidence { baseline: usize, candidate: usize, budget: usize }
fn explain(evidence: Evidence) -> &'static str {
    if evidence.candidate <= evidence.baseline { "keep" } else { "investigate" }
}`,
};

const assessments = [
  ...performanceEvidenceLessons.flatMap((lesson) =>
    lesson.steps.filter((step) => step.evaluator?.kind === "tests"),
  ),
  ...Object.values(performanceEvidenceReviewExercises),
];

export const performanceEvidenceAssessmentFixtures: PerformanceEvidenceFixture[] =
  assessments.map((step) => {
    const transfer = performancePracticeFixtures.find((fixture) => fixture.id === step.id);
    if (transfer) return transfer;
    const sourceKey = step.id.includes("workload")
      ? step.id.includes("budget") ||
        step.id === "workload-recall" ||
        step.id === "review-performance-workload"
        ? "workload-budget-gate"
        : "workload-gate"
      : step.id.includes("borrow")
        ? step.id === "borrow-gate" || step.id === "borrow-recall"
          ? "borrow-gate"
          : "borrow-stream-gate"
        : step.id.includes("buffer")
          ? step.id.includes("capacity") || step.id === "buffer-recall"
            ? "buffer-capacity-gate"
            : "buffer-gate"
          : step.id === "review-performance-decision" ||
              step.id === "decision-gate" ||
              step.id === "decision-blank"
            ? "decision-gate"
            : step.id.includes("evidence") || step.id === "decision-recall"
              ? "decision-evidence-gate"
              : "decision-gate";
    return {
      id: step.id,
      equivalent: equivalents[sourceKey] ?? equivalents["workload-gate"],
      mutant: mutants[sourceKey] ?? mutants["workload-gate"],
    };
  });
