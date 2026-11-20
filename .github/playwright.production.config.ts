import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
import baseConfig from "../playwright.config";

const repositoryRoot = resolve(__dirname, "..");

export default defineConfig({
  ...baseConfig,
  testDir: resolve(repositoryRoot, "tests/e2e"),
  outputDir: resolve(repositoryRoot, "test-results/playwright"),
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: resolve(repositoryRoot, "playwright-report"),
      },
    ],
  ],
  retries: 0,
  workers: 1,
  use: {
    ...baseConfig.use,
    baseURL: "http://127.0.0.1:3002",
  },
  webServer: undefined,
});
