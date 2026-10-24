import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import type { ProjectPackage } from "../src/domain/types";
import {
  projectFiles,
  type PackageVariant,
} from "../src/domain/project-package";

export interface ProjectArchiveOptions {
  /** Repository root containing the canonical license and scope documents. */
  repositoryRoot?: string;
}

export const archiveNoticeSources = {
  LICENSE: "LICENSE",
  "LICENSE-CONTENT": "LICENSE-CONTENT",
  "LICENSE-SCOPE.md": join("docs", "licensing.md"),
  "THIRD-PARTY-NOTICES.md": "THIRD-PARTY-NOTICES.md",
} as const;

export const archiveApacheExceptionPackageIds = [
  "mini-grep-workshop",
  "frame-protocol-workspace",
  "durable-log-service-workspace",
] as const;

const archiveApacheExceptionIds = new Set<string>(
  archiveApacheExceptionPackageIds,
);
const defaultRepositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function noticeSourcesFor(project?: ProjectPackage) {
  return archiveApacheExceptionIds.has(project?.id ?? "")
    ? { ...archiveNoticeSources, "LICENSE-APACHE": "LICENSE-APACHE" }
    : archiveNoticeSources;
}

function adaptScopeLinks(scope: string, includesApacheNotice: boolean): string {
  // Audit records stay in the repository; archives carry the applicable notices.
  const repositoryLinks = scope.replace(
    /\]\((rights-assessment\.md|oss-provenance\.md)(#[^)]*)?\)/g,
    "](https://github.com/fettpl/rustcrushcourse/blob/main/docs/$1$2)",
  );
  const withoutParent = repositoryLinks.replace(
    /\]\(\.\.\/(LICENSE|LICENSE-CONTENT|THIRD-PARTY-NOTICES\.md)\)/g,
    "]($1)",
  );
  return withoutParent.replace(
    /\]\(\.\.\/LICENSE-APACHE\)/g,
    includesApacheNotice
      ? "](LICENSE-APACHE)"
      : "](https://www.apache.org/licenses/LICENSE-2.0.txt)",
  );
}

function adaptNoticeDocument(
  archivePath: string,
  contents: string,
  includesApacheNotice: boolean,
): string {
  if (archivePath === "LICENSE-SCOPE.md")
    return adaptScopeLinks(contents, includesApacheNotice);
  if (archivePath === "THIRD-PARTY-NOTICES.md")
    return contents.replaceAll("](docs/licensing.md)", "](LICENSE-SCOPE.md)");
  return contents;
}

export function readArchiveNotices(
  repositoryRoot = defaultRepositoryRoot,
  project?: ProjectPackage,
): Record<string, string> {
  const sources = noticeSourcesFor(project);
  const includesApacheNotice = "LICENSE-APACHE" in sources;
  return Object.fromEntries(
    Object.entries(sources).map(([archivePath, sourcePath]) => {
      try {
        const contents = readFileSync(join(repositoryRoot, sourcePath), "utf8");
        if (!contents.trim())
          throw new Error(`Empty archive notice input ${sourcePath}`);
        return [
          archivePath,
          adaptNoticeDocument(archivePath, contents, includesApacheNotice),
        ];
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Empty archive"))
          throw error;
        const reason = error instanceof Error ? `: ${error.message}` : "";
        throw new Error(`Missing archive notice input ${sourcePath}${reason}`);
      }
    }),
  );
}

export function projectArchiveFiles(
  project: ProjectPackage,
  variant: PackageVariant,
  options: ProjectArchiveOptions = {},
): Record<string, string> {
  const authoredFiles = projectFiles(project, variant);
  const notices = readArchiveNotices(options.repositoryRoot, project);
  assertArchivePaths([...Object.keys(authoredFiles), ...Object.keys(notices)]);
  return { ...authoredFiles, ...notices };
}

function assertArchivePaths(paths: string[]): void {
  const seen = new Set<string>();
  for (const path of paths) {
    const normalized = path.toLowerCase();
    for (const existing of seen) {
      if (
        existing === normalized ||
        existing.startsWith(`${normalized}/`) ||
        normalized.startsWith(`${existing}/`)
      )
        throw new Error(`Archive notice path collision: ${path}`);
    }
    seen.add(normalized);
  }
}

export function buildProjectArchive(
  project: ProjectPackage,
  variant: PackageVariant,
  options: ProjectArchiveOptions = {},
): Uint8Array {
  const files = projectArchiveFiles(project, variant, options);
  return zipSync(
    Object.fromEntries(
      Object.entries(files)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([path, content]) => [`${project.id}/${path}`, strToU8(content)]),
    ),
    { level: 6, mtime: new Date("2026-01-01T00:00:00Z") },
  );
}
