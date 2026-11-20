import assert from "node:assert/strict";
const base = process.env.RUST_WORKSHOP_URL ?? "http://127.0.0.1:3000";
const cases = [
  {
    name: "run",
    code: 'fn main(){println!("live Rust");}',
    mode: "run",
    status: "success",
    stdout: "live Rust\n",
  },
  {
    name: "ownership error",
    code: 'fn main(){let a=String::from("rust");let b=a;println!("{a} {b}");}',
    mode: "run",
    status: "compile-error",
    diagnostic: "E0382",
  },
  {
    name: "unit tests",
    code: "fn double(n:i32)->i32{n*2}",
    mode: "test",
    tests:
      "#[test] fn positive(){assert_eq!(double(3),6);} #[test] fn negative(){assert_eq!(double(-4),-8);}",
    status: "success",
    passed: 2,
  },
  {
    name: "test failure",
    code: "fn double(n:i32)->i32{n}",
    mode: "test",
    tests: "#[test] fn positive(){assert_eq!(double(3),6);}",
    status: "test-failure",
    failed: 1,
  },
  {
    name: "runtime panic",
    code: 'fn main(){panic!("intentional authored example");}',
    mode: "run",
    status: "runtime-error",
  },
];
for (const item of cases) {
  const response = await fetch(`${base}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({
      code: item.code,
      mode: item.mode,
      tests: item.tests,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  assert.equal(response.status, 200, item.name);
  assert.equal(result.status, item.status, `${item.name}: ${result.stderr}`);
  if (item.stdout) assert.equal(result.stdout, item.stdout);
  if (item.diagnostic)
    assert.ok(result.diagnostics.some((d) => d.code === item.diagnostic));
  if (item.passed) assert.equal(result.tests.passed, item.passed);
  if (item.failed) assert.equal(result.tests.failed, item.failed);
  console.log(`ok ${item.name} (${result.durationMs} ms)`);
}
