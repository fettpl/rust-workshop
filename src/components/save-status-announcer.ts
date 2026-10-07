export type SaveAnnouncementEvent =
  | { type: "clear" }
  | { type: "message"; text: "Zapisywanie…" | "Zapisano na tym urządzeniu" };

export type SaveStatusInput = {
  saveStatus: string;
  storageError: string | null;
};

export type SaveStatusAnnouncer = {
  update(input: SaveStatusInput): void;
  dispose(): void;
};

export function createSaveStatusAnnouncer(
  emit: (event: SaveAnnouncementEvent) => void,
  schedule: (
    callback: () => void,
    delayMs: number,
  ) => ReturnType<typeof setTimeout> = (callback, delayMs) =>
    setTimeout(callback, delayMs),
  cancel: (handle: ReturnType<typeof setTimeout>) => void = (handle) =>
    clearTimeout(handle),
): SaveStatusAnnouncer {
  type TimerHandle = ReturnType<typeof setTimeout>;
  const loading = "Wczytywanie…";
  const saving = "Zapisywanie…";
  const saved = "Zapisano na tym urządzeniu";
  let current: SaveStatusInput = { saveStatus: loading, storageError: null };
  let previousStatus: string | null = loading;
  let initialTransition = true;
  let burstToken = 0;
  let pendingTimer: TimerHandle | null = null;
  let settledTimer: TimerHandle | null = null;
  let disposed = false;

  function cancelPending(): void {
    if (pendingTimer === null) return;
    cancel(pendingTimer);
    pendingTimer = null;
  }

  function cancelSettled(): void {
    if (settledTimer === null) return;
    cancel(settledTimer);
    settledTimer = null;
  }

  function hasCurrentStatus(status: string, token: number): boolean {
    return (
      !disposed &&
      burstToken === token &&
      current.saveStatus === status &&
      !current.storageError
    );
  }

  function schedulePendingMessage(token: number): void {
    pendingTimer = schedule(() => {
      pendingTimer = null;
      if (!hasCurrentStatus(saving, token)) return;
      emit({ type: "message", text: saving });
    }, 0);
  }

  function scheduleSettledMessage(token: number): void {
    settledTimer = schedule(() => {
      settledTimer = null;
      if (!hasCurrentStatus(saved, token)) return;
      emit({ type: "message", text: saved });
    }, 0);
  }

  function armPending(token: number): void {
    pendingTimer = schedule(() => {
      pendingTimer = null;
      if (!hasCurrentStatus(saving, token)) return;
      emit({ type: "clear" });
      if (hasCurrentStatus(saving, token)) schedulePendingMessage(token);
    }, 750);
  }

  function armSettled(token: number): void {
    settledTimer = schedule(() => {
      settledTimer = null;
      if (!hasCurrentStatus(saved, token)) return;
      emit({ type: "clear" });
      if (hasCurrentStatus(saved, token)) scheduleSettledMessage(token);
    }, 1_000);
  }

  function update(input: SaveStatusInput): void {
    if (disposed) return;
    current = input;
    const hasError = Boolean(input.storageError);
    if (hasError) {
      cancelPending();
      cancelSettled();
      burstToken += 1;
      previousStatus = input.saveStatus;
      return;
    }

    if (input.saveStatus === saving) {
      initialTransition = false;
      burstToken += 1;
      cancelPending();
      cancelSettled();
      armPending(burstToken);
      previousStatus = input.saveStatus;
      return;
    }

    if (input.saveStatus === saved) {
      const suppressInitial = initialTransition && previousStatus === loading;
      initialTransition = false;
      cancelPending();
      if (!suppressInitial) {
        cancelSettled();
        armSettled(burstToken);
      }
      previousStatus = input.saveStatus;
      return;
    }

    previousStatus = input.saveStatus;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    burstToken += 1;
    cancelPending();
    cancelSettled();
  }

  return { update, dispose };
}
