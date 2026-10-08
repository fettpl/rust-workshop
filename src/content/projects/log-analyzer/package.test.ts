import { describe, expect, it } from "vitest";
import {
  projectFiles,
  validateProjectPackage,
} from "../../../domain/project-package";
import { logAnalyzerPackage } from "../log-analyzer";

describe("Log Analyzer performance archive contract", () => {
  it("keeps the existing package identity and archive gates", () => {
    expect(validateProjectPackage(logAnalyzerPackage)).toEqual([]);
    expect(logAnalyzerPackage.id).toBe("log-analyzer-workshop");
    expect(logAnalyzerPackage.files).toHaveLength(20);
    expect(logAnalyzerPackage.revealStepRefs.map((ref) => ref.stepId)).toEqual([
      "records-debug",
      "stream-debug",
      "report-blank",
    ]);
  });

  it("documents the problem-only Study Session brief without changing the reference archive", () => {
    const documentation = [
      logAnalyzerPackage.description,
      ...logAnalyzerPackage.instructions,
      projectFiles(logAnalyzerPackage, "starter")["README.md"],
    ].join("\n");
    expect(documentation).toContain("Twój program od zera");
    expect(documentation).toContain("name;minutes");
    expect(documentation).toContain("Basia;30");
    expect(documentation).toContain("Ada;5");
    expect(documentation).toContain("Basia; 15");
    expect(documentation).toContain("--min-total N");
    expect(documentation).toContain("exit 2");
    expect(documentation).toContain("exit 1");
    expect(documentation).toContain("UTF-8");
    expect(documentation).toMatch(/problem|zadani|własny|od zera/i);
    expect(logAnalyzerPackage.files).toHaveLength(20);
    expect(logAnalyzerPackage.revealStepRefs.map((ref) => ref.stepId)).toEqual([
      "records-debug",
      "stream-debug",
      "report-blank",
    ]);
  });

  it("ships a dev-only Criterion benchmark with deterministic result coverage", () => {
    const solution = projectFiles(logAnalyzerPackage, "solution");
    const manifest = solution["Cargo.toml"];
    const benchmark = solution["benches/log_analyzer.rs"];
    const contract = solution["tests/performance_contract.rs"];

    expect(manifest).toContain("[dev-dependencies]");
    expect(manifest).toContain(
      'criterion = { version = "=0.5.1", default-features = false }',
    );
    expect(manifest).not.toContain("[dependencies]\ncriterion");
    expect(manifest).toContain('name = "log_analyzer"\nharness = false');
    expect(manifest).toContain('rust-version = "1.85.0"');
    expect(benchmark).toContain("criterion_group!");
    expect(benchmark).toContain("criterion_main!");
    expect(benchmark).toContain("black_box");
    expect(benchmark).toContain("baseline");
    expect(benchmark).toContain("candidate");
    expect(benchmark).toContain("setup");
    expect(benchmark).toContain("teardown");
    expect(benchmark).toContain("iter_batched_ref");
    expect(benchmark).toContain("borrowed input");
    expect(contract).toContain(
      "baseline_and_candidate_have_the_same_result_shape",
    );
    expect(contract).toContain("small_valid");
    expect(contract).toContain("mixed_malformed");

    const sourceModel = solution["tests/source_model_contract.rs"];
    expect(sourceModel).toContain(
      "fixed_workload_matches_explicit_source_model_without_runtime_counter",
    );
    expect(sourceModel).toContain(
      "no runtime allocator is observed here",
    );
    expect(sourceModel).toContain("source_model_buffer_capacity_bytes: MAX_LINE_BYTES");
    expect(sourceModel).toContain("source_model_retained_record_bytes: 0");
    const profileManifest = solution["PROFILE-MANIFEST.json"];
    expect(profileManifest).toContain('"rust-workshop.profile.v1"');
    expect(profileManifest).toContain(
      '"status": "unverified-source-assumption"',
    );
    expect(profileManifest).toContain(
      '"source_model_buffer_capacity_bytes": 4096',
    );
    expect(profileManifest).toContain(
      '"source_model_retained_record_bytes": 0',
    );
    expect(profileManifest).toContain('"runtime_observed": false');
    expect(profileManifest).toContain('"verification_status": "open"');
    expect(profileManifest).toContain('"kind": "whole-test-process"');
    expect(profileManifest).toContain('"attributes_parser_exclusively": false');
    expect(profileManifest).toContain('"summary equality only"');
    const performance = solution["PERFORMANCE.md"];
    expect(performance).toContain("actual parser allocation");
    expect(performance).toContain("verification remains open");
    expect(performance).toMatch(/profiles\s+the whole Rust\s+test process/);
    expect(performance).toContain("cannot be attributed exclusively");
    expect(performance).toContain("not a baseline/candidate allocation comparison");
  });

  it("ships the portable allocation counter and separate-process probe contract", () => {
    const solution = projectFiles(logAnalyzerPackage, "solution");
    expect(solution["examples/allocation_probe.rs"]).toContain("analyze_reader");
    expect(solution["examples/allocation_probe.rs"]).toContain("Mode::Mutant");
    expect(solution["examples/allocation_probe.rs"]).toContain("snapshot()");
    expect(solution["examples/support/allocation_counter.rs"]).toContain("unsafe impl GlobalAlloc");
    expect(solution["examples/support/allocation_counter.rs"]).toContain("alloc_zeroed");
    expect(solution["examples/support/allocation_counter.rs"]).toContain("realloc");
    expect(solution["tests/allocation_counter_contract.rs"]).toContain("counts_all_global_allocator_operations");
    expect(JSON.parse(solution["ALLOCATION-MANIFEST.json"]).workloads).toEqual([
      "empty", "valid-512", "repeated", "malformed", "crlf-boundary",
      "line-4096", "line-4097", "reader-error",
    ]);
    expect(solution["ALLOCATION-EVIDENCE.md"]).toContain("RSS");
    expect(solution["ALLOCATION-EVIDENCE.md"]).toContain("Summary");
  });
});
