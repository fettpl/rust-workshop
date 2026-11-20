import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { deleteDB, openDB } from "idb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "./state";

let storage: typeof import("./storage");

async function writeRaw(value: unknown) {
  const database = await openDB(storage.STATE_DATABASE, 1, {
    upgrade(db) {
      db.createObjectStore(storage.STATE_STORE);
    },
  });
  await database.put(storage.STATE_STORE, value, "current");
  database.close();
}

async function readRaw() {
  const database = await openDB(storage.STATE_DATABASE, 1);
  try {
    return await database.get(storage.STATE_STORE, "current");
  } finally {
    database.close();
  }
}

describe("IndexedDB storage", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.resetModules();
    storage = await import("./storage");
  });

  it("round trips state and returns null only when no state exists", async () => {
    expect(await storage.loadState()).toBeNull();
    const state = createInitialState();
    await storage.saveState(state);
    expect(await storage.loadState()).toEqual(state);
  });

  it("retries opening IndexedDB after an asynchronous open failure", async () => {
    const incompatible = await openDB(storage.STATE_DATABASE, 2);
    incompatible.close();
    await expect(storage.loadState()).rejects.toThrow(/wczytać/);
    await deleteDB(storage.STATE_DATABASE);
    expect(await storage.loadState()).toBeNull();
    const state = createInitialState();
    await storage.saveState(state);
    expect(await readRaw()).toEqual(state);
  });

  it("refuses a stale tab save and permits deliberate replacement and continued edits", async () => {
    const initial = createInitialState();
    await storage.saveState(initial);
    await storage.loadState();
    vi.resetModules();
    const otherTab = await import("./storage");
    await otherTab.loadState();
    const first = { ...initial, notes: { personal: "first tab draft" } };
    await storage.saveState(first);
    const second = { ...initial, notes: { personal: "second tab draft" } };
    await expect(otherTab.saveState(second)).rejects.toThrow(/innej karcie/);
    expect(await readRaw()).toEqual(first);
    await otherTab.saveState(second, { replace: true });
    const continued = {
      ...second,
      notes: { personal: "continued imported draft" },
    };
    await otherTab.saveState(continued);
    expect(await readRaw()).toEqual(continued);
    await expect(storage.saveState(first)).rejects.toThrow(/innej karcie/);
    expect(await storage.loadState()).toEqual(continued);
    await storage.saveState({
      ...continued,
      notes: { personal: "after reload" },
    });
    expect((await readRaw()).notes.personal).toBe("after reload");
  });

  it("atomically allows only one of two tabs saving the same baseline", async () => {
    await storage.loadState();
    vi.resetModules();
    const otherTab = await import("./storage");
    await otherTab.loadState();
    const first = {
      ...createInitialState(),
      notes: { personal: "first racing tab" },
    };
    const second = {
      ...createInitialState(),
      notes: { personal: "second racing tab" },
    };
    const results = await Promise.allSettled([
      storage.saveState(first),
      otherTab.saveState(second),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(await readRaw()).toEqual(first);
  });

  it("requires a deliberate replacement before overwriting an unread record", async () => {
    const future = { schemaVersion: 99, notes: { personal: "future draft" } };
    await writeRaw(future);
    const replacement = createInitialState();
    await expect(storage.saveState(replacement)).rejects.toThrow(
      /innej karcie/,
    );
    expect(await readRaw()).toEqual(future);
    await storage.saveState(replacement, { replace: true });
    expect(await readRaw()).toEqual(replacement);
  });

  it("serializes overlapping ordinary writes without a false conflict", async () => {
    const state = createInitialState();
    await storage.loadState();
    await Promise.all([
      storage.saveState({ ...state, notes: { personal: "first" } }),
      storage.saveState({ ...state, notes: { personal: "last" } }),
    ]);
    expect((await readRaw()).notes.personal).toBe("last");
  });

  it.each([
    { schemaVersion: 99, notes: { personal: "keep future data" } },
    { schemaVersion: 3, notes: { personal: "keep malformed data" } },
  ])(
    "rejects unreadable state without changing its raw record",
    async (raw) => {
      await writeRaw(raw);
      await expect(storage.loadState()).rejects.toThrow(/pozostały bez zmian/);
      expect(await readRaw()).toEqual(raw);
    },
  );

  it("rejects an invalid replacement without changing persisted state", async () => {
    const state = createInitialState();
    await storage.saveState(state);
    await expect(
      storage.saveState({ ...state, schemaVersion: 99 } as never),
    ).rejects.toThrow();
    expect(await readRaw()).toEqual(state);
  });
});
