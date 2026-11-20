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
  type SaveAnnouncementText = Extract<
    SaveAnnouncementEvent,
    { type: "message" }
  >["text"];
  const loading = "Wczytywanie…";
  const saving = "Zapisywanie…";
  const saved = "Zapisano na tym urządzeniu";
  let current: SaveStatusInput = { saveStatus: loading, storageError: null };
  let previousStatus: string | null = loading;
  let initialTransition = true;
  let burstToken = 0;
  let pendingTimer: TimerHandle | null = null;
  let settledTimer: TimerHandle | null = null;
  let errorClearTimer: TimerHandle | null = null;
  let liveAnnouncement: SaveAnnouncementText | null = null;
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

  function cancelErrorClear(): void {
    if (errorClearTimer === null) return;
    cancel(errorClearTimer);
    errorClearTimer = null;
  }

  function emitClear(): void {
    liveAnnouncement = null;
    emit({ type: "clear" });
  }

  function emitMessage(text: SaveAnnouncementText): void {
    liveAnnouncement = text;
    emit({ type: "message", text });
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
      emitMessage(saving);
    }, 0);
  }

  function scheduleSettledMessage(token: number): void {
    settledTimer = schedule(() => {
      settledTimer = null;
      if (!hasCurrentStatus(saved, token)) return;
      emitMessage(saved);
    }, 0);
  }

  function armPending(token: number): void {
    pendingTimer = schedule(() => {
      pendingTimer = null;
      if (!hasCurrentStatus(saving, token)) return;
      emitClear();
      if (hasCurrentStatus(saving, token)) schedulePendingMessage(token);
    }, 750);
  }

  function armSettled(token: number): void {
    settledTimer = schedule(() => {
      settledTimer = null;
      if (!hasCurrentStatus(saved, token)) return;
      emitClear();
      if (hasCurrentStatus(saved, token)) scheduleSettledMessage(token);
    }, 1_000);
  }

  function scheduleErrorClear(token: number): void {
    errorClearTimer = schedule(() => {
      errorClearTimer = null;
      if (
        disposed ||
        burstToken !== token ||
        !current.storageError ||
        liveAnnouncement === null
      )
        return;
      emitClear();
    }, 0);
  }

  function update(input: SaveStatusInput): void {
    if (disposed) return;
    current = input;
    const hasError = Boolean(input.storageError);
    if (hasError) {
      cancelPending();
      cancelSettled();
      cancelErrorClear();
      burstToken += 1;
      previousStatus = input.saveStatus;
      if (liveAnnouncement !== null) scheduleErrorClear(burstToken);
      return;
    }

    cancelErrorClear();
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
    cancelErrorClear();
  }

  return { update, dispose };
}
