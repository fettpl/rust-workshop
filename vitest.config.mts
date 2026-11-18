import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: [
      "src/**/*.test.ts",
      "scripts/verify-api-release.test.ts",
      "scripts/verify-macro-contracts.test.ts",
      "scripts/verify-performance.test.ts",
      "scripts/miri-disjoint-ranges-diagnostics.test.ts",
      "scripts/project-archive.test.ts",
      "scripts/profile-test-executable.test.ts",
      "scripts/verify-client-retry.test.ts",
      "scripts/verify-authorization.test.ts",
      "scripts/verify-file-schema-evolution.test.ts",
      "scripts/file-schema-package-commands.test.ts",
      "scripts/setup-assets.test.ts",
      "scripts/monaco-sanitizer.test.ts",
      "scripts/service-worker.test.ts",
      "scripts/offline-exposure-contract.test.ts",
    ],
    environment: "node",
  },
});
