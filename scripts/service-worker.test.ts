import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const serviceWorker = readFileSync(
  join(process.cwd(), "public", "sw.js"),
  "utf8",
);

describe("service worker distribution cache", () => {
  it("pre-caches Monaco's distributed notice files with the app shell", async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const cache = { addAll: vi.fn().mockResolvedValue(undefined) };
    const open = vi.fn().mockResolvedValue(cache);
    vm.runInNewContext(serviceWorker, {
      caches: { open },
      self: {
        addEventListener: (type: string, listener: (event: unknown) => void) =>
          listeners.set(type, listener),
        skipWaiting: vi.fn(),
      },
    });
    const waitUntil = vi.fn((promise: Promise<unknown>) => promise);
    listeners.get("install")?.({ waitUntil });
    expect(open).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(cache.addAll).toHaveBeenCalledWith(
      expect.arrayContaining([
        "/monaco/LICENSE",
        "/monaco/ThirdPartyNotices.txt",
      ]),
    );
  });
});

it.each([
  "/monaco/vs/editor-BdtEMBbM.js",
  "/_next/static/test.js",
  "/projects/test.zip",
  "/",
])("ignores a recreated old cache for %s", async (path) => {
  const listeners = new Map<string, (event: unknown) => void>();
  const active = new Map<
    string,
    { ok: boolean; clone: () => unknown; text: string }
  >();
  const fixed = { ok: true, clone: () => fixed, text: "fixed runtime" };
  const cache = {
    match: async (key: string | { url: string }) =>
      active.get(typeof key === "string" ? key : key.url),
    put: async (key: string | { url: string }, value: typeof fixed) =>
      active.set(typeof key === "string" ? key : key.url, value),
  };
  vm.runInNewContext(serviceWorker, {
    URL,
    fetch: async () => fixed,
    caches: {
      open: async () => cache,
      match: async () => ({ text: "vulnerable old runtime" }),
    },
    self: {
      location: { origin: "https://workshop.test" },
      addEventListener: (type: string, fn: (event: unknown) => void) =>
        listeners.set(type, fn),
    },
  });
  let response: Promise<typeof fixed> | undefined;
  listeners.get("fetch")?.({
    request: {
      url: `https://workshop.test${path}`,
      method: "GET",
      mode: path === "/" ? "navigate" : "cors",
    },
    respondWith: (value: Promise<typeof fixed>) => {
      response = value;
    },
  });
  expect((await response)?.text).toBe("fixed runtime");
});

it("uses only the active app shell for offline navigation fallback", async () => {
  const listeners = new Map<string, (event: unknown) => void>();
  vm.runInNewContext(serviceWorker, {
    URL,
    fetch: async () => {
      throw new Error("offline");
    },
    caches: {
      open: async () => ({ match: async () => "active shell" }),
      match: async () => "stale shell",
    },
    self: {
      location: { origin: "https://workshop.test" },
      addEventListener: (type: string, listener: (event: unknown) => void) =>
        listeners.set(type, listener),
    },
  });
  let response: Promise<string> | undefined;
  listeners.get("fetch")?.({
    request: { url: "https://workshop.test/", method: "GET", mode: "navigate" },
    respondWith: (value: Promise<string>) => {
      response = value;
    },
  });
  expect(await response).toBe("active shell");
});
