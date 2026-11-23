# Performance investigation

[Polski](performance-investigation.pl.md)

The optional `performance-evidence-investigation` lesson follows the four
existing Performance Evidence lessons. It uses the existing concept and
competency without adding a gate, task family, review fixture, or primary
coding credit. Six steps ask for a prediction, a tool choice, inspection of a
reference and static model, an independent packet, and same-session recall.
The lesson does not run Cargo or print measured benchmark results.

## Downloaded project

The Log Analyzer starter and solution archives include an unfilled Polish
`A7-INVESTIGATION.md`, a six-record replay, a content-only manifest, and fixed
maintainer fixtures. The worksheet asks for a different workload and
selectivity, a falsifiable hypothesis, an independent oracle, a counterexample,
alternatives, a response to review, and a scoped decision. The learner chooses
an implementation and runs personal experiments in their own environment.
The app does not execute the worksheet or downloaded project locally, grade a
whole architecture, or turn a completed form into independent evidence.

The repository-authored reference workload has 2,048 records. Literal expected
counts are INFO 1,171, WARN 588, ERROR 196, and malformed 93; the ERROR filter
retains 196 errors and the 93 malformed records. The replay separates a missing
filter from malformed-line handling. Both implementations are checked against
independent literal expectations before maintainer timing.

## Maintainer verification

The reference API is [Criterion 0.5.1](https://docs.rs/criterion/0.5.1/criterion/).
Its locked version and saved-data shape are part of the maintainer contract.

After preparing the locked Criterion 0.5.1 dependency cache with the existing
performance verifier, run:

```sh
npm run content:performance -- --a7
npm run content:performance -- --a7 --msrv
```

The second command requires installed exact Rust 1.85.0. These closed modes
accept no source, path, dependency, output, or arbitrary toolchain overrides.
They use only the maintained Log Analyzer solution package, offline and locked.
The original `--fetch` and `--msrv` modes retain their existing meaning; a fetch
prepares dependencies and is not itself behavioral evidence.

Closed A7 modes construct an explicit child environment. They omit inherited
compiler flags, wrappers, configuration and target overrides, then bind their
own installed tools and fresh output directories. `HOME` keeps its real value;
`CARGO_HOME` and `RUSTUP_HOME` select existing canonical local roots, defaulting
to their usual directories below `HOME`. Cargo configuration must be absent or
contain only the fixed offline setting; additional ancestor configuration is
rejected. Reports identify the resolved rustup and compiler executables,
configuration hashes, accepted roots and omitted override names. This records
which local tools ran; it does not authenticate their publisher. No toolchain
or dependency is installed by these modes.

Each run owns a fresh Criterion output directory and retains raw command output,
archive/source hashes, toolchain identity, and the two exact benchmark IDs:

- `log_analyzer_a7/baseline/filtered-mixed-2048-v1`
- `log_analyzer_a7/candidate/filtered-mixed-2048-v1`

Criterion uses 30 samples, one second of warm-up, three seconds of measurement,
byte-throughput metadata, and `iter_batched_ref`. These are technical benchmark
parameters. Setup and drops stay outside the measured closure; parser execution
and batched output collection are measured. Comparison uses mean nanoseconds
per iteration and 95% confidence intervals, with three possible results:

| Observation                                      | Interpretation                   |
| ------------------------------------------------ | -------------------------------- |
| Candidate upper bound below baseline lower bound | Measured faster on this workload |
| Candidate lower bound above baseline upper bound | Measured slower on this workload |
| Overlapping or touching intervals                | Inconclusive                     |

A speedup is not required for valid technical qualification. A `keep` decision
requires accepted correctness, a complete fresh measurement, the expected
negative-control rejection, and strictly separated faster intervals. Slower
results call for investigation; overlap remains inconclusive. None establishes
performance on another workload, machine, compiler, or implementation.

The ignored filter mutant calls production `analyze_reader` with `None` on the
fixed replay. Only compilation exit 0 followed by exit 101 from the named
`a7_filter_ignored_v1_named_oracle` test, its marker, and intended summary
assertion mismatch establishes `expected-rejection`. An arbitrary nonzero exit,
missing tool, timeout, or signal cannot establish that result.

External `rust-workshop.a7-performance.v2` reports distinguish completeness,
feature correctness, comparison, decision, and mutant status. Raw artifacts
are retained under a unique `test-results/performance-a7/` run namespace; the
content manifest and empty worksheet contain no claimed observations. Private
maintainer admission receipts and Git history are not public CLI prerequisites.
