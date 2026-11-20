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
    expect(logAnalyzerPackage.files).toHaveLength(26);
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
    expect(logAnalyzerPackage.files).toHaveLength(26);
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
    expect(sourceModel).toContain("no runtime allocator is observed here");
    expect(sourceModel).toContain(
      "source_model_buffer_capacity_bytes: MAX_LINE_BYTES",
    );
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
    expect(performance).toContain(
      "not a baseline/candidate allocation comparison",
    );
  });

  it("ships the portable allocation counter and separate-process probe contract", () => {
    const solution = projectFiles(logAnalyzerPackage, "solution");
    expect(solution["examples/allocation_probe.rs"]).toContain(
      "analyze_reader",
    );
    expect(solution["examples/allocation_probe.rs"]).toContain("Mode::Mutant");
    expect(solution["examples/allocation_probe.rs"]).toContain("snapshot()");
    expect(solution["examples/support/allocation_counter.rs"]).toContain(
      "unsafe impl GlobalAlloc",
    );
    expect(solution["examples/support/allocation_counter.rs"]).toContain(
      "alloc_zeroed",
    );
    expect(solution["examples/support/allocation_counter.rs"]).toContain(
      "realloc",
    );
    expect(solution["tests/allocation_counter_contract.rs"]).toContain(
      "counts_all_global_allocator_operations",
    );
    expect(JSON.parse(solution["ALLOCATION-MANIFEST.json"]).workloads).toEqual([
      "empty",
      "valid-512",
      "repeated",
      "malformed",
      "crlf-boundary",
      "line-4096",
      "line-4097",
      "reader-error",
    ]);
    expect(solution["ALLOCATION-EVIDENCE.md"]).toContain("RSS");
    expect(solution["ALLOCATION-EVIDENCE.md"]).toContain("Summary");
  });

  it("ships the exact closed A7 archive extension without changing the Cargo graph", () => {
    const solution = projectFiles(logAnalyzerPackage, "solution");
    const expectedPaths = [
      "Cargo.toml",
      "Cargo.lock",
      "src/lib.rs",
      "src/analyzer.rs",
      "src/main.rs",
      "tests/integration.rs",
      "tests/process.rs",
      "benches/log_analyzer.rs",
      "tests/performance_contract.rs",
      "tests/source_model_contract.rs",
      "PROFILE-MANIFEST.json",
      "PERFORMANCE.md",
      "examples/allocation_probe.rs",
      "examples/support/allocation_counter.rs",
      "tests/allocation_counter_contract.rs",
      "ALLOCATION-MANIFEST.json",
      "ALLOCATION-EVIDENCE.md",
      "fixtures/mixed.log",
      "README.md",
      ".gitignore",
      "tests/support/a7_filtered_mixed_2048.rs",
      "tests/a7_performance_contract.rs",
      "tests/a7_filter_ignored_mutant.rs",
      "A7-PERFORMANCE-MANIFEST.json",
      "A7-REPLAY.md",
      "A7-INVESTIGATION.md",
    ];
    expect(Object.keys(solution).sort()).toEqual([...expectedPaths].sort());
    expect(logAnalyzerPackage.files).toHaveLength(26);
    expect(solution["Cargo.toml"]).toBe(
      projectFiles(logAnalyzerPackage, "starter")["Cargo.toml"],
    );
    expect(solution["Cargo.lock"]).toBe(
      projectFiles(logAnalyzerPackage, "starter")["Cargo.lock"],
    );
    expect(solution["benches/log_analyzer.rs"].replace(/\s+/g, " ")).toContain(
      '#[path = "../tests/support/a7_filtered_mixed_2048.rs"] mod a7_fixture;',
    );
    for (const path of [
      "tests/a7_performance_contract.rs",
      "tests/a7_filter_ignored_mutant.rs",
    ]) {
      expect(solution[path].replace(/\s+/g, " ")).toContain(
        '#[path = "support/a7_filtered_mixed_2048.rs"] mod a7_fixture;',
      );
    }
  });

  it("pins the independent A7 fixture, literal oracle, replay, and mutant contract", () => {
    const solution = projectFiles(logAnalyzerPackage, "solution");
    const fixture = solution["tests/support/a7_filtered_mixed_2048.rs"];
    const contract = solution["tests/a7_performance_contract.rs"];
    const mutant = solution["tests/a7_filter_ignored_mutant.rs"];
    const replay = solution["A7-REPLAY.md"];
    const investigation = solution["A7-INVESTIGATION.md"];
    expect(fixture).toContain('"filtered-mixed-2048-v1"');
    expect(fixture).toContain("for i in 0..2048");
    expect(fixture).toContain("i % 37 == 0");
    expect(fixture).toContain("i % 53 == 0");
    expect(fixture).toContain("i % 10 == 0");
    expect(fixture).toContain("i % 29 == 0");
    expect(fixture).toContain("0xff");
    expect(contract).toContain("literal_2048_oracle");
    expect(contract).toContain("literal_replay_oracle");
    for (const literal of ["1171", "588", "196", "93", "56", "37", "68"])
      expect(contract).toContain(literal);
    for (const literal of [
      "7 INFO ignored-info",
      "8 WARN ignored-warn",
      "9 ERROR kept-one",
      "11 DEBUG malformed",
    ])
      expect(contract).toContain(literal);
    expect(contract).toContain("filtered_summary_is_literal_and_independent");
    expect(replay).toContain("{info: 0, warn: 0, error: 2, malformed: 2}");
    expect(replay).toContain("{info: 1, warn: 1, error: 2, malformed: 2}");
    expect(mutant).toContain("a7_filter_ignored_v1_named_oracle");
    expect(mutant).toContain("A7_FILTER_IGNORED_ORACLE");
    expect(mutant).toContain("analyze_reader(Cursor::new(replay), None)");
    expect(mutant).toContain("#[ignore]");
    expect(investigation).toContain("hipoteza");
    expect(investigation).toContain("alternatyw");
    expect(investigation).toContain("kontrprzykład");
    expect(investigation).not.toMatch(
      /cargo bench|criterion|pomiar|wyników pomiar/i,
    );
  });

  it("retains the legacy benchmark and adds the exact bounded A7 Criterion group", () => {
    const benchmark = projectFiles(logAnalyzerPackage, "solution")[
      "benches/log_analyzer.rs"
    ];
    expect(benchmark).toContain('benchmark_group("log_analyzer")');
    expect(benchmark.replace(/\s+/g, "")).toContain(
      "criterion_group!(benches,benchmark_analyzer",
    );
    expect(benchmark).toContain('benchmark_group("log_analyzer_a7")');
    expect(benchmark).toContain(
      'BenchmarkId::new("baseline", "filtered-mixed-2048-v1")',
    );
    expect(benchmark).toContain(
      'BenchmarkId::new("candidate", "filtered-mixed-2048-v1")',
    );
    expect(benchmark).toContain("sample_size(30)");
    expect(benchmark).toContain("warm_up_time(Duration::from_secs(1))");
    expect(benchmark).toContain("measurement_time(Duration::from_secs(3))");
    expect(benchmark).toContain("Throughput::Bytes(input.len() as u64)");
    expect(benchmark).toContain("iter_batched_ref");
    expect(benchmark).toContain("a7_literal_summary");
    expect(benchmark).toContain("Some(Level::Error)");
  });

  it("times the approved Error-filtered A7 workload in both closures", () => {
    const benchmark = projectFiles(logAnalyzerPackage, "solution")[
      "benches/log_analyzer.rs"
    ];
    const a7Start = benchmark.indexOf("fn benchmark_a7");
    const a7End = benchmark.indexOf("    group.finish();", a7Start);
    expect(a7Start).toBeGreaterThanOrEqual(0);
    expect(a7End).toBeGreaterThan(a7Start);
    const timedA7 = benchmark.slice(a7Start, a7End);

    expect(timedA7).toContain(
      "|reader| black_box(baseline(reader, Some(Level::Error)))",
    );
    expect(timedA7).toContain(
      "|reader| black_box(candidate(reader, Some(Level::Error)))",
    );
  });
});
