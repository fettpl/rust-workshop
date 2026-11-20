import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const stableVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/;

function parseStableVersion(value) {
  if (typeof value !== "string") return null;
  const match = stableVersionPattern.exec(value);
  return match ? match.slice(1, 4).map(Number) : null;
}

export function isAtLeastStableVersion(value, minimum) {
  const actualParts = parseStableVersion(value);
  const minimumParts = parseStableVersion(minimum);
  if (!actualParts || !minimumParts) return false;
  for (let index = 0; index < actualParts.length; index++) {
    if (actualParts[index] !== minimumParts[index])
      return actualParts[index] > minimumParts[index];
  }
  return true;
}

export function verifySharpRuntime({ platform, versions, svgPngBytes }) {
  if (platform !== "linux") throw new Error(`expected Linux, got ${platform}`);
  for (const [name, minimum] of [
    ["sharp", "0.35.5"],
    ["rsvg", "2.63.2"],
  ]) {
    if (!isAtLeastStableVersion(versions?.[name], minimum))
      throw new Error(
        `expected ${name} >= ${minimum}, got ${versions?.[name] ?? "missing"}`,
      );
  }
  if (!Number.isInteger(svgPngBytes) || svgPngBytes <= 0)
    throw new Error("SVG decoder returned an empty PNG");
  return {
    platform,
    sharp: versions.sharp,
    vips: versions.vips,
    rsvg: versions.rsvg,
    pngBytes: svgPngBytes,
  };
}

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const { default: sharp } = await import("sharp");
  const png = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="black"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  console.log(
    JSON.stringify(
      verifySharpRuntime({
        platform: process.platform,
        versions: sharp.versions,
        svgPngBytes: png.length,
      }),
    ),
  );
}
