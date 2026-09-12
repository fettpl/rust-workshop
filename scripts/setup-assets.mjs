import { cp, mkdir } from "node:fs/promises";
import sharp from "sharp";
await mkdir("public/monaco", { recursive: true });
await cp("node_modules/monaco-editor/min/vs", "public/monaco/vs", {
  recursive: true,
});
for (const size of [192, 512])
  await sharp("public/icon.svg")
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
