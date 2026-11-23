/** Packages only reviewed repository fixtures; never accepts learner files or paths. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { projects } from "../src/content/course";
import {
  buildProjectArchive,
  projectArchiveDownloads,
} from "./project-archive";

for (const project of projects) {
  const archive = project.package;
  if (!archive) continue;
  for (const { variant, locale, url } of projectArchiveDownloads(archive)) {
    const target = join(process.cwd(), "public", url);
    const bytes = buildProjectArchive(archive, variant, { locale });
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    console.log(`${url}: ${bytes.length} bytes`);
  }
}
