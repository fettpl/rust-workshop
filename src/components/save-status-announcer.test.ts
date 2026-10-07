import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSaveStatusAnnouncer,
  type SaveAnnouncementEvent,
} from "./save-status-announcer";

function harness() {
  const events: SaveAnnouncementEvent[] = [];
  const announcer = createSaveStatusAnnouncer((event) => events.push(event));
  return { announcer, events };
}

afterEach(() => vi.useRealTimers());

describe("createSaveStatusAnnouncer", () => {
  it("suppresses the initial loading-to-saved transition", () => {
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    expect(events).toEqual([]);
    announcer.dispose();
  });

  it("announces one completion after a fast save burst without pending speech", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    vi.advanceTimersByTime(999);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual([{ type: "clear" }]);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisano na tym urządzeniu" },
    ]);
    announcer.dispose();
  });

  it("announces pending and settled text once for a long save", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(750);
    expect(events).toEqual([{ type: "clear" }]);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
    ]);
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    vi.advanceTimersByTime(999);
    expect(events).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
    ]);
    await vi.runOnlyPendingTimersAsync();
    expect(events.slice(2)).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisano na tym urządzeniu" },
    ]);
    announcer.dispose();
  });

  it("re-arms identical saved text for two separate long bursts", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    for (let burst = 0; burst < 2; burst += 1) {
      announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
      vi.advanceTimersByTime(750);
      expect(events.at(-1)).toEqual({ type: "clear" });
      await vi.runOnlyPendingTimersAsync();
      announcer.update({
        saveStatus: "Zapisano na tym urządzeniu",
        storageError: null,
      });
      vi.advanceTimersByTime(1_000);
      expect(events.at(-1)).toEqual({ type: "clear" });
      await vi.runOnlyPendingTimersAsync();
      expect(events.slice(-4)).toEqual([
        { type: "clear" },
        { type: "message", text: "Zapisywanie…" },
        { type: "clear" },
        { type: "message", text: "Zapisano na tym urządzeniu" },
      ]);
    }
    expect(
      events.filter(
        (event) =>
          event.type === "message" &&
          event.text === "Zapisano na tym urządzeniu",
      ),
    ).toHaveLength(2);
    announcer.dispose();
  });

  it("cancels an armed settled timer and resets it when a newer save begins", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(750);
    await vi.runOnlyPendingTimersAsync();
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    vi.advanceTimersByTime(500);
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(749);
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
    ]);
    vi.advanceTimersByTime(1);
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
    ]);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
    ]);
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    vi.advanceTimersByTime(1_000);
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
    ]);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
      { type: "clear" },
      { type: "message", text: "Zapisano na tym urządzeniu" },
    ]);
    announcer.dispose();
  });

  it("cancels a stale zero-delay message when a newer burst starts after clear", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(750);
    expect(events).toEqual([{ type: "clear" }]);
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual([{ type: "clear" }]);
    vi.advanceTimersByTime(750);
    expect(events).toEqual([{ type: "clear" }, { type: "clear" }]);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([
      { type: "clear" },
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
    ]);
    announcer.dispose();
  });

  it("cancels pending and re-armed callbacks on dispose", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(750);
    expect(events).toEqual([{ type: "clear" }]);
    announcer.dispose();
    await vi.runOnlyPendingTimersAsync();
    vi.advanceTimersByTime(5_000);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([{ type: "clear" }]);
  });

  it("cancels the next-task pending message when an error arrives first", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(750);
    announcer.update({
      saveStatus: "Zapisywanie…",
      storageError: "Nie udało się zapisać.",
    });
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([{ type: "clear" }]);
    announcer.dispose();
  });

  it("cancels an armed settled-success timer when a storage error arrives", async () => {
    vi.useFakeTimers();
    const { announcer, events } = harness();
    announcer.update({ saveStatus: "Wczytywanie…", storageError: null });
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    announcer.update({ saveStatus: "Zapisywanie…", storageError: null });
    vi.advanceTimersByTime(750);
    await vi.runOnlyPendingTimersAsync();
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: null,
    });
    vi.advanceTimersByTime(500);
    announcer.update({
      saveStatus: "Zapisano na tym urządzeniu",
      storageError: "Nie udało się zapisać.",
    });
    vi.advanceTimersByTime(2_000);
    await vi.runOnlyPendingTimersAsync();
    expect(events).toEqual([
      { type: "clear" },
      { type: "message", text: "Zapisywanie…" },
    ]);
    announcer.dispose();
  });
});
