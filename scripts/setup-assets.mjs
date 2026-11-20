import sharp from "sharp";
import { copyMonacoDistribution } from "./setup-assets-lib.mjs";

await copyMonacoDistribution({
  sourceRoot: "node_modules/monaco-editor",
  destinationRoot: "public/monaco",
});
for (const size of [192, 512])
  await sharp("public/icon.svg")
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
