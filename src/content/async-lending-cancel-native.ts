import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { appendHiddenTests } from "../runner";
import { cancelTransferNativeCandidates, cancelTransferStep, createCancelTransferMutants } from "./async-lending-cancel-transfer";

const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const evidenceRoot = (directory: string) => process.env.M11_NATIVE_EVIDENCE_DIR ? resolve(process.env.M11_NATIVE_EVIDENCE_DIR) : directory;
export function cancelNativeDirectory(prefix: string) { const root = evidenceRoot(tmpdir()); mkdirSync(root, { recursive: true }); return mkdtempSync(join(root, prefix)); }
export function discardCancelNativeDirectory(directory: string) { if (!process.env.M11_NATIVE_EVIDENCE_DIR) rmSync(directory, { recursive: true, force: true }); }

function sourcePath(directory: string, arg: string) { return isAbsolute(arg) ? arg : resolve(directory, arg); }
function run(directory: string, command: string, args: string[], timeout = 60_000) {
  const result = spawnSync(command, args, { cwd: directory, encoding: "utf8", timeout, maxBuffer: 16 * 1024 * 1024 });
  const recordDirectory = mkdtempSync(join(evidenceRoot(directory), "command-"));
  const sourceArgs = args.filter((arg) => arg.endsWith(".rs"));
  const sourceHashes = Object.fromEntries(sourceArgs.map((arg) => { const file = sourcePath(directory, arg); const bytes = readFileSync(file); return [file, hash(bytes)]; }));
  writeFileSync(join(recordDirectory, "stdout.txt"), result.stdout ?? "");
  writeFileSync(join(recordDirectory, "stderr.txt"), result.stderr ?? "");
  writeFileSync(join(recordDirectory, "command.json"), JSON.stringify({ argv: [command, ...args], cwd: directory, status: result.status, signal: result.signal, error: result.error?.message ?? null, timedOut: (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT", sourceHashes, stdoutSha256: hash(result.stdout ?? ""), stderrSha256: hash(result.stderr ?? "") }, null, 2) + "\n");
  return result;
}
function compile(directory: string, id: string, source: string, rustc: string, json = false, testBinary = true) {
  const file = join(directory, `${id}.rs`); const binary = join(directory, id); writeFileSync(file, source);
  const args = ["--edition=2024", ...(json ? ["--error-format=json"] : []), ...(testBinary ? ["--test"] : []), file, "-o", binary];
  const result = run(directory, rustc, args); return { file, binary, result, sourceSha256: hash(source), args };
}
function assertSourceUnchanged(file: string, before: string) { const after = hash(readFileSync(file)); assert.equal(after, before, `${file} changed after compilation`); return after; }
function exact(binary: string, directory: string, name: string, passed: boolean) {
  const result = run(directory, binary, ["--exact", name, "--test-threads=1", "--nocapture"], 8_000);
  assert.equal(result.error, undefined, `${name} process error`); assert.equal(result.signal, null, `${name} signal`); assert.equal(result.status, passed ? 0 : 101, `${name}: ${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, new RegExp(`test ${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")} \\.\\.\\. ${passed ? "ok" : "FAILED"}`));
  return result;
}

export function verifyCancelTransferBehavior(directory: string, rustc = "rustc") {
  mkdirSync(directory, { recursive: true }); const tests = cancelTransferStep.evaluator; assert(tests?.kind === "tests");
  const candidates = cancelTransferNativeCandidates.map((candidate) => ({ ...candidate, source: appendHiddenTests(candidate.source, tests.tests) }));
  const binaries: Record<string, string> = {}; const summaries: Array<Record<string, unknown>> = [];
  const version = run(directory, rustc, ["--version", "--verbose"]); assert.equal(version.status, 0, version.stderr); const compilerVersion = (version.stdout ?? "").trim();
  const starterBuilt = compile(directory, "starter", appendHiddenTests(cancelTransferStep.code ?? "", tests.tests), rustc, false, true); assert.equal(starterBuilt.result.status, 0, starterBuilt.result.stderr); const starterRun = run(directory, starterBuilt.binary, ["--test-threads=1"], 12_000); assert.equal(starterRun.status, 101, `${starterRun.stdout}\n${starterRun.stderr}`); assert.match(`${starterRun.stdout}\n${starterRun.stderr}`, /submit state machine is the learner's task/); summaries.push({ id: "starter-rejection", compilerVersion, compileStatus: starterBuilt.result.status, testStatus: starterRun.status, sourceSha256: starterBuilt.sourceSha256, sourceSha256After: assertSourceUnchanged(starterBuilt.file, starterBuilt.sourceSha256) });
  for (const candidate of candidates) { const built = compile(directory, candidate.id, candidate.source, rustc); assert.equal(built.result.status, 0, built.result.stderr); const runResult = run(directory, built.binary, ["--test-threads=1"], 12_000); assert.equal(runResult.status, 0, `${candidate.id}: ${runResult.stdout}\n${runResult.stderr}`); assert.match(runResult.stdout, /9 passed; 0 failed/); binaries[candidate.id] = built.binary; summaries.push({ id: `canonical-${candidate.id}`, compilerVersion, sourceSha256: built.sourceSha256, sourceSha256After: assertSourceUnchanged(built.file, built.sourceSha256), compileStatus: built.result.status, testStatus: runResult.status, tests: 9 }); }
  for (const candidate of cancelTransferNativeCandidates) {
    for (const mutant of createCancelTransferMutants(candidate.source)) {
      const source = appendHiddenTests(mutant.source, tests.tests);
      const built = compile(directory, `${candidate.id}-${mutant.id}`, source, rustc); assert.equal(built.result.status, 0, `${candidate.id}/${mutant.id}: ${built.result.stderr}`);
      const failed = exact(built.binary, directory, mutant.testName, false); const restored = exact(binaries[candidate.id], directory, mutant.testName, true);
      summaries.push({ id: `${candidate.id}/${mutant.id}`, family: mutant.family, compilerVersion, compileStatus: built.result.status, testStatus: failed.status, restoredStatus: restored.status, sourceSha256: built.sourceSha256, sourceSha256After: assertSourceUnchanged(built.file, built.sourceSha256), assertion: mutant.assertion });
    }
  }
  for (const candidate of cancelTransferNativeCandidates) { const finalRun = run(directory, binaries[candidate.id], ["--test-threads=1"], 12_000); assert.equal(finalRun.status, 0, `${candidate.id} final full: ${finalRun.stdout}\n${finalRun.stderr}`); assert.match(finalRun.stdout, /9 passed; 0 failed/); summaries.push({ id: `final-full-${candidate.id}`, compilerVersion, testStatus: finalRun.status, tests: 9 }); }
  writeFileSync(join(directory, "behavior-summary.json"), JSON.stringify({ representations: 3, families: 8, variants: 24, initialCanonicalFull: 3, intendedNamedFailures: 24, restoredNamedPasses: 24, finalCanonicalFull: 3, summaries }, null, 2) + "\n"); return summaries;
}

const boundaryPrelude = `
use std::cell::{Cell, RefCell};
use std::marker::PhantomPinned;
use std::rc::Rc;
use std::sync::Arc;
use std::task::{Context, Poll, Wake, Waker};
struct GateState { ready: Cell<bool>, polls: Cell<usize>, latest: RefCell<Option<Waker>> }
struct Gate { state: Rc<GateState>, _pin: PhantomPinned }
impl Gate { fn new(ready: bool) -> (Self, Rc<GateState>) { let state = Rc::new(GateState { ready: Cell::new(ready), polls: Cell::new(0), latest: RefCell::new(None) }); (Self { state: state.clone(), _pin: PhantomPinned }, state) } }
impl std::future::Future for Gate { type Output = (); fn poll(self: std::pin::Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<()> { let state = &self.as_ref().get_ref().state; state.polls.set(state.polls.get() + 1); *state.latest.borrow_mut() = Some(cx.waker().clone()); if state.ready.get() { Poll::Ready(()) } else { Poll::Pending } } }
struct BorrowGate<'a> { seen: &'a Cell<bool>, _pin: PhantomPinned }
impl<'a> BorrowGate<'a> { fn new(seen: &'a Cell<bool>) -> Self { Self { seen, _pin: PhantomPinned } } }
impl std::future::Future for BorrowGate<'_> { type Output = (); fn poll(self: std::pin::Pin<&mut Self>, _: &mut Context<'_>) -> Poll<()> { self.as_ref().get_ref().seen.set(true); Poll::Ready(()) } }
struct Noop; impl Wake for Noop { fn wake(self: Arc<Self>) {} }
fn waker() -> Waker { Waker::from(Arc::new(Noop)) }
fn ready_once<F: std::future::Future>(mut future: std::pin::Pin<&mut F>, w: &Waker) -> F::Output { let mut cx = Context::from_waker(w); match future.as_mut().poll(&mut cx) { Poll::Ready(value) => value, Poll::Pending => panic!("expected ready") } }
`;
type Boundary = { id: string; extraP: string; extraQ: string; negative: string; corrected: string; expectedCode: string; marker: string; token: string; message: string; controlMarker?: string };
const common = `let mut l = Ledger::new(); let (p, _) = Gate::new(true); let (q, _) = Gate::new(true);`;
const boundStrengthening: Boundary[] = (["send", "send-q", "unpin", "unpin-q", "clone", "clone-q"] as const).map((id) => ({ id, extraP: id.endsWith("-q") ? "" : ` + ${id.startsWith("send") ? "Send" : id.startsWith("unpin") ? "Unpin" : "Clone"}`, extraQ: id.endsWith("-q") ? ` + ${id.startsWith("send") ? "Send" : id.startsWith("unpin") ? "Unpin" : "Clone"}` : "", expectedCode: "E0277", marker: `/* EXPECT_${id.endsWith("-q") ? "Q" : "P"} */`, token: id.endsWith("-q") ? "q" : "p", message: id.startsWith("send") ? "Rc<GateState>\` cannot be sent between threads safely" : id.startsWith("unpin") ? "PhantomPinned\` cannot be unpinned" : "the trait bound `Gate: Clone` is not satisfied", negative: `fn main() { ${common} let _f = l.submit("a".into(), "v".into(), ${id.endsWith("-q") ? "p, /* EXPECT_Q */ q" : "/* EXPECT_P */ p, q"}); }`, corrected: `fn main() { ${common} let w = waker(); let mut f = Box::pin(l.submit("a".into(), "v".into(), p, q)); assert_eq!(ready_once(f.as_mut(), &w), Ok(0)); drop(f); assert_eq!(l.len(), 1); }` }));
export const cancelTransferBoundaries: readonly Boundary[] = [
  { id: "live-future-immutable", extraP: "", extraQ: "", expectedCode: "E0502", marker: "/* EXPECT_IMMUTABLE */", token: "l", controlMarker: "/* CONTROL_LEDGER */", message: "cannot borrow", negative: `fn main() { let mut l = Ledger::new(); let (p, _) = Gate::new(false); let (q, _) = Gate::new(false); let _f = /* CONTROL_LEDGER */ l.submit("a".into(), "v".into(), p, q); let _ = /* EXPECT_IMMUTABLE */ l.len(); }`, corrected: `fn main() { ${common} let mut f = Box::pin(l.submit("a".into(), "v".into(), p, q)); let w = waker(); assert_eq!(ready_once(f.as_mut(), &w), Ok(0)); drop(f); assert_eq!(l.len(), 1); }` },
  { id: "live-future-second-mut", extraP: "", extraQ: "", expectedCode: "E0499", marker: "/* EXPECT_SECOND */", token: "l", controlMarker: "/* CONTROL_LEDGER */", message: "borrow", negative: `fn main() { let mut l = Ledger::new(); let (p, _) = Gate::new(false); let (q, _) = Gate::new(false); let _f = /* CONTROL_LEDGER */ l.submit("a".into(), "v".into(), p, q); let (p2, _) = Gate::new(false); let (q2, _) = Gate::new(false); let _g = /* EXPECT_SECOND */ l.submit("b".into(), "w".into(), p2, q2); }`, corrected: `fn main() { ${common} let mut f = Box::pin(l.submit("a".into(), "v".into(), p, q)); let w = waker(); assert_eq!(ready_once(f.as_mut(), &w), Ok(0)); drop(f); let (p2, _) = Gate::new(true); let (q2, _) = Gate::new(true); let mut g = Box::pin(l.submit("b".into(), "w".into(), p2, q2)); assert_eq!(ready_once(g.as_mut(), &w), Ok(1)); drop(g); }` },
  { id: "static", extraP: " + 'static", extraQ: "", expectedCode: "E0597", marker: "/* EXPECT_FLAG */", token: "&flag", message: "does not live long enough", negative: `fn main() { let mut l = Ledger::new(); let flag = Cell::new(false); let p = BorrowGate::new(/* EXPECT_FLAG */ &flag); let (q, _) = Gate::new(true); let _f = l.submit("a".into(), "v".into(), p, q); }`, corrected: `fn main() { let mut l = Ledger::new(); let flag = Cell::new(false); let p = BorrowGate::new(&flag); let (q, _) = Gate::new(true); let mut f = Box::pin(l.submit("a".into(), "v".into(), p, q)); let w = waker(); assert_eq!(ready_once(f.as_mut(), &w), Ok(0)); drop(f); assert!(flag.get()); }` },
  { id: "static-q", extraP: "", extraQ: " + 'static", expectedCode: "E0597", marker: "/* EXPECT_FLAG */", token: "&flag", message: "does not live long enough", negative: `fn main() { let mut l = Ledger::new(); let flag = Cell::new(false); let (p, _) = Gate::new(true); let q = BorrowGate::new(/* EXPECT_FLAG */ &flag); let _f = l.submit("a".into(), "v".into(), p, q); }`, corrected: `fn main() { let mut l = Ledger::new(); let flag = Cell::new(false); let (p, _) = Gate::new(true); let q = BorrowGate::new(&flag); let mut f = Box::pin(l.submit("a".into(), "v".into(), p, q)); let w = waker(); assert_eq!(ready_once(f.as_mut(), &w), Ok(0)); drop(f); assert!(flag.get()); }` },
  ...boundStrengthening,
];
function withBounds(source: string, extraP: string, extraQ: string) { return source.replace("P: Future<Output = ()>", `P: Future<Output = ()>${extraP}`).replace("Q: Future<Output = ()>", `Q: Future<Output = ()>${extraQ}`); }
function parseDiagnostics(stderr: string): Array<{ level?: string; message?: string; code?: { code?: string }; spans?: Array<{ file_name?: string; is_primary?: boolean; byte_start?: number; byte_end?: number }> }> { return stderr.split(/\r?\n/).filter(Boolean).flatMap((line) => { try { const record = JSON.parse(line); return record.$message_type === "diagnostic" ? [record] : []; } catch { return []; } }); }
function rangeFor(source: string, marker: string, token: string) { const markerAt = source.indexOf(marker); const at = source.indexOf(token, markerAt + marker.length); assert(markerAt >= 0 && at >= 0); const start = Buffer.byteLength(source.slice(0, at)); return { byte_start: start, byte_end: start + Buffer.byteLength(token) }; }
function controlRangeFor(source: string, boundary: Boundary) {
  const markerAt = source.indexOf(boundary.marker);
  let token = boundary.token; let at = -1;
  if (boundary.controlMarker) { const controlAt = source.indexOf(boundary.controlMarker); assert(controlAt >= 0, `${boundary.id}: missing control marker`); token = "l"; at = source.indexOf(token, controlAt + boundary.controlMarker.length); }
  else if (boundary.id === "static" || boundary.id === "static-q") { token = "flag"; at = source.lastIndexOf(token, markerAt); }
  else if (boundary.marker.includes("EXPECT_P")) { token = "q"; at = source.indexOf(token, markerAt + boundary.marker.length); }
  else { token = "p"; at = source.lastIndexOf(token, markerAt); }
  assert(at >= 0, `${boundary.id}: missing actual control identifier`); const start = Buffer.byteLength(source.slice(0, at)); return { byte_start: start, byte_end: start + Buffer.byteLength(token) };
}
function primaryMatches(records: ReturnType<typeof parseDiagnostics>, file: string, boundary: Boundary, range: { byte_start: number; byte_end: number }) { return records.some((record) => record.level === "error" && record.code?.code === boundary.expectedCode && String(record.message).includes(boundary.message) && record.spans?.some((span) => span.is_primary && span.file_name === file && span.byte_start === range.byte_start && span.byte_end === range.byte_end)); }
const knownRustcAbortSummary = (message: string | undefined) => /^aborting due to \d+ previous errors?$/.test(String(message));
export function assertDiagnosticPolicy(records: ReturnType<typeof parseDiagnostics>, boundary: Boundary) {
  const errors = records.filter((record) => record.level === "error");
  const coded = errors.filter((record) => record.code?.code);
  assert(coded.length > 0 && coded.every((record) => record.code?.code === boundary.expectedCode && String(record.message).includes(boundary.message)), `${boundary.id}: unexpected coded diagnostics ${JSON.stringify(coded)}`);
  const uncoded = errors.filter((record) => !record.code?.code);
  assert(uncoded.every((record) => knownRustcAbortSummary(record.message)), `${boundary.id}: unexpected uncoded diagnostics ${JSON.stringify(uncoded)}`);
}

export function verifyCancelTransferBoundaries(directory: string, rustc = "rustc") {
  mkdirSync(directory, { recursive: true }); const summaries: Array<Record<string, unknown>> = []; let classifierControlPassed = false;
  for (const candidate of cancelTransferNativeCandidates) for (const boundary of cancelTransferBoundaries) {
    const negative = `${boundaryPrelude}\n${withBounds(candidate.source, boundary.extraP, boundary.extraQ)}\n${boundary.negative}\n`;
    const expected = rangeFor(negative, boundary.marker, boundary.token); const fail = compile(directory, `${candidate.id}-${boundary.id}-negative`, negative, rustc, true, false);
    assert.equal(fail.result.status, 1, `${candidate.id}/${boundary.id} status ${fail.result.status}: ${fail.result.stderr}`); assert.equal(fail.result.signal, null); assert.equal(fail.result.error, undefined);
    const records = parseDiagnostics(fail.result.stderr); assert(records.length > 0, `${candidate.id}/${boundary.id}: no JSON diagnostics`); assertDiagnosticPolicy(records, boundary); assert(primaryMatches(records, fail.file, boundary, expected), `${candidate.id}/${boundary.id}: primary range mismatch ${JSON.stringify(records)}`); const controlRange = controlRangeFor(negative, boundary); assert(!primaryMatches(records, fail.file, boundary, controlRange), `${candidate.id}/${boundary.id}: actual wrong argument span accepted`);
    if (!classifierControlPassed) { const abort = records.find((record) => record.level === "error" && !record.code?.code && knownRustcAbortSummary(record.message)); assert(abort, `${candidate.id}/${boundary.id}: missing known rustc abort summary`); assert.throws(() => assertDiagnosticPolicy([...records, { ...abort, message: "unexpected uncoded collateral error" }], boundary), /unexpected uncoded diagnostics/); classifierControlPassed = true; }
    const passing = compile(directory, `${candidate.id}-${boundary.id}-pass`, `${boundaryPrelude}\n${candidate.source}\n${boundary.corrected}\n`, rustc, false, false); assert.equal(passing.result.status, 0, `${candidate.id}/${boundary.id}: ${passing.result.stderr}`); const passRun = run(directory, passing.binary, [], 8_000); assert.equal(passRun.status, 0, passRun.stderr); assert.equal(passRun.signal, null); assert.equal(passRun.error, undefined);
    summaries.push({ id: `${candidate.id}/${boundary.id}`, compilerVersion: (run(directory, rustc, ["--version", "--verbose"]).stdout ?? "").trim(), expectedCode: boundary.expectedCode, expectedMessage: boundary.message, primaryRange: expected, controlRange, wrongSpanRejected: true, negativeStatus: fail.result.status, correctedCompileStatus: passing.result.status, correctedRunStatus: passRun.status, correctedAssertionsExecuted: true, sourceSha256: fail.sourceSha256, sourceSha256After: assertSourceUnchanged(fail.file, fail.sourceSha256) });
  }
  writeFileSync(join(directory, "boundary-summary.json"), JSON.stringify({ fixtures: 10, representations: 3, executions: summaries.length, exactPrimaryRangePasses: summaries.length, wrongSpanRejected: summaries.length, classifierControlPassed, summaries }, null, 2) + "\n"); return summaries;
}
export function verifyCancelTransferConsumerBounds(directory: string, rustc = "rustc") { return verifyCancelTransferBoundaries(directory, rustc); }
