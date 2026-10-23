/** Packages only reviewed repository fixtures; never accepts learner files or paths. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projects } from "../src/content/course";
import { buildProjectArchive } from "./project-archive";

const outputs = projects.flatMap((project) => {
  if (!project.package) return [];
  const archive = project.package;
  return (["starter", "solution"] as const).map((variant) => ({
    archive,
    variant,
    bytes: buildProjectArchive(archive, variant),
  }));
});

for (const { archive, variant, bytes } of outputs) {
  const directory = join(process.cwd(), "public", "projects", archive.id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${variant}.zip`), bytes);
  console.log(`${archive.id}/${variant}.zip: ${bytes.length} bytes`);
}
