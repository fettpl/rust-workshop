import { describe, expect, it } from "vitest";
import {
  createInitialState,
  createStepProgress,
  exportState,
  importState,
  migrateState,
  stepKey,
} from "./state";

describe("state persistence", () => {
  it("creates the exact dashboard resume defaults and stable step keys", () => {
    const state = createInitialState();
    expect(state.schemaVersion).toBe(3);
    expect(state.onboarding).not.toHaveProperty("background");
    expect(state.resume).toMatchObject({
      view: "dashboard",
      lessonId: "first-program",
      stepIndex: 0,
      panel: "lesson",
    });
    expect(createStepProgress("fn main() {}").code).toBe("fn main() {}");
    expect(stepKey("memory", "move")).toBe("memory:move");
  });

  it("migrates v2 state while preserving progress and removing the legacy onboarding background", () => {
    const migrated = migrateState({
      schemaVersion: 2,
      appVersion: "0.1.0",
      updatedAt: 20,
      onboarding: {
        completed: true,
        name: "Ada",
        background: "python",
        minutes: 20,
      },
      diagnostic: {
        completed: true,
        answers: { q1: "a" },
        score: 1,
        recommendation: "memory",
      },
      resume: {
        view: "review",
        lessonId: "memory",
        stepIndex: 2,
        panel: "output",
        focus: true,
      },
      steps: {
        "memory:move": {
          code: 'let x = String::from("draft");',
          answer: "move",
          hints: 2,
          revealed: true,
          completed: true,
          attempts: [
            {
              at: 11,
              code: "draft",
              passed: true,
              feedback: "good",
            },
          ],
          rubricChecks: ["ownership"],
          traceIndex: 1,
        },
      },
      events: [
        {
          id: "event-1",
          conceptIds: ["ownership"],
          lessonId: "memory",
          stepId: "move",
          kind: "fix",
          passed: true,
          hints: 1,
          revealed: true,
          at: 12,
          delayed: true,
          gate: true,
          evaluator: "compilation",
        },
      ],
      mastery: {
        ownership: { level: "practiced", reason: "fix", updatedAt: 13 },
      },
      review: [
        {
          conceptId: "ownership",
          dueAt: 100,
          intervalDays: 2,
          attempts: 1,
          reason: "fix",
          lastReviewedAt: 14,
        },
      ],
      reviewSession: {
        conceptId: "ownership",
        mode: "challenge",
        sessionId: "session-1",
        startedAt: 15,
        wasDue: true,
      },
      notes: { memory: "keep me" },
      bookmarks: ["memory:move"],
      ratings: [{ conceptId: "ownership", rating: "good", at: 16 }],
      settings: { theme: "dark", editorFontSize: 18, accessibleEditor: true },
    });

    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.onboarding).toEqual({
      completed: true,
      name: "Ada",
      minutes: 20,
    });
    expect(migrated.steps["memory:move"]).toMatchObject({
      code: 'let x = String::from("draft");',
      hints: 2,
      completed: true,
    });
    expect(migrated.events[0]).toMatchObject({ id: "event-1", gate: true });
    expect(migrated.reviewSession?.sessionId).toBe("session-1");
    expect(migrated.notes).toEqual({ memory: "keep me" });
    expect(migrated.settings).toEqual({
      theme: "dark",
      editorFontSize: 18,
      accessibleEditor: true,
    });
  });

  it("migrates v1 state without losing drafts, notes or bookmarks", () => {
    const migrated = migrateState({
      schemaVersion: 1,
      appVersion: "0.0.1",
      updatedAt: 10,
      onboarding: {
        completed: true,
        name: "Ada",
        background: "python",
        minutes: 20,
      },
      diagnostic: {
        completed: true,
        answers: { q1: "a" },
        score: 1,
        recommendation: "memory",
      },
      resume: { view: "lesson", lessonId: "memory", stepIndex: 1 },
      steps: {
        "memory:move": {
          code: 'let x = String::from("draft");',
          answer: "move",
          hints: 1,
          revealed: false,
          completed: false,
          attempts: [],
          rubricChecks: [],
          traceIndex: 0,
        },
      },
      events: [],
      mastery: {},
      review: [],
      notes: { memory: "keep me" },
      bookmarks: ["memory:move"],
      settings: { theme: "dark", accessibleEditor: true },
    });
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.steps["memory:move"].code).toContain("draft");
    expect(migrated.notes).toEqual({ memory: "keep me" });
    expect(migrated.bookmarks).toEqual(["memory:move"]);
    expect(migrated.resume.panel).toBe("lesson");
    expect(migrated.onboarding).not.toHaveProperty("background");

    const exported = exportState(migrated);
    expect(exported).not.toContain("background");
    expect(importState(exported)).toEqual(migrated);
  });

  it("round trips a v3 export without legacy onboarding fields", () => {
    const state = createInitialState();
    const exported = exportState(state);
    expect(JSON.parse(exported)).toMatchObject({ schemaVersion: 3 });
    expect(exported).not.toContain("background");
    const imported = importState(exported);
    expect(imported).toEqual(state);
  });

  it("preserves an existing ownership resume when the new course starts with foundations", () => {
    const old = createInitialState();
    old.resume = {
      view: "lesson",
      lessonId: "memory-intro",
      stepIndex: 1,
      panel: "code",
      focus: true,
    };
    old.steps["memory-intro:memory-run"] = {
      ...createStepProgress('fn main() { println!("kept"); }'),
      hints: 1,
    };
    old.settings.editorFontSize = 14;
    expect(importState(exportState(old))).toEqual(old);
    expect(createInitialState().resume.lessonId).toBe("first-program");
  });

  it("rejects malformed or future imports", () => {
    const state = createInitialState();
    expect(() => importState('{"schemaVersion":99}')).toThrow(
      /nieobsług|schemat|wersj/i,
    );
    expect(() =>
      importState(
        JSON.stringify({
          schemaVersion: 3,
          appVersion: "x",
          exportedAt: 1,
          state: { ...state, future: true },
        }),
      ),
    ).toThrow();
    expect(() =>
      importState(
        JSON.stringify({
          schemaVersion: 3,
          appVersion: "x",
          exportedAt: 1,
          state: { ...state, notes: { __proto__: "polluted" } },
        }),
      ),
    ).toThrow();
    expect(() =>
      importState(
        JSON.stringify({
          schemaVersion: 3,
          appVersion: "x",
          exportedAt: "yesterday",
          state,
        }),
      ),
    ).toThrow(/date|data|ISO/i);
    expect(() =>
      importState(
        JSON.stringify({
          schemaVersion: 1,
          appVersion: "x",
          exportedAt: new Date().toISOString(),
          state: { ...state, schemaVersion: 3 },
        }),
      ),
    ).toThrow(/wersj/i);
  });
});
