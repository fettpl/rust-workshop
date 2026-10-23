import { cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const upstreamNoticeFiles = ["LICENSE", "ThirdPartyNotices.txt"];

export async function copyMonacoDistribution({ sourceRoot, destinationRoot }) {
  const destinationParent = dirname(destinationRoot);
  await mkdir(destinationParent, { recursive: true });
  const stagingRoot = await mkdtemp(
    join(destinationParent, `.${basename(destinationRoot)}-staging-`),
  );
  try {
    await cp(join(sourceRoot, "min", "vs"), join(stagingRoot, "vs"), {
      recursive: true,
    });
    for (const file of upstreamNoticeFiles)
      await cp(join(sourceRoot, file), join(stagingRoot, file));

    await rm(destinationRoot, { recursive: true, force: true });
    await rename(stagingRoot, destinationRoot);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

export { upstreamNoticeFiles };
