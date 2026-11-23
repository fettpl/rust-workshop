import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildProjectArchive } from "../../scripts/project-archive";
import { projects } from "../content/course";
import { projectFiles } from "../domain/project-package";
import { localizedPackageMarkdown } from "./package-markdown";

function englishReadme(
  id: string,
  variant: "starter" | "solution" = "starter",
) {
  const pkg = projects.find((project) => project.package?.id === id)?.package;
  if (!pkg) throw new Error(`Missing package ${id}`);
  return localizedPackageMarkdown(
    projectFiles(pkg, variant)["README.md"],
    "en",
  );
}

describe("localized package documents", () => {
  it("retains the Log Analyzer record format and exact line limits", () => {
    const readme = englishReadme("log-analyzer-workshop");
    expect(readme).toContain("MESSAGE is nonempty UTF-8 text");
    expect(readme).toContain("4096 bytes before LF");
    expect(readme).toContain("4097 bytes or more");
  });

  it("retains Mini grep's nonempty query and deterministic traversal rules", () => {
    const readme = englishReadme("mini-grep-workshop");
    expect(readme).toContain("nonempty UTF-8 substring");
    expect(readme).toContain("depth-first");
    expect(readme).toContain("1048576 bytes");
  });

  it("documents the atomic reservation invariant and counterexamples", () => {
    const readme = englishReadme("concurrency-lab-workshop");
    expect(readme).toContain("invariant");
    expect(readme).toContain("assertion failure");
    expect(readme).toContain("PUBLICATION_INVARIANT");
  });

  it("names Tokio and documents replay at full capacity in both Durable Event Log variants", () => {
    for (const variant of ["starter", "solution"] as const) {
      const readme = englishReadme("durable-log-service-workspace", variant);
      expect(readme).toContain("Tokio 1.54.1");
      expect(readme).toContain("identical retry still succeeds");
    }
  });

  it("matches the authored Markdown preview in ZIPs and preserves executable content", () => {
    for (const { package: pkg } of projects) {
      if (!pkg) continue;
      for (const variant of ["starter", "solution"] as const) {
        const authored = projectFiles(pkg, variant);
        for (const locale of ["en", "pl"] as const) {
          const archive = unzipSync(
            buildProjectArchive(pkg, variant, { locale }),
          );
          for (const [path, source] of Object.entries(authored)) {
            const preview = path.endsWith(".md")
              ? localizedPackageMarkdown(source, locale)
              : source;
            expect(
              strFromU8(archive[`${pkg.id}/${path}`]),
              `${pkg.id}/${variant}/${locale}/${path}`,
            ).toBe(preview);
          }
        }
      }
    }
  });
});
