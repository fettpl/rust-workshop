import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { appendHiddenTests } from "../runner";
import {
  slotLazyInitEquivalent,
  slotLazyInitFamily,
  slotLazyInitMutant,
  slotLazyInitModel,
  slotLazyInitPrimaryStepId,
  slotLazyInitSafeOption,
  slotLazyInitSolution,
  slotLazyInitStarter,
  slotLazyInitSteps,
  slotLazyInitTests,
} from "./unsafe-miri-slot-lazy-init";

const rustc = process.env.RUSTC_FOR_SLOT_LAZY_INIT_TESTS ?? "rustc";

type RustRun = ReturnType<typeof spawnSync> & {
  stdout: string;
  stderr: string;
};

const compile = (
  source: string,
  directory: string,
  test = true,
  extraArgs: string[] = [],
): RustRun => {
  const file = join(directory, "fixture.rs");
  const binary = join(directory, "fixture");
  writeFileSync(file, source);
  return spawnSync(
    rustc,
    [
      "--edition=2024",
      ...(test ? ["--test"] : []),
      ...extraArgs,
      file,
      "-o",
      binary,
    ],
    { cwd: directory, encoding: "utf8", timeout: 60_000 },
  ) as RustRun;
};

const run = (directory: string, args: string[] = []): RustRun =>
  spawnSync(join(directory, "fixture"), args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
  }) as RustRun;

const outputOf = (result: RustRun) => `${result.stdout}\n${result.stderr}`;

