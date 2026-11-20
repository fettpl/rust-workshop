import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import type { ProjectPackage } from "./types";
import {
  validateProjectPackage,
  projectFiles,
  revealProjectPackageVariant,
  revealProjectSolution,
} from "./project-package";
import {
  archiveApacheExceptionPackageIds,
  buildProjectArchive,
} from "../../scripts/project-archive";
import {
  createInitialState,
  createStepProgress,
  stepKey,
} from "../persistence/state";
import { lessons } from "../content/course";
import { projects } from "../content/course";

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

let archiveRepositoryRoot = "";

beforeAll(() => {
  archiveRepositoryRoot = mkdtempSync(
    join("/tmp", "rust-workshop-project-archive-"),
  );
  mkdirSync(join(archiveRepositoryRoot, "docs"));
  writeFileSync(join(archiveRepositoryRoot, "LICENSE"), "MIT fixture text\n");
  writeFileSync(
    join(archiveRepositoryRoot, "LICENSE-CONTENT"),
    "CC BY fixture text\n",
  );
  writeFileSync(
    join(archiveRepositoryRoot, "THIRD-PARTY-NOTICES.md"),
    "Third-party fixture text\n",
  );
  writeFileSync(
    join(archiveRepositoryRoot, "docs", "licensing.md"),
    "# Scope fixture\n",
  );
});

afterAll(() => rmSync(archiveRepositoryRoot, { recursive: true, force: true }));

function archive(project: ProjectPackage, variant: "starter" | "solution") {
  return buildProjectArchive(project, variant, {
    repositoryRoot: archiveRepositoryRoot,
  });
}

