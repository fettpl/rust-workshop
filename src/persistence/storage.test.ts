import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "./state";
import { loadState, saveState } from "./storage";

describe("IndexedDB storage", () => {
  beforeEach(async () => {
    const databases = await indexedDB.databases();
    for (const database of databases)
      if (database.name) indexedDB.deleteDatabase(database.name);
  });

  it("round trips state and returns null only when no state exists", async () => {
    expect(await loadState()).toBeNull();
    const state = createInitialState();
    await saveState(state);
    expect(await loadState()).toEqual(state);
  });
});
