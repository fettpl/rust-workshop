import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { projects } from "../src/content/course";
import { projectFiles } from "../src/domain/project-package";
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
  it("keeps real canonical notices self-contained in every authored archive variant", () => {
    const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
    const apacheIds = new Set([
      "mini-grep-workshop",
      "frame-protocol-workspace",
      "durable-log-service-workspace",
      "durable-log-retry-workspace",
    ]);
    const packages = projects.flatMap((project) =>
      project.package ? [project.package] : [],
    );
    expect(packages.length).toBeGreaterThan(0);
    for (const project of packages) {
      for (const variant of ["starter", "solution"] as const) {
        const bytes = buildProjectArchive(project, variant);
        expect(bytes, `${project.id}/${variant} deterministic bytes`).toEqual(
          buildProjectArchive(project, variant),
        );
        const files = unzipSync(bytes);
        const authored = projectFiles(project, variant);
        const noticeNames = [
          "LICENSE",
          "LICENSE-CONTENT",
          "LICENSE-SCOPE.md",
          "THIRD-PARTY-NOTICES.md",
          ...(apacheIds.has(project.id) ? ["LICENSE-APACHE"] : []),
        ];
        expect(Object.keys(files).sort()).toEqual(
          [...Object.keys(authored), ...noticeNames]
            .map((path) => `${project.id}/${path}`)
            .sort(),
        );
        for (const [path, content] of Object.entries(authored))
          expect(
            strFromU8(files[`${project.id}/${path}`]),
            `${project.id}/${variant}/${path}`,
          ).toBe(content);
        for (const path of noticeNames.filter((path) => !path.endsWith(".md")))
          expect(files[`${project.id}/${path}`]).toEqual(
            new Uint8Array(readFileSync(join(repositoryRoot, path))),
          );
        expect(strFromU8(files[`${project.id}/THIRD-PARTY-NOTICES.md`])).toBe(
          readFileSync(
            join(repositoryRoot, "THIRD-PARTY-NOTICES.md"),
            "utf8",
          ).replaceAll("](docs/licensing.md)", "](LICENSE-SCOPE.md)"),
        );
        for (const path of ["LICENSE-SCOPE.md", "THIRD-PARTY-NOTICES.md"]) {
          const notice = strFromU8(files[`${project.id}/${path}`]);
          for (const [, target] of notice.matchAll(/\]\(([^)]+)\)/g)) {
            if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#"))
              continue;
            const localPath = posix.normalize(
              `${project.id}/${target.split("#")[0]}`,
            );
            expect(
              files[localPath],
              `${project.id}/${variant}/${path}: ${target}`,
            ).toBeDefined();
          }
        }
        expect(strFromU8(files[`${project.id}/LICENSE-SCOPE.md`])).toContain(
          "](https://github.com/fettpl/rust-workshop/blob/main/docs/rights-assessment.md)",
        );
      }
    }
  }, 30_000);

  it("maps only known repository audit documents and preserves their fragments", () => {
    const repositoryRoot = repositoryWithNotices();
    writeFileSync(
      join(repositoryRoot, "docs", "licensing.md"),
      [
        "[rights](rights-assessment.md)",
        "[rights section](rights-assessment.md#findings)",
        "[provenance](oss-provenance.md)",
        "[provenance section](oss-provenance.md#inventory)",
        "[other](other.md#unchanged)",
        "[similar](nested/rights-assessment.md)",
      ].join("\n"),
    );
    const files = unzipSync(
      buildProjectArchive(fixture, "starter", { repositoryRoot }),
    );
    expect(strFromU8(files[`${fixture.id}/LICENSE-SCOPE.md`])).toBe(
      [
        "[rights](https://github.com/fettpl/rust-workshop/blob/main/docs/rights-assessment.md)",
        "[rights section](https://github.com/fettpl/rust-workshop/blob/main/docs/rights-assessment.md#findings)",
        "[provenance](https://github.com/fettpl/rust-workshop/blob/main/docs/oss-provenance.md)",
        "[provenance section](https://github.com/fettpl/rust-workshop/blob/main/docs/oss-provenance.md#inventory)",
        "[other](other.md#unchanged)",
        "[similar](nested/rights-assessment.md)",
      ].join("\n"),
    );
  });

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

  it("writes identical ZIP bytes across runner time zones", () => {
    const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
    const program = `
      const { projects } = require("./src/content/course.ts");
      const { buildProjectArchive } = require("./scripts/project-archive.ts");
      const archive = projects.find(({ id }) => id === "service-authorization").package;
      const { createHash } = require("node:crypto");
      process.stdout.write(createHash("sha256").update(buildProjectArchive(archive, "starter")).digest("hex"));
    `;
    const archives = ["UTC", "Europe/Warsaw", "America/Los_Angeles"].map((zone) =>
      execFileSync(process.execPath, ["--require", "tsx/cjs", "-e", program], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, TZ: zone },
      }),
    );
    expect(archives).toEqual([archives[0], archives[0], archives[0]]);
  }, 30_000);

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

  it("requires Apache text only for the four declared package exceptions", () => {
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
