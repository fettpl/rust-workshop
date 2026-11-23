import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix as path } from "node:path";
import { describe, expect, it } from "vitest";
import {
  competencies,
  concepts,
  lessons,
  modules,
  projects,
} from "./content/course";

const files = execFileSync(
  "git",
  [
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "*.md",
  ],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const documents = new Map(
  files.map((file) => [file, readFileSync(file, "utf8")]),
);

const polishPath = (file: string) => file.replace(/\.md$/, ".pl.md");
const englishPath = (file: string) => file.replace(/\.pl\.md$/, ".md");

const repositoryMarkdownUrl =
  /^https:\/\/github\.com\/fettpl\/(?:rust-workshop|rustcrushcourse)\/blob\/(?:refs\/heads\/)?main\/([^#?]+\.md(?:#.*)?)$/;

function relativeLink(file: string, link: string) {
  const repositoryPath = repositoryMarkdownUrl.exec(link)?.[1];
  return repositoryPath
    ? path.relative(path.dirname(file), repositoryPath)
    : link;
}

function inspect(markdown: string) {
  const code: string[] = [];
  const prose = markdown.replace(
    /(^[ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm,
    (fence) => {
      code.push(fence);
      return "";
    },
  );
  const headings = [...prose.matchAll(/^ {0,3}(#{1,6})[ \t]+(.+)$/gm)];
  const anchors = new Set(
    [...prose.matchAll(/<a (?:id|name)="([^"]+)"><\/a>/g)].map(
      (match) => match[1],
    ),
  );
  const headingCounts = new Map<string, number>();
  for (const [, , heading] of headings) {
    const slug = heading
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}_ -]/gu, "")
      .replace(/ /g, "-");
    const count = headingCounts.get(slug) ?? 0;
    headingCounts.set(slug, count + 1);
    anchors.add(count ? `${slug}-${count}` : slug);
  }
  const links = [
    ...prose.replace(/(`+)[^\n]*?\1/g, "").matchAll(/\]\(([^\s)]+)\)/g),
  ].map((match) => match[1]);
  return {
    code,
    anchors,
    headings: headings.map((match) => match[1].length),
    links,
  };
}

// Common words that happen to be course IDs (such as "loops") can be
// translated as prose. Persistent compound IDs must remain exact.
const persistentIds = new Set([
  ...[...competencies, ...concepts, ...modules, ...projects].map(
    ({ id }) => id,
  ),
  ...lessons.flatMap(({ id, steps }) => [id, ...steps.map((step) => step.id)]),
]);

function courseIds(markdown: string) {
  return [
    ...new Set(
      (markdown.match(/\b[a-z0-9]+(?:-[a-z0-9]+)+\b/g) ?? []).filter((token) =>
        persistentIds.has(token),
      ),
    ),
  ].sort();
}

function technicalReferences(markdown: string) {
  return [
    ...new Set(
      markdown.match(
        /\b(?:E[0-9]{4}|(?=[0-9a-f]*[0-9])(?=[0-9a-f]*[a-f])[0-9a-f]{7,8}|[0-9a-f]{40}|[0-9a-f]{64})\b/g,
      ) ?? [],
    ),
  ].sort();
}

function inlineCommands(markdown: string) {
  const commands = markdown.matchAll(
    /`((?:npm|npx|cargo|git|node|rustc|rustup|pnpm|bash|sh)[ \t]+[^`\r\n]+)`/g,
  );
  return [...new Set(Array.from(commands, ([, command]) => command))].sort();
}

const metadata = new Map(
  [...documents].map(([file, markdown]) => [file, inspect(markdown)]),
);

describe("bilingual repository documentation", () => {
  it("provides a discoverable counterpart for every English and Polish document", () => {
    expect(documents.has("README.md")).toBe(true);
    for (const [file, { links }] of metadata) {
      const counterpart = file.endsWith(".pl.md")
        ? englishPath(file)
        : polishPath(file);
      expect(documents.has(counterpart), `Missing ${counterpart}`).toBe(true);
      expect(links, `Language switch in ${file}`).toContain(
        path.basename(counterpart),
      );
    }
  });

  it("preserves headings, runnable code blocks, and link destinations across languages", () => {
    for (const [file, english] of metadata) {
      if (file.endsWith(".pl.md")) continue;
      const counterpart = polishPath(file);
      const polish = metadata.get(counterpart);
      expect(polish, counterpart).toBeDefined();
      if (!polish) continue;

      expect(polish.headings, file).toEqual(english.headings);
      expect(polish.code, file).toEqual(english.code);
      const englishLinks = english.links
        .filter((link) => link !== path.basename(counterpart))
        .map((link) => relativeLink(file, link));
      const polishLinks = polish.links
        .filter((link) => link !== path.basename(file))
        .map((link) => relativeLink(counterpart, link))
        .map((link) =>
          /^[\w+.-]+:/.test(link)
            ? link
            : link.replace(/\.pl\.md(?=#|$)/, ".md"),
        );
      expect(polishLinks.sort(), file).toEqual(englishLinks.sort());
    }
  });

  it("preserves identifiers, diagnostics, hashes, and inline commands without translation markers", () => {
    for (const [file, markdown] of documents) {
      expect(markdown, `Translation marker in ${file}`).not.toMatch(
        /⟦\d+⟧|\[9\d{3}9\]|\b(?:ZXQ[A-Z0-9_]+QXZ|RWTOKEN[A-Z0-9_]+)\b/,
      );
      if (file.endsWith(".pl.md")) continue;
      const polish = documents.get(polishPath(file));
      expect(polish, file).toBeDefined();
      if (!polish) continue;
      expect(courseIds(polish), file).toEqual(courseIds(markdown));
      expect(technicalReferences(polish), file).toEqual(
        technicalReferences(markdown),
      );
      expect(inlineCommands(polish), file).toEqual(inlineCommands(markdown));
    }
  });

  it("resolves local Markdown links and their fragments in the active language", () => {
    for (const [file, { links }] of metadata) {
      const polish = file.endsWith(".pl.md");
      const counterpart = polish ? englishPath(file) : polishPath(file);
      for (const rawLink of links) {
        const link = relativeLink(file, rawLink);
        if (/^(?:[\w+.-]+:|\/\/)/.test(link)) continue;
        const [relative, fragment] = link.split("#");
        if (relative && !relative.endsWith(".md")) continue;

        const target = relative
          ? path.join(path.dirname(file), relative)
          : file;
        const destination = metadata.get(target);
        const description = `${file} → ${link}`;
        expect(destination, description).toBeDefined();
        if (target !== counterpart) {
          expect(target.endsWith(".pl.md"), description).toBe(polish);
        }
        if (fragment && destination) {
          expect(destination.anchors, description).toContain(
            decodeURIComponent(fragment),
          );
        }
      }
    }
  });
});
