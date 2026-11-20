import { describe, expect, it, vi } from "vitest";
import type { RunResult } from "@/domain/types";

const { run } = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/runner", async () => {
  const actual = await vi.importActual<typeof import("@/runner")>("@/runner");
  return { ...actual, createRunner: () => ({ run }) };
});

import { POST } from "./route";

describe("POST /api/run", () => {
  it("returns the typed runner result", async () => {
    run.mockResolvedValueOnce({
      status: "success",
      stdout: "ok\n",
      stderr: "",
      diagnostics: [],
      durationMs: 4,
    } satisfies RunResult);

    const response = await POST(
      new Request("http://localhost:3000/api/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          code: 'fn main() { println!("ok"); }',
          mode: "run",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "success",
      stdout: "ok\n",
    });
  });

  it("accepts the browser Host when Next uses an internal request URL", async () => {
    run.mockResolvedValueOnce({
      status: "success",
      stdout: "ok\n",
      stderr: "",
      diagnostics: [],
      durationMs: 1,
    } satisfies RunResult);
    const response = await POST(
      new Request("http://localhost:3000/api/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
        },
        body: JSON.stringify({ code: "fn main() {}", mode: "run" }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("returns structured infrastructure results for non JSON and cross origin requests", async () => {
    run.mockClear();

    const contentType = await POST(
      new Request("http://localhost:3000/api/run", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "{}",
      }),
    );
    const origin = await POST(
      new Request("http://localhost:3000/api/run", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
        },
        body: JSON.stringify({ code: "fn main() {}", mode: "run" }),
      }),
    );

    expect(contentType.status).toBe(415);
    expect(await contentType.json()).toMatchObject({
      status: "infrastructure-error",
    });
    expect(origin.status).toBe(403);
    expect(await origin.json()).toMatchObject({
      status: "infrastructure-error",
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects malformed requests before the runner boundary", async () => {
    run.mockClear();
    const response = await POST(
      new Request("http://localhost:3000/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "", mode: "compile" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      status: "infrastructure-error",
    });
    expect(run).not.toHaveBeenCalled();
  });
});
