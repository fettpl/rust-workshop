import type {
  RunRequest,
  RunResult,
  RustRunner,
  Diagnostic,
} from "@/domain/types";

export const PLAYGROUND_EXECUTE_URL = "https://play.rust-lang.org/execute";

export const RUNNER_LIMITS = {
  maxCodeBytes: 64 * 1024,
  maxTestsBytes: 32 * 1024,
  maxRequestBytes: 100 * 1024,
  maxOutputBytes: 128 * 1024,
  timeoutMs: 12_000,
  maxConcurrent: 4,
  maxQueued: 8,
} as const;

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface RunnerOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
}

interface RemoteRunnerOptions extends RunnerOptions {
  endpoint: string;
}

const utf8Size = (value: string): number =>
  new TextEncoder().encode(value).byteLength;

function bounded(value: string, limit = RUNNER_LIMITS.maxOutputBytes): string {
  if (utf8Size(value) <= limit) return value;
  const marker = `\n[output truncated at ${limit} bytes]`;
  const budget = Math.max(0, limit - utf8Size(marker));
  const bytes = new TextEncoder().encode(value).slice(0, budget);
  return `${new TextDecoder().decode(bytes)}${marker}`;
}

const MAX_UPSTREAM_BODY_BYTES = RUNNER_LIMITS.maxOutputBytes * 2 + 32 * 1024;

async function readBoundedBody(
  response: Response,
  limit: number,
): Promise<string | undefined> {
  if (!response.body) {
    const text = await response.text();
    return utf8Size(text) <= limit ? text : undefined;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function infrastructure(message: string, durationMs = 0): RunResult {
  return {
    status: "infrastructure-error",
    stdout: "",
    stderr: bounded(message),
    diagnostics: [],
    durationMs,
  };
}

function requestError(request: RunRequest): string | undefined {
  if (!request || typeof request !== "object")
    return "Request must be an object";
  if (typeof request.code !== "string" || request.code.length === 0)
    return "Code is required";
  if (request.mode !== "run" && request.mode !== "test")
    return "Mode must be run or test";
  if (utf8Size(request.code) > RUNNER_LIMITS.maxCodeBytes)
    return `Code exceeds ${RUNNER_LIMITS.maxCodeBytes} bytes`;
  if (request.tests !== undefined && typeof request.tests !== "string")
    return "Tests must be a string";
  if (
    request.tests !== undefined &&
    utf8Size(request.tests) > RUNNER_LIMITS.maxTestsBytes
  ) {
    return `Tests exceed ${RUNNER_LIMITS.maxTestsBytes} bytes`;
  }
  return undefined;
}

function appendHiddenTests(code: string, tests: string): string {
  // Qualify standard assertions so learner macro definitions cannot shadow them.
  const assertions = tests.replace(
    /(?<![\w:])(assert(?:_eq|_ne)?|matches)\s*!/g,
    "::std::$1!",
  );
  return `${code}\n\n#[cfg(test)]\nmod __rust_workshop_hidden_tests {\n    use super::*;\n${assertions}\n}\n`;
}

function parseDiagnostics(stderr: string): Diagnostic[] {
  const lines = stderr.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].match(
      /^\s*(error|warning|note)(?:\[([A-Z]\d+)\])?:\s*(.+)$/,
    );
    if (!heading) continue;
    let line: number | undefined;
    for (
      let lookahead = index + 1;
      lookahead < Math.min(lines.length, index + 5);
      lookahead += 1
    ) {
      const location = lines[lookahead].match(/-->\s+[^:\s]+:(\d+)(?::\d+)?/);
      if (location) {
        line = Number(location[1]);
        break;
      }
    }
    diagnostics.push({
      code: heading[2],
      message: heading[3].trim(),
      line,
      level: heading[1] as Diagnostic["level"],
    });
  }
  return diagnostics;
}

function parseTests(
  output: string,
): { passed: number; failed: number } | undefined {
  const matches = [
    ...output.matchAll(
      /test result:\s*[^.]*\.\s*(\d+)\s+passed;\s*(\d+)\s+failed;/gi,
    ),
  ];
  if (!matches.length) return undefined;
  return matches.reduce(
    (counts, match) => ({
      passed: counts.passed + Number(match[1]),
      failed: counts.failed + Number(match[2]),
    }),
    { passed: 0, failed: 0 },
  );
}

function classifyFailure(
  request: RunRequest,
  stdout: string,
  stderr: string,
  success: boolean,
  exitDetail = "",
): RunResult["status"] {
  const tests = parseTests(`${stdout}\n${stderr}`);
  if (request.mode === "test" && tests && tests.failed > 0)
    return "test-failure";
  if (success) return "success";
  if (
    /\berror(?:\[[A-Z]\d+\])?:/i.test(stderr) ||
    /could not compile/i.test(stderr)
  )
    return "compile-error";
  if (request.mode === "test") return "test-failure";
  if (
    /panic|panicked|stack backtrace|abort|signal:\s*\d+|segmentation fault|killed|exit(?:ed)? with status [1-9]\d*/i.test(
      `${stderr}\n${exitDetail}`,
    )
  )
    return "runtime-error";
  return "infrastructure-error";
}

class ConcurrencyGate {
  private active = 0;
  private readonly waiting: Array<() => boolean> = [];