const compileAndRun = (source: string, expectedTests: number) => {
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-slot-lazy-init-"));
  try {
    const compiled = compile(
      appendHiddenTests(source, slotLazyInitTests),
      directory,
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = run(directory, ["--test-threads=1"]);
    const output = outputOf(executed);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, output).toBe(0);
    expect(output).toContain(`running ${expectedTests} tests`);
    expect(output).toMatch(
      new RegExp(`test result: ok\\. ${expectedTests} passed; 0 failed`),
    );
    expect(output).not.toMatch(/error:|signal|timed out/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

it("publishes the lazy-init model and one primary transfer step", () => {
  expect(slotLazyInitSteps.map((step) => step.id)).toEqual([
    "slot-state-lazy-init-model",
    slotLazyInitPrimaryStepId,
  ]);
  expect(slotLazyInitSteps[0]).toMatchObject({
    evidenceKind: "exposure",
    evidenceGate: false,
  });
  expect(slotLazyInitSteps[0].evidence?.codingTaskId).toBeUndefined();
  expect(slotLazyInitSteps[1]).toMatchObject({
    kind: "apply",
    code: slotLazyInitStarter,
    expectedStatus: "success",
    evidenceKind: "transfer",
    evidenceGate: true,
  });
  expect(slotLazyInitFamily).toBe("unsafe-miri/slot-lazy-init-v1");
  expect(slotLazyInitModel).toContain("Option");
  expect(slotLazyInitModel).toContain("Err zachowuje pusty");
  expect(slotLazyInitModel).toContain("pełny pomija ciało");
  expect(slotLazyInitModel).toContain("ponowna próba");
  expect(slotLazyInitStarter).toContain("todo!");
  expect(slotLazyInitSolution).toContain("MaybeUninit");
  expect(slotLazyInitSolution).toContain("get_or_try_init");
  expect(slotLazyInitEquivalent).toContain("MaybeUninit");
  for (const source of [
    slotLazyInitStarter,
    slotLazyInitSolution,
    slotLazyInitEquivalent,
    slotLazyInitSafeOption,
  ]) {
    expect(source).not.toContain("#[test]");
    expect(source).not.toContain("DropProbe");
  }
  expect(slotLazyInitTests.match(/#\[test\]/g)).toHaveLength(14);
  expect(slotLazyInitTests).toContain("size_of::<Zst>()");
  expect(slotLazyInitTests).toContain("Rc<Cell<u8>>");
  expect(slotLazyInitTests).toContain("PhantomPinned");
  expect(slotLazyInitMutant).not.toContain("MaybeUninit");
  expect(slotLazyInitMutant).toContain("if self.value.is_some()");
  expect(slotLazyInitMutant).toContain("let _ = init()?;");
  expect(slotLazyInitSteps[0].evaluator).toMatchObject({
    expected:
      'pusty: true\nErr zachowuje pusty: true, błąd: Err("spróbuj ponownie")\npełny: true, wywołania: 1\npełny pomija ciało: true, wywołania: 1\nprzejęty: Some("zainicjalizowany"), pusty po take: true\nponowna próba: true, wywołania: 2\n',
  });
});

it("keeps lazy initialization distinct from replacement and take_if slot exercises", () => {
  for (const source of [slotLazyInitSolution, slotLazyInitEquivalent]) {
    expect(source).toContain("get_or_try_init");
    expect(source).not.toMatch(/ReplaceSlot|take_if|fn replace/);
  }
});

it("accepts the canonical and equivalent native implementations", () => {
  compileAndRun(slotLazyInitSolution, 14);
  compileAndRun(slotLazyInitEquivalent, 14);
});

it("accepts the safe Option behavioral twin", () => {
  compileAndRun(slotLazyInitSafeOption, 14);
});

it("rejects surplus Send and Unpin bounds with E0277", () => {
  for (const trait of ["Send", "Unpin"] as const) {
    const directory = mkdtempSync(
      join(tmpdir(), `unsafe-miri-slot-lazy-${trait.toLowerCase()}-bound-`),
    );
    try {
      const bounded = slotLazyInitSolution.replace(
        "        F: FnOnce() -> Result<T, E>,",
        `        F: FnOnce() -> Result<T, E>,\n        T: ${trait},`,
      );
      const rejected = compile(
        appendHiddenTests(bounded, slotLazyInitTests),
        directory,
      );
      expect(rejected.error).toBeUndefined();
      expect(rejected.status).not.toBe(0);
      expect(rejected.signal).toBeNull();
      expect(rejected.stderr).toMatch(/error\[E0277\]/);
      expect(rejected.stderr).toContain(`trait \`${trait}\``);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

it("rejects the named Full-path eager-initializer mutant", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "unsafe-miri-slot-lazy-mutant-"),
  );
  try {
    const compiled = compile(
      appendHiddenTests(slotLazyInitMutant, slotLazyInitTests),
      directory,
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = run(directory, ["--test-threads=1"]);
    const output = outputOf(executed);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status).toBe(101);
    expect(output).toContain(
      "full_suppresses_initializer_and_drops_captured_closure",
    );
    expect(output).toContain("FAILED");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("keeps the starter compilable but behaviorally incomplete", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "unsafe-miri-slot-lazy-starter-"),
  );
  try {
    const compiled = compile(
      appendHiddenTests(slotLazyInitStarter, slotLazyInitTests),
      directory,
    );
    expect(compiled.error).toBeUndefined();
    expect(compiled.status, compiled.stderr).toBe(0);
    const executed = run(directory, ["--test-threads=1"]);
    const output = outputOf(executed);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status).toBe(101);
    expect(output).toContain(
      "full_suppresses_initializer_and_drops_captured_closure",
    );
    expect(output).toContain("FAILED");
    expect(output).toContain("zaimplementuj leniwą inicjalizację");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("rejects owner escape and static lifetime shortening while accepting scoped twins", () => {
  const directory = mkdtempSync(join(tmpdir(), "unsafe-miri-slot-lazy-owner-"));
  try {
    const escaping = `${slotLazyInitSolution}
fn escaped() {
    let slot;
    {
        let mut value = String::from("lokalne");
        let mut candidate = LazySlot::new();
        candidate.get_or_try_init(|| Ok::<_, ()>(value.as_str())).unwrap();
        slot = candidate;
    }
    drop(slot);
}
fn main() { escaped(); }
`;
    const escapedCompile = compile(escaping, directory, false, [
      "--error-format=json",
    ]);
    expect(escapedCompile.status).not.toBe(0);
    expect(escapedCompile.signal).toBeNull();
    expect(escapedCompile.stderr).toMatch(
      /E0597|borrowed value does not live long enough/,
    );

    const returnedReferenceEscape = `${slotLazyInitSolution}
fn escaped_ref() {
    let output;
    {
        let mut slot = LazySlot::new();
        output = slot.get_or_try_init(|| Ok::<_, ()>(String::from("owned"))).unwrap();
    }
    println!("{}", output);
}
fn main() { escaped_ref(); }
`;
    const returnedReferenceCompile = compile(
      returnedReferenceEscape,
      directory,
      false,
      ["--error-format=json"],
    );
    expect(returnedReferenceCompile.status).not.toBe(0);
    expect(returnedReferenceCompile.signal).toBeNull();
    expect(returnedReferenceCompile.stderr).toMatch(
      /E0597|borrowed value does not live long enough/,
    );

    const staticShortening = `${slotLazyInitSolution}
fn write_short<'short>(slot: &mut LazySlot<&'static str>, value: &'short str) {
    let _ = slot.get_or_try_init(|| Ok::<_, ()>(value));
}
fn main() { }
`;
    const staticCompile = compile(staticShortening, directory, false, [
      "--error-format=json",
    ]);
    expect(staticCompile.status).not.toBe(0);
    expect(staticCompile.signal).toBeNull();
    expect(staticCompile.stderr).toMatch(/lifetime|E0521|E0597/);

    const scoped = `${slotLazyInitSolution}
fn main() {
    let mut value = String::from("lokalne");
    let mut slot = LazySlot::new();
    let text = slot.get_or_try_init(|| Ok::<_, ()>(value.as_str())).unwrap();
    assert_eq!(*text, "lokalne");
}
`;
    const scopedCompile = compile(scoped, directory, false);
    expect(scopedCompile.error).toBeUndefined();
    expect(scopedCompile.status, scopedCompile.stderr).toBe(0);
    const scopedRun = run(directory);
    expect(scopedRun.error).toBeUndefined();
    expect(scopedRun.signal).toBeNull();
    expect(scopedRun.status, outputOf(scopedRun)).toBe(0);

    const scopedReturnedReference = `${slotLazyInitSolution}
fn main() {
    let mut slot = LazySlot::new();
    {
        let output = slot.get_or_try_init(|| Ok::<_, ()>(String::from("owned"))).unwrap();
        assert_eq!(output, "owned");
    }
    assert_eq!(slot.take().as_deref(), Some("owned"));
}
`;
    const scopedReturnedCompile = compile(
      scopedReturnedReference,
      directory,
      false,
    );
    expect(scopedReturnedCompile.error).toBeUndefined();
    expect(scopedReturnedCompile.status, scopedReturnedCompile.stderr).toBe(0);
    const scopedReturnedRun = run(directory);
    expect(scopedReturnedRun.error).toBeUndefined();
    expect(scopedReturnedRun.signal).toBeNull();
    expect(scopedReturnedRun.status, outputOf(scopedReturnedRun)).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("rejects take while the returned mutable borrow is still live", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "unsafe-miri-slot-lazy-borrow-"),
  );
  try {
    const held = `${slotLazyInitSolution}
fn main() {
    let mut slot = LazySlot::new();
    let value = slot.get_or_try_init(|| Ok::<_, ()>(3_u8)).unwrap();
    let _taken = slot.take();
    println!("{}", value);
}
`;
    const rejected = compile(held, directory, false, ["--error-format=json"]);
    expect(rejected.status).not.toBe(0);
    expect(rejected.signal).toBeNull();
    expect(rejected.stderr).toMatch(/E0499|borrowed|mutable/);

    const scoped = `${slotLazyInitSolution}
fn main() {
    let mut slot = LazySlot::new();
    {
        let value = slot.get_or_try_init(|| Ok::<_, ()>(3_u8)).unwrap();
        assert_eq!(*value, 3);
    }
    assert_eq!(slot.take(), Some(3));
}
`;
    const accepted = compile(scoped, directory, false);
    expect(accepted.error).toBeUndefined();
    expect(accepted.status, accepted.stderr).toBe(0);
    const executed = run(directory);
    expect(executed.error).toBeUndefined();
    expect(executed.signal).toBeNull();
    expect(executed.status, outputOf(executed)).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
