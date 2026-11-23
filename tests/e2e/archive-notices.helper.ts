import { expect } from "@playwright/test";
import { archiveNoticesFrom } from "../../scripts/archive-notices";
import type { ProjectPackage } from "../../src/domain/types";
import { strFromU8 } from "fflate";

const apacheExceptionPackageIds = new Set([
  "mini-grep-workshop",
  "frame-protocol-workspace",
  "durable-log-service-workspace",
  "durable-log-retry-workspace",
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
  const notices = archiveNoticesFrom(process.cwd(), archive, "pl");
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
        files[`${archive.id}/${target.split("#")[0]}`],
        `${archive.id}/${target}`,
      ).toBeDefined();
    }
  }
}