describe("downloadable project packages", () => {
  it("preserves every authored payload and applicable notice in both variants", () => {
    const packages = projects.flatMap((project) =>
      project.package ? [project.package] : [],
    );
    expect(packages).toHaveLength(16);
    expect(
      packages.filter(({ id }) => id !== "file-schema-evolution-workshop"),
    ).toHaveLength(15);
    expect(
      packages.filter((project) =>
        archiveApacheExceptionPackageIds.includes(
          project.id as (typeof archiveApacheExceptionPackageIds)[number],
        ),
      ),
    ).toHaveLength(4);

    for (const project of packages) {
      for (const variant of ["starter", "solution"] as const) {
        const first = buildProjectArchive(project, variant);
        const second = buildProjectArchive(project, variant);
        expect(
          Buffer.from(first).equals(Buffer.from(second)),
          `${project.id}/${variant}`,
        ).toBe(true);
        const entries = unzipSync(first);
        const authored = projectFiles(project, variant);
        const includesApache = archiveApacheExceptionPackageIds.includes(
          project.id as (typeof archiveApacheExceptionPackageIds)[number],
        );
        expect(
          Object.hasOwn(entries, `${project.id}/LICENSE-APACHE`),
          `${project.id}/${variant} Apache notice policy`,
        ).toBe(includesApache);
        const expectedPaths = [
          ...Object.keys(authored),
          "LICENSE",
          "LICENSE-CONTENT",
          "LICENSE-SCOPE.md",
          "THIRD-PARTY-NOTICES.md",
          ...(includesApache ? ["LICENSE-APACHE"] : []),
        ].map((path) => `${project.id}/${path}`);
        expect(
          Object.keys(entries).sort(),
          `${project.id}/${variant} names`,
        ).toEqual(expectedPaths.sort());
        for (const [path, content] of Object.entries(authored))
          expect(
            strFromU8(entries[`${project.id}/${path}`]),
            `${project.id}/${variant}/${path}`,
          ).toBe(content);
        expect(strFromU8(entries[`${project.id}/LICENSE`])).toBe(
          readFileSync(join(process.cwd(), "LICENSE"), "utf8"),
        );
        expect(strFromU8(entries[`${project.id}/LICENSE-CONTENT`])).toBe(
          readFileSync(join(process.cwd(), "LICENSE-CONTENT"), "utf8"),
        );
        expect(strFromU8(entries[`${project.id}/THIRD-PARTY-NOTICES.md`])).toBe(
          readFileSync(
            join(process.cwd(), "THIRD-PARTY-NOTICES.md"),
            "utf8",
          ).replaceAll("](docs/licensing.md)", "](LICENSE-SCOPE.md)"),
        );
        if (includesApache)
          expect(strFromU8(entries[`${project.id}/LICENSE-APACHE`])).toBe(
            readFileSync(join(process.cwd(), "LICENSE-APACHE"), "utf8"),
          );

        const scope = strFromU8(entries[`${project.id}/LICENSE-SCOPE.md`]);
        const canonicalScope = readFileSync(
          join(process.cwd(), "docs", "licensing.md"),
          "utf8",
        );
        const expectedScope = canonicalScope
          .replace(
            /\]\((rights-assessment\.md|oss-provenance\.md)(#[^)]*)?\)/g,
            "](https://github.com/fettpl/rust-workshop/blob/main/docs/$1$2)",
          )
          .replace(
            /\]\(\.\.\/(LICENSE|LICENSE-CONTENT|THIRD-PARTY-NOTICES\.md)\)/g,
            "]($1)",
          )
          .replace(
            /\]\(\.\.\/LICENSE-APACHE\)/g,
            includesApache
              ? "](LICENSE-APACHE)"
              : "](https://www.apache.org/licenses/LICENSE-2.0.txt)",
          );
        expect(scope).toBe(expectedScope);
        expect(scope).toContain(
          includesApache
            ? "](LICENSE-APACHE)"
            : "](https://www.apache.org/licenses/LICENSE-2.0.txt)",
        );
        for (const noticePath of [
          "LICENSE-SCOPE.md",
          "THIRD-PARTY-NOTICES.md",
        ]) {
          const notice = strFromU8(entries[`${project.id}/${noticePath}`]);
          for (const match of notice.matchAll(/\]\(([^)]+)\)/g)) {
            const target = match[1];
            if (target.startsWith("http") || target.startsWith("#")) continue;
            expect(
              entries[`${project.id}/${target.split("#")[0]}`],
              `${project.id}/${target}`,
            ).toBeDefined();
          }
        }
      }
    }
  });

  it("archives a virtual workspace with real member roots and no fake root crate", () => {
    const workspace = {
      ...fixture,
      workspaceMembers: ["crates/core", "crates/cli"],
      files: [
        {
          path: "Cargo.toml",
          starter:
            '[workspace]\nmembers = ["crates/core", "crates/cli"]\nresolver = "3"\n',
        },
        {
          path: "crates/core/Cargo.toml",
          starter: '[package]\nname = "core"\nversion = "1.0.0"\n',
        },
        {
          path: "crates/core/src/lib.rs",
          starter: "pub fn answer() -> u8 { 42 }",
        },
        {
          path: "crates/cli/Cargo.toml",
          starter: '[package]\nname = "cli"\nversion = "1.0.0"\n',
        },
        { path: "crates/cli/src/main.rs", starter: "fn main() {}" },
      ],
    };
    expect(validateProjectPackage(workspace)).toEqual([]);
    const archiveEntries = unzipSync(archive(workspace, "starter"));
    expect(Object.keys(archiveEntries)).toHaveLength(9);
    expect(archiveEntries[`${workspace.id}/src/lib.rs`]).toBeUndefined();
    for (const removed of [
      "Cargo.toml",
      "crates/core/Cargo.toml",
      "crates/cli/src/main.rs",
    ]) {
      expect(
        validateProjectPackage({
          ...workspace,
          files: workspace.files.filter((file) => file.path !== removed),
        }),
        removed,
      ).not.toEqual([]);
    }
    for (const members of [
      [],
      ["../escape"],
      ["crates/core", "CRATES/core"],
      ["crates/missing"],
      ["."],
    ]) {
      expect(
        validateProjectPackage({ ...workspace, workspaceMembers: members }),
        JSON.stringify(members),
      ).not.toEqual([]);
    }
  });

  it("exports exact UTF-8 files under one directory, with a distinct starter and reference", () => {
    const starter = unzipSync(archive(fixture, "starter"));
    const solution = unzipSync(archive(fixture, "solution"));
    expect(Object.keys(solution).sort()).toEqual(
      [
        ...fixture.files.map((f) => `${fixture.id}/${f.path}`),
        `${fixture.id}/LICENSE`,
        `${fixture.id}/LICENSE-CONTENT`,
        `${fixture.id}/LICENSE-SCOPE.md`,
        `${fixture.id}/THIRD-PARTY-NOTICES.md`,
      ].sort(),
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
      expect(() => archive(broken, "starter")).toThrow();
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

  it("exposes starter refs alone and deduplicates their union in the solution", () => {
    const packageWithStarterRefs: ProjectPackage = {
      ...fixture,
      starterRevealStepRefs: [
        { lessonId: "todo-session-project", stepId: "session-blank" },
      ],
    };
    const starter = revealProjectPackageVariant(
      createInitialState(),
      packageWithStarterRefs,
      lessons,
      "starter",
      2_000,
    );
    expect(starter.events).toHaveLength(1);
    expect(starter.events[0].stepId).toBe("session-blank");
    expect(
      starter.steps[stepKey("todo-session-project", "session-debug")],
    ).toBeUndefined();

    const solution = revealProjectPackageVariant(
      starter,
      packageWithStarterRefs,
      lessons,
      "solution",
      3_000,
    );
    expect(solution.events).toHaveLength(2);
    expect(solution.events.map((event) => event.stepId).sort()).toEqual([
      "session-blank",
      "session-debug",
    ]);
    expect(
      revealProjectPackageVariant(
        solution,
        packageWithStarterRefs,
        lessons,
        "solution",
        4_000,
      ).events,
    ).toHaveLength(2);
  });
});
