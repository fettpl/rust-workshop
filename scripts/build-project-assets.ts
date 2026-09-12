/** Packages only reviewed repository fixtures; never accepts learner files or paths. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projects } from "../src/content/course";
import { buildProjectArchive } from "./project-archive";

for (const project of projects) {
  if (!project.package) continue;
  const archive = project.package;
  for (const variant of ["starter", "solution"] as const) {
    const bytes = buildProjectArchive(archive, variant);
    const directory = join(process.cwd(), "public", "projects", archive.id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${variant}.zip`), bytes);
    console.log(`${archive.id}/${variant}.zip: ${bytes.length} bytes`);
  }
}
