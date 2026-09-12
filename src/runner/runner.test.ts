import { describe, expect, it, vi } from "vitest";
import { PlaygroundRunner, RemoteRunner, RUNNER_LIMITS } from "./index";

function upstream(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PlaygroundRunner", () => {
  it("sends stable Rust 2024 execution requests and returns stdout", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          channel: "stable",
          mode: "debug",
          edition: "2024",
          crateType: "bin",
          tests: false,
          backtrace: false,
          code: 'fn main() { println!("ok"); }',
        });
        return upstream({ success: true, stdout: "ok\n", stderr: "" });
      },
    );

    const result = await new PlaygroundRunner({ fetch: fetcher }).run({
      code: 'fn main() { println!("ok"); }',
      mode: "run",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://play.rust-lang.org/execute",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toMatchObject({
      status: "success",
      stdout: "ok\n",
      stderr: "",
      diagnostics: [],
    });
  });

  it("appends hidden tests in a private module and reports truthful counts", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const payload = JSON.parse(String(init?.body));
        expect(payload).toMatchObject({
          crateType: "lib",
          tests: true,
          edition: "2024",
        });
        expect(payload.code).toContain(
          "#[cfg(test)]\nmod __rust_workshop_hidden_tests",
        );
        expect(payload.code).toContain("fn answer() -> u8 { 2 }");
        expect(payload.code).toContain("::std::assert_eq!(super::answer(), 3)");
        return upstream({
          success: false,
          stdout:
            "running 1 test\ntest __rust_workshop_hidden_tests::answer_is_two ... ok\n\ntest result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out\n\ntest result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out\n",
          stderr: "assertion failed: left == right\n",
        });
      },
    );

    const result = await new PlaygroundRunner({ fetch: fetcher }).run({
      code: "pub fn answer() -> u8 { 2 }",
      mode: "test",
      tests: "#[test]\nfn answer_is_two() { assert_eq!(super::answer(), 3); }",
    });

    expect(result.status).toBe("test-failure");
    expect(result.tests).toEqual({ passed: 0, failed: 1 });
    expect(result.stdout).toContain("test result: FAILED");
  });

  it("aggregates unit and documentation test summaries instead of using only the last one", async () => {
    const runner = new PlaygroundRunner({
      fetch: async () =>
        upstream({
          success: true,
          stdout:
            "test result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out\n\ntest result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out\n",
          stderr: "",
        }),
    });
    await expect(
      runner.run({ code: "pub fn answer() {}", mode: "test" }),
    ).resolves.toMatchObject({
      tests: { passed: 2, failed: 0 },
    });
  });

  it("preserves compiler stderr while extracting line diagnostics", async () => {
    const stderr =
      "error[E0425]: cannot find value `x` in this scope\n --> src/main.rs:3:5\n";
    const runner = new PlaygroundRunner({
      fetch: async () => upstream({ success: false, stdout: "", stderr }),
    });

    const result = await runner.run({
      code: "fn main() { println!(x); }",
      mode: "run",
    });

    expect(result.status).toBe("compile-error");
    expect(result.stderr).toBe(stderr);
    expect(result.diagnostics).toEqual([
      {
        code: "E0425",
        message: "cannot find value `x` in this scope",
        line: 3,
        level: "error",
      },
    ]);
  });

  it("distinguishes runtime errors from compilation errors", async () => {
    const runner = new PlaygroundRunner({
      fetch: async () =>
        upstream({
          success: false,
          stdout: "",
          stderr: "thread 'main' panicked at 'boom', src/main.rs:2:5",
        }),
    });

    await expect(
      runner.run({ code: 'fn main() { panic!("boom"); }', mode: "run" }),
    ).resolves.toMatchObject({
      status: "runtime-error",
    });
  });

  it("returns infrastructure-error for malformed or unavailable upstream responses", async () => {
    const runner = new PlaygroundRunner({
      fetch: async () => new Response("gateway unavailable", { status: 503 }),
    });

    await expect(
      runner.run({ code: "fn main() {}", mode: "run" }),
    ).resolves.toMatchObject({
      status: "infrastructure-error",
      stderr: "gateway unavailable",
    });
  });

  it("does not classify an unstructured upstream failure as a learner runtime error", async () => {
    const runner = new PlaygroundRunner({
      fetch: async () =>
        upstream({
          success: false,
          stdout: "",
          stderr: "upstream worker unavailable",
        }),
    });

    await expect(
      runner.run({ code: "fn main() {}", mode: "run" }),
    ).resolves.toMatchObject({
      status: "infrastructure-error",
    });
  });

  it("bounds the response body before parsing and bounds each returned stream", async () => {
    const huge = "x".repeat(RUNNER_LIMITS.maxOutputBytes + 1);
    const runner = new PlaygroundRunner({
      fetch: async () => upstream({ success: true, stdout: huge, stderr: "" }),
    });
    const result = await runner.run({ code: "fn main() {}", mode: "run" });
    expect(
      new TextEncoder().encode(result.stdout).byteLength,
    ).toBeLessThanOrEqual(RUNNER_LIMITS.maxOutputBytes);

    const oversized = new PlaygroundRunner({
      fetch: async () =>
        new Response("x".repeat(RUNNER_LIMITS.maxOutputBytes * 3), {
          status: 200,
        }),
    });
    await expect(
      oversized.run({ code: "fn main() {}", mode: "run" }),
    ).resolves.toMatchObject({
      status: "infrastructure-error",
    });
  });

  it("returns timeout without executing source locally", async () => {
    const runner = new PlaygroundRunner({
      timeoutMs: 5,
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    });

    await expect(
      runner.run({ code: "fn main() {}", mode: "run" }),
    ).resolves.toMatchObject({
      status: "timeout",
    });
  });

  it("rejects oversized code and hidden tests before making a network call", async () => {
    const fetcher = vi.fn();
    const runner = new PlaygroundRunner({ fetch: fetcher });

    const result = await runner.run({
      code: "a".repeat(RUNNER_LIMITS.maxCodeBytes + 1),
      mode: "run",
    });

    expect(result.status).toBe("infrastructure-error");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("RemoteRunner", () => {
  it("accepts only an HTTPS fixed endpoint", async () => {
    const fetcher = vi.fn(async () =>
      upstream({ success: true, stdout: "ok", stderr: "" }),
    );
    const runner = new RemoteRunner({
      endpoint: "https://runner.example.invalid/run",
      fetch: fetcher,
    });

    await runner.run({ code: "fn main() {}", mode: "run" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://runner.example.invalid/run",
      expect.any(Object),
    );
    expect(
      () => new RemoteRunner({ endpoint: "http://runner.example.invalid/run" }),
    ).toThrow(/HTTPS/);
  });
});
