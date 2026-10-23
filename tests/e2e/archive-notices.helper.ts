import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectPackage } from "../../src/domain/types";
import { strFromU8 } from "fflate";

const apacheExceptionPackageIds = new Set([
  "mini-grep-workshop",
  "frame-protocol-workspace",
  "durable-log-service-workspace",
]);

function expectedNoticeNames(archive: ProjectPackage): string[] {
  return [
    "LICENSE",
    "LICENSE-CONTENT",
    "LICENSE-SCOPE.md",
    "THIRD-PARTY-NOTICES.md",
    ...(apacheExceptionPackageIds.has(archive.id) ? ["LICENSE-APACHE"] : []),
  ].sort();
}

function readCanonicalNoticeTexts(
  archive: ProjectPackage,
): Record<string, string> {
  const repositoryRoot = process.cwd();
  const includesApacheNotice = apacheExceptionPackageIds.has(archive.id);
  const scope = readFileSync(
    join(repositoryRoot, "docs", "licensing.md"),
    "utf8",
  )
    .replace(
      /\]\(\.\.\/(LICENSE|LICENSE-CONTENT|THIRD-PARTY-NOTICES\.md)\)/g,
      "]($1)",
    )
    .replace(
      /\]\(\.\.\/LICENSE-APACHE\)/g,
      includesApacheNotice
        ? "](LICENSE-APACHE)"
        : "](https://www.apache.org/licenses/LICENSE-2.0.txt)",
    );
  const notices: Record<string, string> = {
    LICENSE: readFileSync(join(repositoryRoot, "LICENSE"), "utf8"),
    "LICENSE-CONTENT": readFileSync(
      join(repositoryRoot, "LICENSE-CONTENT"),
      "utf8",
    ),
    "LICENSE-SCOPE.md": scope,
    "THIRD-PARTY-NOTICES.md": readFileSync(
      join(repositoryRoot, "THIRD-PARTY-NOTICES.md"),
      "utf8",
    ).replaceAll("](docs/licensing.md)", "](LICENSE-SCOPE.md)"),
  };
  if (includesApacheNotice)
    notices["LICENSE-APACHE"] = readFileSync(
      join(repositoryRoot, "LICENSE-APACHE"),
      "utf8",
    );
  return notices;
}

export function expectedArchivePaths(archive: ProjectPackage): string[] {
  return [
    ...archive.files.map((file) => `${archive.id}/${file.path}`),
    ...expectedNoticeNames(archive).map((path) => `${archive.id}/${path}`),
  ].sort();
}

export function assertArchiveNotices(
  files: Record<string, Uint8Array>,
  archive: ProjectPackage,
): void {
  const notices = readCanonicalNoticeTexts(archive);
  const expectedNames = expectedNoticeNames(archive);
  expect(Object.keys(notices).sort()).toEqual(expectedNames);
  expect(
    Object.keys(files)
      .filter((path) => {
        const relative = path.startsWith(`${archive.id}/`)
          ? path.slice(archive.id.length + 1)
          : path;
        return expectedNames.includes(relative);
      })
      .sort(),
  ).toEqual(expectedNames.map((path) => `${archive.id}/${path}`).sort());
  for (const [path, content] of Object.entries(notices))
    expect(
      strFromU8(files[`${archive.id}/${path}`]),
      `${archive.id}/${path}`,
    ).toBe(content);

  for (const path of ["LICENSE-SCOPE.md", "THIRD-PARTY-NOTICES.md"]) {
    const notice = strFromU8(files[`${archive.id}/${path}`]);
    for (const match of notice.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (target.startsWith("http") || target.startsWith("#")) continue;
      expect(
        files[`${archive.id}/${target}`],
        `${archive.id}/${target}`,
      ).toBeDefined();
    }
  }
}
