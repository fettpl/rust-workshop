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
