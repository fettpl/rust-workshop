import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ProjectPackage } from "../src/domain/types";
import { buildProjectArchive } from "./project-archive";
import { strFromU8, unzipSync } from "fflate";

const roots: string[] = [];

const fixture: ProjectPackage = {
  id: "archive-fixture",
  title: "Archive fixture",
  description: "A package used to exercise archive distribution notices.",
  instructions: ["cargo test"],
  revealStepRefs: [{ lessonId: "lesson", stepId: "step" }],
  files: [
    { path: "Cargo.toml", starter: "[package]\nname = 'fixture'\n" },
    {
      path: "src/lib.rs",
      starter: "pub fn answer() -> u8 { 1 }\n",
      solution: "pub fn answer() -> u8 { 2 }\n",
    },
  ],
};

function repositoryWithNotices(): string {
  const root = mkdtempSync(join("/tmp", "rust-workshop-archive-test-"));
  roots.push(root);
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "LICENSE"), "MIT fixture text\n");
  writeFileSync(join(root, "LICENSE-CONTENT"), "CC BY fixture text\n");
  writeFileSync(join(root, "LICENSE-APACHE"), "Apache fixture text\n");
  writeFileSync(
    join(root, "THIRD-PARTY-NOTICES.md"),
    "Third-party fixture text\n",
  );
  writeFileSync(join(root, "docs", "licensing.md"), "# Scope fixture\n");
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("project archive distribution notices", () => {
  it("adds exact notices to both variants without changing authored payloads", () => {
    const repositoryRoot = repositoryWithNotices();
    const starter = unzipSync(
      buildProjectArchive(fixture, "starter", { repositoryRoot }),
    );
    const solution = unzipSync(
      buildProjectArchive(fixture, "solution", { repositoryRoot }),
    );
    const expectedPaths = [
      "Cargo.toml",
      "LICENSE",
      "LICENSE-CONTENT",
      "LICENSE-SCOPE.md",
      "THIRD-PARTY-NOTICES.md",
      "src/lib.rs",
    ].map((path) => `${fixture.id}/${path}`);

    expect(Object.keys(starter).sort()).toEqual(expectedPaths.sort());
    expect(Object.keys(solution).sort()).toEqual(expectedPaths.sort());
    for (const path of ["LICENSE", "LICENSE-CONTENT", "LICENSE-SCOPE.md"])
      expect(strFromU8(solution[`${fixture.id}/${path}`])).toBe(
        strFromU8(starter[`${fixture.id}/${path}`]),
      );
    expect(strFromU8(starter[`${fixture.id}/LICENSE`])).toBe(
      "MIT fixture text\n",
    );
    expect(strFromU8(starter[`${fixture.id}/LICENSE-CONTENT`])).toBe(
      "CC BY fixture text\n",
    );
    expect(starter[`${fixture.id}/LICENSE-APACHE`]).toBeUndefined();
    expect(strFromU8(starter[`${fixture.id}/THIRD-PARTY-NOTICES.md`])).toBe(
      "Third-party fixture text\n",
    );
    expect(strFromU8(starter[`${fixture.id}/LICENSE-SCOPE.md`])).toBe(
      "# Scope fixture\n",
    );
    expect(strFromU8(starter[`${fixture.id}/Cargo.toml`])).toBe(
      fixture.files[0].starter,
    );
    expect(strFromU8(starter[`${fixture.id}/src/lib.rs`])).toBe(
      fixture.files[1].starter,
    );
    expect(strFromU8(solution[`${fixture.id}/src/lib.rs`])).toBe(
      fixture.files[1].solution,
    );
  });

  it("keeps archive bytes deterministic across repeated generation", () => {
    const repositoryRoot = repositoryWithNotices();
    const first = buildProjectArchive(fixture, "starter", { repositoryRoot });
    const second = buildProjectArchive(fixture, "starter", { repositoryRoot });
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it("uses the generator source location when called outside the repository", () => {
    const originalCwd = process.cwd();
    process.chdir("/tmp");
    try {
      expect(() => buildProjectArchive(fixture, "starter")).not.toThrow();
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("rejects authored paths that collide with injected notices", () => {
    const repositoryRoot = repositoryWithNotices();
    const noticePaths = [
      "LICENSE",
      "LICENSE-CONTENT",
      "LICENSE-SCOPE.md",
      "THIRD-PARTY-NOTICES.md",
    ];
    for (const noticePath of noticePaths)
      for (const path of [
        noticePath,
        noticePath.toLowerCase(),
        `${noticePath}/extra.txt`,
      ]) {
        expect(() =>
          buildProjectArchive(
            {
              ...fixture,
              files: [...fixture.files, { path, starter: "owned" }],
            },
            "starter",
            { repositoryRoot },
          ),
        ).toThrow(/archive notice path collision/i);
      }
    for (const path of [
      "LICENSE-APACHE",
      "license-apache",
      "LICENSE-APACHE/extra.txt",
    ]) {
      expect(() =>
        buildProjectArchive(
          {
            ...fixture,
            id: "mini-grep-workshop",
            files: [...fixture.files, { path, starter: "owned" }],
          },
          "starter",
          { repositoryRoot },
        ),
      ).toThrow(/archive notice path collision/i);
    }
  });

  it("rejects missing root notice inputs", () => {
    const repositoryRoot = repositoryWithNotices();
    rmSync(join(repositoryRoot, "LICENSE-CONTENT"));
    expect(() =>
      buildProjectArchive(fixture, "starter", { repositoryRoot }),
    ).toThrow(/missing archive notice input.*LICENSE-CONTENT/i);
  });

  it("requires Apache text only for the three declared package exceptions", () => {
    const repositoryRoot = repositoryWithNotices();
    rmSync(join(repositoryRoot, "LICENSE-APACHE"));
    expect(() =>
      buildProjectArchive({ ...fixture, id: "mini-grep-workshop" }, "starter", {
        repositoryRoot,
      }),
    ).toThrow(/missing archive notice input.*LICENSE-APACHE/i);
    expect(() =>
      buildProjectArchive(fixture, "starter", { repositoryRoot }),
    ).not.toThrow();
  });

  it.each([
    ["LICENSE", ""],
    ["LICENSE-CONTENT", " \t\n"],
    ["docs/licensing.md", "\n\t"],
    ["THIRD-PARTY-NOTICES.md", "\n\t"],
  ])("rejects blank canonical input %s", (sourcePath, contents) => {
    const repositoryRoot = repositoryWithNotices();
    writeFileSync(join(repositoryRoot, sourcePath), contents);
    expect(() =>
      buildProjectArchive(fixture, "starter", { repositoryRoot }),
    ).toThrow(
      new RegExp(`archive notice input.*${sourcePath.replace("/", "[/\\\\]")}`),
    );
  });

  it("resolves local scope links inside the extracted archive", () => {
    const repositoryRoot = repositoryWithNotices();
    writeFileSync(
      join(repositoryRoot, "docs", "licensing.md"),
      [
        "[`LICENSE`](../LICENSE)",
        "[`LICENSE-CONTENT`](../LICENSE-CONTENT)",
        "[`THIRD-PARTY-NOTICES.md`](../THIRD-PARTY-NOTICES.md)",
        "[Apache](../LICENSE-APACHE)",
      ].join("\n"),
    );
    writeFileSync(
      join(repositoryRoot, "THIRD-PARTY-NOTICES.md"),
      "See [`scope`](docs/licensing.md)\n",
    );
    const archive = unzipSync(
      buildProjectArchive(fixture, "starter", { repositoryRoot }),
    );
    const scope = strFromU8(archive[`${fixture.id}/LICENSE-SCOPE.md`]);
    expect(scope).toContain("](LICENSE)");
    expect(scope).toContain("](LICENSE-CONTENT)");
    expect(scope).toContain("](THIRD-PARTY-NOTICES.md)");
    expect(scope).toContain(
      "](https://www.apache.org/licenses/LICENSE-2.0.txt)",
    );
    expect(scope).not.toContain("](..");
    expect(strFromU8(archive[`${fixture.id}/THIRD-PARTY-NOTICES.md`])).toBe(
      "See [`scope`](LICENSE-SCOPE.md)\n",
    );
  });
});
