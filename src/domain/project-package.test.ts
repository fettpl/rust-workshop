import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import type { ProjectPackage } from "./types";
import {
  validateProjectPackage,
  projectFiles,
  revealProjectSolution,
} from "./project-package";
import { buildProjectArchive } from "../../scripts/project-archive";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";
import { lessons } from "../content/course";

const fixture: ProjectPackage = {
  id: "example-package",
  title: "Przykład",
  description: "Projekt Cargo",
  instructions: ["cargo test"],
  revealStepRefs: [
    { lessonId: "todo-session-project", stepId: "session-blank" },
    { lessonId: "todo-session-project", stepId: "session-debug" },
  ],
  files: [
    {
      path: "Cargo.toml",
      starter:
        '[package]\nname = "example-package"\nversion = "0.1.0"\nedition = "2024"\n',
    },
    {
      path: "src/lib.rs",
      starter: "pub fn title() {}",
      solution: 'pub fn title() -> &\'static str { "żółć 🙂" }',
    },
    { path: "README.md", starter: "Uruchom cargo test.\n" },
  ],
};

describe("downloadable project packages", () => {
  it("exports exact UTF-8 files under one directory, with a distinct starter and reference", () => {
    const starter = unzipSync(buildProjectArchive(fixture, "starter"));
    const solution = unzipSync(buildProjectArchive(fixture, "solution"));
    expect(Object.keys(solution).sort()).toEqual(
      fixture.files.map((f) => `${fixture.id}/${f.path}`).sort(),
    );
    for (const file of fixture.files) {
      expect(strFromU8(starter[`${fixture.id}/${file.path}`])).toBe(
        file.starter,
      );
      expect(strFromU8(solution[`${fixture.id}/${file.path}`])).toBe(
        file.solution ?? file.starter,
      );
    }
    expect(projectFiles(fixture, "starter")["src/lib.rs"]).not.toContain(
      "żółć",
    );
  });

  it("rejects paths that escape, collide, or cannot form the declared package", () => {
    for (const path of [
      "../secrets",
      "/absolute",
      "src/../../escape",
      "src\\escape",
      "src//lib.rs",
    ]) {
      const broken = {
        ...fixture,
        files: [...fixture.files, { path, starter: "x" }],
      };
      expect(validateProjectPackage(broken).length, path).toBeGreaterThan(0);
      expect(() => buildProjectArchive(broken, "starter")).toThrow();
    }
    expect(
      validateProjectPackage({
        ...fixture,
        files: [...fixture.files, { path: "cargo.toml", starter: "x" }],
      }),
    ).not.toEqual([]);
    expect(
      validateProjectPackage({
        ...fixture,
        files: [...fixture.files, { path: "src", starter: "x" }],
      }),
    ).not.toEqual([]);
    expect(validateProjectPackage({ ...fixture, files: [] })).not.toEqual([]);
    for (const [original, replacement] of [
      ["Cargo.toml", "cargo.toml"],
      ["src/lib.rs", "SRC/lib.rs"],
    ]) {
      expect(
        validateProjectPackage({
          ...fixture,
          files: fixture.files.map((file) => ({
            ...file,
            path: file.path === original ? replacement : file.path,
          })),
        }),
      ).not.toEqual([]);
    }
    expect(validateProjectPackage(fixture)).toEqual([]);
  });

  it("records help for related tasks while preserving drafts, completion and earlier independent evidence", () => {
    const lesson = lessons.find((l) => l.id === "todo-session-project")!;
    const key = stepKey(lesson.id, "session-blank");
    const state = createInitialState();
    state.steps[key] = {
      ...createStepProgress("my unfinished draft"),
      completed: true,
    };
    const unchanged = JSON.stringify(state);
    const next = revealProjectSolution(state, fixture, lessons, 1234);
    expect(JSON.stringify(state)).toBe(unchanged);
    expect(next.steps[key]).toMatchObject({
      code: "my unfinished draft",
      completed: true,
      revealed: true,
    });
    expect(
      next.events.every((event) => event.kind === "exposure" && event.revealed),
    ).toBe(true);
    expect(next.events).toHaveLength(2);
    expect(
      next.steps[stepKey(lesson.id, "session-run-gate")]?.revealed,
    ).not.toBe(true);
    expect(next.mastery[lesson.conceptIds[0]]?.level).not.toBe("understood");
    expect(
      revealProjectSolution(next, fixture, lessons, 5678).events,
    ).toHaveLength(next.events.length);
    expect(
      Object.keys(next.steps).every((id) => id.startsWith(`${lesson.id}:`)),
    ).toBe(true);
  });
});
