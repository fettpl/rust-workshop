export type OfflineEvidenceEvent = Readonly<{
  lessonId?: unknown;
  stepId?: unknown;
  kind?: unknown;
  passed?: unknown;
  gate?: unknown;
  evaluator?: unknown;
  evidenceVersion?: unknown;
  [key: string]: unknown;
}>;

export function findFreshNeutralExposure(
  events: readonly OfflineEvidenceEvent[],
  baselineLength: number,
  lessonId: string,
  stepId: string,
): OfflineEvidenceEvent | undefined {
  if (
    !Number.isInteger(baselineLength) ||
    baselineLength < 0 ||
    baselineLength > events.length
  ) {
    return undefined;
  }

  return events.slice(baselineLength).find(
    (event) =>
      event.lessonId === lessonId &&
      event.stepId === stepId &&
      event.kind === "exposure" &&
      event.passed === true &&
      event.gate === false &&
      event.evaluator === undefined &&
      event.evidenceVersion === undefined,
  );
}

export function hasFreshNeutralExposureSuffix(
  events: readonly OfflineEvidenceEvent[],
  baselineLength: number,
  lessonId: string,
  stepId: string,
): boolean {
  if (
    !Number.isInteger(baselineLength) ||
    baselineLength < 0 ||
    baselineLength > events.length
  ) {
    return false;
  }

  const appended = events.slice(baselineLength);
  return (
    appended.length > 0 &&
    appended.every(
      (event) =>
        event.kind === "exposure" &&
        event.passed === true &&
        event.gate === false &&
        event.evaluator === undefined &&
        event.evidenceVersion === undefined,
    ) &&
    findFreshNeutralExposure(events, baselineLength, lessonId, stepId) !==
      undefined
  );
}
