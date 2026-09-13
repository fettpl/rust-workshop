/** Negative controls for the fixed, repository-authored Frame Protocol workspace. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function verifyFrameWorkspaceMutants(
  root: string,
  binary: string,
  prefix: string[],
): void {
  const libraryPath = join(root, "crates/frame-protocol/src/lib.rs");
  const probePath = join(root, "crates/frame-probe/Cargo.toml");
  const library = readFileSync(libraryPath, "utf8");
  const probe = readFileSync(probePath, "utf8");

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
      rejectedBy: /Test compiled successfully, but it.s marked `compile_fail`/,
    },
    {
      name: "exhaustive error enum invalidates the downstream wildcard doctest",
      before: "#[non_exhaustive]\n#[derive(Debug)]\npub enum FrameError",
      after: "#[derive(Debug)]\npub enum FrameError",
      args: ["test", "-p", "frame-protocol", "--doc"],
      rejectedBy: /Test compiled successfully, but it.s marked `compile_fail`/,
    },
    {
      name: "new required method breaks an existing implementer",
      before: "pub trait FrameReader {",
      after: "pub trait FrameReader {\n    fn required_upgrade(&self);",
      args: [...consumer, "--no-run"],
      rejectedBy: /error\[E0046\]/,
    },
    {
      name: "Sized supertrait breaks the old dyn consumer",
      before: "pub trait FrameReader {",
      after: "pub trait FrameReader: Sized {",
      args: [...consumer, "--no-run"],
      rejectedBy: /error\[E0038\]/,
    },
    {
      name: "new Clone bound breaks the old extension consumer",
      before: "impl<T: FrameReader + ?Sized> FrameReaderExt for T {}",
      after: "impl<T: FrameReader + Clone + ?Sized> FrameReaderExt for T {}",
      args: [...consumer, "--no-run"],
      rejectedBy: /error\[E0599\]/,
    },
    {
      name: "private legacy path breaks old imports",
      before: "pub mod legacy {",
      after: "mod legacy {",
      args: [...consumer, "--no-run"],
      rejectedBy: /error\[E0603\]/,
    },
    {
      name: "discarded payload breaks old observable behavior",
      before: "Ok(Frame::from_validated(payload))",
      after: "Ok(Frame::from_validated(Vec::new()))",
      args: [
        ...consumer,
        "original_function_pointer_signature_and_behavior_remain_callable",
      ],
      rejectedBy: /assertion .* failed/,
    },
    {
      name: "flattened I/O cause loses the original marker",
      before: "Self::Io { operation, source }",
      after:
        'Self::Io { operation, source: io::Error::new(source.kind(), "flattened") }',
      args: [...consumer, "preserve"],
      rejectedBy: /called `Option::unwrap\(\)` on a `None` value/,
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
      assert.match(
        result.output,
        control.rejectedBy,
        `${control.name}\n${result.output}`,
      );
      console.log(`ok rejected mutant: ${control.name}`);
      writeFileSync(libraryPath, library);
    }

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
  } finally {
    writeFileSync(libraryPath, library);
    writeFileSync(probePath, probe);
  }
}
