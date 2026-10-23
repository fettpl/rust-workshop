import { cp, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { adaptMonaco, guardAppImports } from "./monaco-sanitizer.mjs";

const upstreamNoticeFiles = ["LICENSE", "ThirdPartyNotices.txt"];

export async function copyMonacoDistribution({
  sourceRoot,
  destinationRoot,
  sanitizerRoot = "node_modules/dompurify",
  promote = rename,
}) {
  await guardAppImports("src");
  const parent = dirname(destinationRoot);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(
    join(parent, `.${basename(destinationRoot)}-staging-`),
  );
  let backup;
  let keepBackup = false;
  try {
    await cp(join(sourceRoot, "min", "vs"), join(staging, "vs"), {
      recursive: true,
    });
    for (const file of upstreamNoticeFiles)
      await cp(join(sourceRoot, file), join(staging, file));
    await adaptMonaco(staging, sourceRoot, sanitizerRoot);
    let exists = false;
    try {
      await stat(destinationRoot);
      exists = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (exists) {
      backup = await mkdtemp(
        join(parent, `.${basename(destinationRoot)}-backup-`),
      );
      await rm(backup, { recursive: true });
      await rename(destinationRoot, backup);
    }
    try {
      await promote(staging, destinationRoot);
    } catch (error) {
      if (backup) {
        try {
          await rename(backup, destinationRoot);
        } catch (restoreError) {
          keepBackup = true;
          throw new AggregateError(
            [error, restoreError],
            `Monaco promotion and rollback failed; complete previous output retained at ${backup}`,
          );
        }
      }
      throw error;
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
    if (backup && !keepBackup)
      await rm(backup, { recursive: true, force: true });
  }
}
export { upstreamNoticeFiles };