  acquire(timeoutMs: number): Promise<(() => void) | undefined> {
    if (this.active < RUNNER_LIMITS.maxConcurrent) {
      this.active += 1;
      return Promise.resolve(() => this.release());
    }
    if (this.waiting.length >= RUNNER_LIMITS.maxQueued)
      return Promise.resolve(undefined);
    return new Promise((resolve) => {
      const waiter = {
        done: false,
        resolve: resolve as (release: (() => void) | undefined) => void,
      };
      const timer = setTimeout(() => {
        waiter.done = true;
        waiter.resolve(undefined);
      }, timeoutMs);
      this.waiting.push(() => {
        if (waiter.done) return false;
        waiter.done = true;
        clearTimeout(timer);
        this.active += 1;
        waiter.resolve(() => this.release());
        return true;
      });
    });
  }

  private release(): void {
    this.active -= 1;
    while (this.waiting.length) {
      const next = this.waiting.shift();
      if (next?.()) return;
    }
  }
}

const gate = new ConcurrencyGate();

abstract class HttpRunner implements RustRunner {
  protected abstract readonly endpoint: string;
  private readonly fetcher: FetchLike;
  private readonly timeoutMs: number;

  protected constructor(options: RunnerOptions = {}) {
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? RUNNER_LIMITS.timeoutMs;
  }

  async run(request: RunRequest): Promise<RunResult> {
    const started = Date.now();
    const invalid = requestError(request);
    if (invalid) return infrastructure(invalid, Date.now() - started);

    const release = await gate.acquire(this.timeoutMs);
    if (!release)
      return {
        ...infrastructure(
          "Runner queue timed out or concurrency limit reached",
          Date.now() - started,
        ),
        status: "timeout",
      };

    const controller = new AbortController();
    const remainingMs = Math.max(1, this.timeoutMs - (Date.now() - started));
    const timer = setTimeout(() => controller.abort(), remainingMs);
    const code =
      request.mode === "test" && request.tests
        ? appendHiddenTests(request.code, request.tests)
        : request.code;
    if (utf8Size(code) > RUNNER_LIMITS.maxRequestBytes) {
      release();
      clearTimeout(timer);
      return infrastructure(
        `Combined source exceeds ${RUNNER_LIMITS.maxRequestBytes} bytes`,
        Date.now() - started,
      );
    }
    const payload = {
      channel: "stable",
      mode: "debug",
      edition: "2024",
      crateType: request.mode === "test" ? "lib" : "bin",
      tests: request.mode === "test",
      backtrace: false,
      code,
    };

    try {
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const raw = await readBoundedBody(response, MAX_UPSTREAM_BODY_BYTES);
      if (raw === undefined)
        return infrastructure(
          "Runner response exceeded the response size limit",
          Date.now() - started,
        );
      if (!response.ok)
        return infrastructure(
          raw || `Runner returned HTTP ${response.status}`,
          Date.now() - started,
        );

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return infrastructure(
          "Runner returned malformed JSON",
          Date.now() - started,
        );
      }
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof (parsed as { success?: unknown }).success !== "boolean"
      ) {
        return infrastructure(
          "Runner response is missing a boolean success field",
          Date.now() - started,
        );
      }
      const result = parsed as {
        success: boolean;
        stdout?: unknown;
        stderr?: unknown;
        exitDetail?: unknown;
      };
      if (
        typeof result.stdout !== "string" ||
        typeof result.stderr !== "string"
      ) {
        return infrastructure(
          "Runner response has invalid stdout or stderr fields",
          Date.now() - started,
        );
      }
      const stdout = bounded(result.stdout);
      const stderr = bounded(result.stderr);
      const tests = parseTests(`${stdout}\n${stderr}`);
      return {
        status: classifyFailure(
          request,
          stdout,
          stderr,
          result.success,
          typeof result.exitDetail === "string" ? result.exitDetail : "",
        ),
        stdout,
        stderr,
        diagnostics: parseDiagnostics(stderr),
        durationMs: Date.now() - started,
        ...(tests ? { tests } : {}),
      };
    } catch (error) {
      const timedOut =
        error instanceof DOMException && error.name === "AbortError";
      return {
        ...infrastructure(
          timedOut ? "Runner request timed out" : "Runner request failed",
          Date.now() - started,
        ),
        status: timedOut ? "timeout" : "infrastructure-error",
      };
    } finally {
      clearTimeout(timer);
      release();
    }
  }
}

export class PlaygroundRunner extends HttpRunner {
  protected readonly endpoint = PLAYGROUND_EXECUTE_URL;
  constructor(options: RunnerOptions = {}) {
    super(options);
  }
}

function validatedEndpoint(endpoint: string): string {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error("Runner endpoint must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:")
    throw new Error("Runner endpoint must use HTTPS");
  if (
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "Runner endpoint must be a fixed HTTPS URL without credentials, query, or hash",
    );
  }
  return endpoint;
}

export class RemoteRunner extends HttpRunner {
  protected readonly endpoint: string;
  constructor(options: RemoteRunnerOptions) {
    super(options);
    this.endpoint = validatedEndpoint(options.endpoint);
  }
}

export function createRunner(): RustRunner {
  const endpoint = process.env.RUST_RUNNER_URL;
  return endpoint ? new RemoteRunner({ endpoint }) : new PlaygroundRunner();
}

export { appendHiddenTests, parseDiagnostics, parseTests, requestError };
