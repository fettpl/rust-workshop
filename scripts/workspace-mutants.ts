/** Negative controls for the fixed, repository-authored Frame Protocol workspace. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertFrameWorkspaceAuthoredLayout } from "./workspace-metadata";
import { assertExactFramePackageFiles } from "./workspace-package";

export function verifyFrameWorkspaceMutants(
  root: string,
  binary: string,
  prefix: string[],
): void {
  const libraryPath = join(root, "crates/frame-protocol/src/lib.rs");
  const rootManifestPath = join(root, "Cargo.toml");
  const libraryManifestPath = join(root, "crates/frame-protocol/Cargo.toml");
  const probePath = join(root, "crates/frame-probe/Cargo.toml");
  const probeMainPath = join(root, "crates/frame-probe/src/main.rs");
  const library = readFileSync(libraryPath, "utf8");
  const rootManifest = readFileSync(rootManifestPath, "utf8");
  const libraryManifest = readFileSync(libraryManifestPath, "utf8");
  const probe = readFileSync(probePath, "utf8");
  const probeMain = readFileSync(probeMainPath, "utf8");
  const extraPath = join(root, "crates/frame-protocol", "UNREVIEWED.md");

  function replace(source: string, before: string, after: string): string {
    assert.ok(source.includes(before), `Mutation target missing: ${before}`);
    return source.replace(before, after);
  }

  function run(args: string[]) {
    const result = spawnSync(
      binary,
      [...prefix, ...args, "--offline", "--locked"],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 3 * 1024 * 1024,
      },
    );
    assert.ifError(result.error);
    assert.notEqual(
      result.status,
      null,
      "A signal or watchdog is not a rejected mutant",
    );
    return { status: result.status, output: result.stdout + result.stderr };
  }

  const consumer = [
    "test",
    "-p",
    "frame-protocol",
    "--test",
    "public_consumer",
  ];
  const controls = [
    {
      name: "public representation invalidates the privacy doctest",
      before: "pub struct Frame {\n    payload: Vec<u8>,",
      after: "pub struct Frame {\n    pub payload: Vec<u8>,",
      args: ["test", "-p", "frame-protocol", "--doc"],
      rejectedBy: [
        /Test compiled successfully, but it.s marked `compile_fail`/,
        /src\/lib\.rs/,
      ],
    },
    {
      name: "exhaustive error enum invalidates the downstream wildcard doctest",
      before: "#[non_exhaustive]\n#[derive(Debug)]\npub enum FrameError",
      after: "#[derive(Debug)]\npub enum FrameError",
      args: ["test", "-p", "frame-protocol", "--doc"],
      rejectedBy: [
        /Test compiled successfully, but it.s marked `compile_fail`/,
        /src\/lib\.rs/,
      ],
    },
    {
      name: "exhaustive error code invalidates the downstream category doctest",
      before: "#[non_exhaustive]\n#[derive(Clone, Copy, Debug, Eq, PartialEq)]\npub enum FrameErrorCode",
      after: "#[derive(Clone, Copy, Debug, Eq, PartialEq)]\npub enum FrameErrorCode",
      args: ["test", "-p", "frame-protocol", "--doc"],
      rejectedBy: [
        /Test compiled successfully, but it.s marked `compile_fail`/,
        /src\/lib\.rs/,
      ],
    },
    {
      name: "new required method breaks an existing implementer",
      before: "pub trait FrameReader {",
      after: "pub trait FrameReader {\n    fn required_upgrade(&self);",
      args: [...consumer, "--no-run"],
      rejectedBy: [/error\[E0046\]/, /public_consumer\.rs/],
    },
    {
      name: "Sized supertrait breaks the old dyn consumer",
      before: "pub trait FrameReader {",
      after: "pub trait FrameReader: Sized {",
      args: [...consumer, "--no-run"],
      rejectedBy: [/error\[E0038\]/, /public_consumer\.rs/],
    },
    {
      name: "new Clone bound breaks the old extension consumer",
      before: "impl<T: FrameReader + ?Sized> FrameReaderExt for T {}",
      after: "impl<T: FrameReader + Clone + ?Sized> FrameReaderExt for T {}",
      args: [...consumer, "--no-run"],
      rejectedBy: [/error\[E0599\]/, /public_consumer\.rs/],
    },
    {
      name: "new Debug bound breaks the old extension consumer",
      before: "impl<T: FrameReader + ?Sized> FrameReaderExt for T {}",
      after: "impl<T: FrameReader + Debug + ?Sized> FrameReaderExt for T {}",
      args: [...consumer, "--no-run"],
      rejectedBy: [/error\[E0404\]|error\[E0277\]|error\[E0599\]/, /src\/lib\.rs/],
    },
    {
      name: "private legacy path breaks old imports",
      before: "pub mod legacy {",
      after: "mod legacy {",
      args: [...consumer, "--no-run"],
      rejectedBy: [/error\[E0603\]/, /public_consumer\.rs/],
    },
    {
      name: "discarded payload breaks old observable behavior",
      before: "Ok(Frame::from_validated(payload))",
      after: "Ok(Frame::from_validated(Vec::new()))",
      args: [
        ...consumer,
        "original_function_pointer_signature_and_behavior_remain_callable",
      ],
      rejectedBy: /test .*original_function_pointer_signature_and_behavior_remain_callable \.\.\. FAILED/,
    },
    {
      name: "flattened I/O cause loses the original marker",
      before: "Self::Io { operation, source }",
      after:
        'Self::Io { operation, source: io::Error::new(source.kind(), "flattened") }',
      args: [...consumer, "both_read_stages_preserve_the_original_owned_cause"],
      rejectedBy: /test .*both_read_stages_preserve_the_original_owned_cause \.\.\. FAILED/,
    },
    {
      name: "misclassified I/O error category breaks typed code contract",
      before: "Self::Io { .. } => FrameErrorCode::Io,",
      after: "Self::Io { .. } => FrameErrorCode::PayloadTooLarge,",
      args: [...consumer, "public_error_code_is_typed_and_keeps_the_original_source"],
      rejectedBy: /test .*public_error_code_is_typed_and_keeps_the_original_source \.\.\. FAILED/,
    },
    {
      name: "diagnostic wording mutation breaks exact diagnostics output",
      before: '"code=io"',
      after: '"code=transport"',
      args: [
        "test",
        "-p",
        "frame-probe",
        "--no-default-features",
        "--features",
        "diagnostics",
        "--test",
        "cli",
        "diagnostics_feature_changes_only_the_opt_in_process_output",
      ],
      rejectedBy: /test .*diagnostics_feature_changes_only_the_opt_in_process_output \.\.\. FAILED/,
    },
    {
      name: "Display-parsing diagnostic mutant fails after wording change",
      before: 'match error.code() {\n        FrameErrorCode::PayloadTooLarge => "code=payload-too-large".to_owned(),\n        FrameErrorCode::Io => "code=io".to_owned(),\n    }',
      after: 'match error.to_string().as_str() {\n        "wording changed" => "code=io".to_owned(),\n        _ => "code=payload-too-large".to_owned(),\n    }',
      args: [
        "test",
        "-p",
        "frame-protocol",
        "--no-default-features",
        "--features",
        "diagnostics",
        "--lib",
        "error_diagnostics_are_stable_machine_text",
      ],
      rejectedBy: /test .*error_diagnostics_are_stable_machine_text \.\.\. FAILED/,
    },
    {
      name: "checked writer must reject over-limit payload before I/O",
      before: "validate_payload_len(frame.len(), maximum)?;\n    write_frame(writer, frame)",
      after: "let _ = maximum;\n    write_frame(writer, frame)",
      args: [
        "test",
        "-p",
        "frame-protocol",
        "--lib",
        "checked_writer_rejects_before_output",
      ],
      rejectedBy: /test .*checked_writer_rejects_before_output \.\.\. FAILED/,
    },
    {
      name: "partial BrokenPipe writer retains its failure behavior",
      before: "writer\n        .write_all(&length.to_be_bytes())\n        .and_then(|()| writer.write_all(frame.payload()))",
      after: "writer.write(&length.to_be_bytes()).map(|_| ())",
      args: [
        "test",
        "-p",
        "frame-protocol",
        "--lib",
        "partial_writer_keeps_its_source_and_observable_prefix",
      ],
      rejectedBy: /test .*partial_writer_keeps_its_source_and_observable_prefix \.\.\. FAILED/,
    },
    {
      name: "exclusive size limit rejects the documented inclusive boundary",
      before: "if actual > usize::from(maximum) {",
      after: "if actual >= usize::from(maximum) {",
      args: [
        "test",
        "-p",
        "frame-protocol",
        "--lib",
        "opaque_constructor_accepts_empty_and_exact_u16_boundary",
      ],
      rejectedBy: /called `Result::unwrap\(\)` on an `Err` value/,
    },
  ];

  try {
    for (const control of controls) {
      writeFileSync(
        libraryPath,
        replace(library, control.before, control.after),
      );
      const result = run(control.args);
      assert.notEqual(result.status, 0, `Mutant survived: ${control.name}`);
      for (const pattern of Array.isArray(control.rejectedBy)
        ? control.rejectedBy
        : [control.rejectedBy])
        assert.match(result.output, pattern, `${control.name}\n${result.output}`);
      console.log(`ok rejected mutant: ${control.name}`);
      writeFileSync(libraryPath, library);
    }

    writeFileSync(
      probePath,
      probe,
    );
    writeFileSync(
      probeMainPath,
      replace(probeMain, '"frame-probe: payload={} bytes"', '"frame-probe: payload={} byte"'),
    );
    const defaultOutputDrift = run([
      "test",
      "-p",
      "frame-probe",
      "--no-default-features",
      "--test",
      "cli",
      "process_completes_with_a_finite_default_demo",
    ]);
    assert.notEqual(defaultOutputDrift.status, 0);
    assert.match(
      defaultOutputDrift.output,
      /test .*process_completes_with_a_finite_default_demo \.\.\. FAILED/,
    );
    console.log("ok rejected mutant: default client output drift breaks legacy process contract");
    writeFileSync(probePath, probe);
    writeFileSync(probeMainPath, probeMain);

    // A working unified workspace must not hide a feature dependency in the library.
    writeFileSync(
      probePath,
      replace(probe, "default = []", 'default = ["diagnostics"]'),
    );
    writeFileSync(
      libraryPath,
      replace(
        library,
        "validate_payload_len(payload.len(), u16::MAX)?;",
        "validate_payload_len(payload.len(), u16::MAX)?;\n        let _ = diagnostic_summary(&Self { payload: Vec::new() });",
      ),
    );
    const unified = run(["test", "--workspace"]);
    assert.equal(
      unified.status,
      0,
      `Feature-unified positive control failed\n${unified.output}`,
    );
    assert.match(unified.output, /test result: ok\. [1-9]\d* passed/);
    const isolated = run([
      "check",
      "-p",
      "frame-protocol",
      "--all-targets",
      "--no-default-features",
    ]);
    assert.notEqual(
      isolated.status,
      0,
      "Library-only check must reject the hidden feature dependency",
    );
    assert.match(isolated.output, /error\[E0425\]/);
    assert.match(isolated.output, /diagnostic_summary/);
    console.log(
      "ok rejected mutant: library-only build exposes dependency hidden by feature unification",
    );
    writeFileSync(libraryPath, library);
    writeFileSync(probePath, probe);
    writeFileSync(probeMainPath, probeMain);
    const clientFormat = run([
      "test",
      "-p",
      "frame-probe",
      "--no-default-features",
      "--features",
      "format",
      "--test",
      "cli",
      "format_feature_activates_library_serialize_consumer",
    ]);
    assert.equal(clientFormat.status, 0, clientFormat.output);
    assert.match(
      clientFormat.output,
      /test format_feature_activates_library_serialize_consumer \.\.\. ok/,
    );
    console.log("ok client-forwarded format executes the Serialize consumer");
    writeFileSync(
      probePath,
      replace(probe, 'format = ["frame-protocol/format"]', "format = []"),
    );
    const missingForward = run([
      "test",
      "-p",
      "frame-probe",
      "--no-default-features",
      "--features",
      "format",
      "--test",
      "cli",
      "format_feature_activates_library_serialize_consumer",
    ]);
    assert.notEqual(missingForward.status, 0);
    assert.match(missingForward.output, /frame-probe\/format|feature/);
    console.log("ok rejected mutant: client forwarding prevents format activation");
    writeFileSync(probePath, probe);

    writeFileSync(
      probePath,
      replace(
        probe,
        'diagnostics = ["frame-protocol/diagnostics"]',
        "diagnostics = []",
      ),
    );
    const missingDiagnosticsForward = run([
      "test",
      "-p",
      "frame-probe",
      "--no-default-features",
      "--features",
      "diagnostics",
      "--test",
      "cli",
      "diagnostics_feature_changes_only_the_opt_in_process_output",
    ]);
    assert.notEqual(missingDiagnosticsForward.status, 0);
    assert.match(missingDiagnosticsForward.output, /error\[E0432\]/);
    assert.match(missingDiagnosticsForward.output, /crates\/frame-probe\/src\/main\.rs/);
    console.log("ok rejected mutant: client diagnostics forwarding prevents typed diagnostics");
    writeFileSync(probePath, probe);

    writeFileSync(
      rootManifestPath,
      replace(rootManifest, 'version = "1.0.229"', 'version = "1.0.228"'),
    );
    assert.throws(
      () => assertFrameWorkspaceAuthoredLayout(root, [
        "crates/frame-protocol",
        "crates/frame-probe",
      ]),
      /pinned serde requirement/,
    );
    console.log("ok rejected mutant: root serde requirement drift");

    writeFileSync(
      rootManifestPath,
      rootManifest,
    );
    writeFileSync(
      libraryManifestPath,
      replace(
        libraryManifest,
        "serde = { workspace = true, optional = true }",
        "serde = { workspace = true }",
      ),
    );
    assert.throws(
      () => assertFrameWorkspaceAuthoredLayout(root, [
        "crates/frame-protocol",
        "crates/frame-probe",
      ]),
      /optional workspace dependency/,
    );
    console.log("ok rejected mutant: inherited serde loses optionality");

    writeFileSync(libraryManifestPath, libraryManifest);
    writeFileSync(
      probePath,
      replace(
        probe,
        'format = ["frame-protocol/format"]',
        "format = []",
      ),
    );
    assert.throws(
      () => assertFrameWorkspaceAuthoredLayout(root, [
        "crates/frame-protocol",
        "crates/frame-probe",
      ]),
      /format must forward/,
    );
    console.log("ok rejected mutant: client format forwarding drift");
    writeFileSync(probePath, probe);

    writeFileSync(extraPath, "unreviewed\n");
    const archive = run(["package", "-p", "frame-protocol", "--list"]);
    assert.equal(archive.status, 0, archive.output);
    const mutatedFiles = archive.output.trim().split("\n").filter(Boolean);
    assert.throws(
      () => assertExactFramePackageFiles(mutatedFiles),
      /package file list/,
    );
    console.log("ok rejected mutant: unreviewed package file crosses archive boundary");
    writeFileSync(rootManifestPath, rootManifest);
  } finally {
    writeFileSync(rootManifestPath, rootManifest);
    writeFileSync(libraryManifestPath, libraryManifest);
    writeFileSync(libraryPath, library);
    writeFileSync(probePath, probe);
    writeFileSync(probeMainPath, probeMain);
    rmSync(extraPath, { force: true });
  }
}
