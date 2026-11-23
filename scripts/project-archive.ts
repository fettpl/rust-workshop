import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import type { ProjectPackage } from "../src/domain/types";
import {
  projectFiles,
  type PackageVariant,
} from "../src/domain/project-package";

import { localizedPackageFile } from "../src/i18n/package-markdown";
import type { Locale } from "../src/i18n/ui-locale";

export interface ProjectArchiveOptions {
  locale?: Locale;
  /** Repository root containing the canonical license and scope documents. */
  repositoryRoot?: string;
}

export { archiveNoticeSources, archiveApacheExceptionPackageIds } from "./archive-notices";
import { archiveNoticesFrom } from "./archive-notices";

const defaultRepositoryRoot = fileURLToPath(new URL("..", import.meta.url));

export function readArchiveNotices(
  repositoryRoot = defaultRepositoryRoot,
  project?: ProjectPackage,
  locale?: Locale,
): Record<string, string> {
  return archiveNoticesFrom(repositoryRoot, project, locale);
}

export function projectArchiveFiles(
  project: ProjectPackage,
  variant: PackageVariant,
  options: ProjectArchiveOptions = {},
): Record<string, string> {
  const authoredFiles = projectFiles(project, variant);
  const notices = readArchiveNotices(options.repositoryRoot, project, options.locale);
  if (options.locale) {
    for (const [path, source] of Object.entries(authoredFiles)) {
      authoredFiles[path] = localizedPackageFile(path, source, options.locale);
    }
  }
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
  // ZIP stores DOS calendar fields without a time-zone offset. fflate reads
  // local fields, so use the same local calendar date in every build.
  return zipSync(
    Object.fromEntries(
      Object.entries(files)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([path, content]) => [`${project.id}/${path}`, strToU8(content)]),
    ),
    { level: 6, mtime: new Date(2026, 0, 1) },
  );
}
