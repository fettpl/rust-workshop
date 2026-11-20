import type { RunRequest, RustRunner } from "@/domain/types";
import { createRunner, RUNNER_LIMITS } from "@/runner";

let runner: RustRunner | undefined;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function failure(message: string, status: number): Response {
  return json(
    {
      status: "infrastructure-error",
      stdout: "",
      stderr: message,
      diagnostics: [],
      durationMs: 0,
    },
    status,
  );
}

async function readRequestBody(
  request: Request,
  limit: number,
): Promise<string | undefined> {
  if (!request.body) return "";
  const reader = request.body.getReader();
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

function isRunRequest(value: unknown): value is RunRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Partial<RunRequest>;
  return (
    typeof request.code === "string" &&
    request.code.length > 0 &&
    (request.mode === "run" || request.mode === "test") &&
    (request.tests === undefined || typeof request.tests === "string")
  );
}

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType))
    return failure("Content-Type must be application/json", 415);
  const origin = request.headers.get("origin");
  // Next may canonicalize request.url to localhost. Host preserves the browser's
  // authority; browsers cannot forge it. Do not trust forwarded-host input.
  const requestUrl = new URL(request.url);
  const expectedHost = request.headers.get("host") ?? requestUrl.host;
  if (origin) {
    try {
      const source = new URL(origin);
      if (
        !["http:", "https:"].includes(source.protocol) ||
        source.host !== expectedHost
      )
        return failure("Origin is not allowed", 403);
    } catch {
      return failure("Origin is not allowed", 403);
    }
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > RUNNER_LIMITS.maxRequestBytes)
    return failure("Request is too large", 413);

  let body: unknown;
  try {
    const text = await readRequestBody(request, RUNNER_LIMITS.maxRequestBytes);
    if (text === undefined) return failure("Request is too large", 413);
    body = JSON.parse(text);
  } catch {
    return failure("Request body must be valid JSON", 400);
  }
  if (!isRunRequest(body))
    return failure(
      "Request must include non-empty code and mode run or test",
      400,
    );

  const selected = runner ?? (runner = createRunner());
  return json(await selected.run(body));
}
