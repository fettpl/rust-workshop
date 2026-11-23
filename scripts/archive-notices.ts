import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProjectPackage } from "../src/domain/types";
import type { Locale } from "../src/i18n/ui-locale";

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
  "durable-log-retry-workspace",
] as const;

const archiveApacheExceptionIds = new Set<string>(
  archiveApacheExceptionPackageIds,
);

function noticeSourcesFor(project?: ProjectPackage) {
  return archiveApacheExceptionIds.has(project?.id ?? "")
    ? { ...archiveNoticeSources, "LICENSE-APACHE": "LICENSE-APACHE" }
    : archiveNoticeSources;
}

function adaptScopeLinks(scope: string, includesApacheNotice: boolean): string {
  // Audit records stay in the repository; archives carry the applicable notices.
  const repositoryLinks = scope.replace(
    /\]\(((?:rights-assessment|oss-provenance)(?:\.pl)?\.md)(#[^)]*)?\)/g,
    "](https://github.com/fettpl/rust-workshop/blob/main/docs/$1$2)",
  );
  const languageLinks = repositoryLinks.replace(
    /\]\((licensing(?:\.pl)?\.md)\)/g,
    "](https://github.com/fettpl/rust-workshop/blob/main/docs/$1)",
  ).replaceAll("](../THIRD-PARTY-NOTICES.pl.md)", "](THIRD-PARTY-NOTICES.md)");
  const withoutParent = languageLinks.replace(
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
    return contents
      .replace(/\]\(docs\/licensing(?:\.pl)?\.md\)/g, "](LICENSE-SCOPE.md)")
      .replace(/\]\((THIRD-PARTY-NOTICES(?:\.pl)?\.md)\)/g,
        "](https://github.com/fettpl/rust-workshop/blob/main/$1)");
  return contents;
}

export function archiveNoticesFrom(
  repositoryRoot: string,
  project?: ProjectPackage,
  locale?: Locale,
): Record<string, string> {
  const sources = noticeSourcesFor(project);
  const includesApacheNotice = "LICENSE-APACHE" in sources;
  return Object.fromEntries(
    Object.entries(sources).map(([archivePath, sourcePath]) => {
      try {
        const localizedPath = locale === "pl" ? sourcePath.replace(/\.md$/, ".pl.md") : sourcePath;
        const contents = readFileSync(join(repositoryRoot, localizedPath), "utf8");
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
