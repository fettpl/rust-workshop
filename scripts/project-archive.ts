import { strToU8, zipSync } from "fflate";
import type { ProjectPackage } from "../src/domain/types";
import {
  projectFiles,
  type PackageVariant,
} from "../src/domain/project-package";

export function buildProjectArchive(
  project: ProjectPackage,
  variant: PackageVariant,
): Uint8Array {
  const files = projectFiles(project, variant);
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [
        `${project.id}/${path}`,
        strToU8(content),
      ]),
    ),
    { level: 6, mtime: new Date("2026-01-01T00:00:00Z") },
  );
}
