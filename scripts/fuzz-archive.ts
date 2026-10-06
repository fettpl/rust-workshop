import assert from "node:assert/strict";
import type { ProjectPackage } from "../src/domain/types";
import { buildProjectArchive } from "./project-archive";

/** Compare served bytes with the freshly generated authored archive. */
export function assertFreshFuzzArchive(
  project: ProjectPackage,
  variant: "starter" | "solution",
  served: Uint8Array,
): Uint8Array {
  const generated = Buffer.from(buildProjectArchive(project, variant));
  assert.deepEqual(Buffer.from(served), generated, `Stale authored ${variant} archive`);
  return generated;
}
