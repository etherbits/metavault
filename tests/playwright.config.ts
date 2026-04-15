import { defineConfig } from "@playwright/test";

// biome-ignore lint/complexity/useLiteralKeys: bracket notation keeps env var names explicit
const isCI = !!process.env["CI"];

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-test-results",
  use: {
    // biome-ignore lint/complexity/useLiteralKeys: bracket notation keeps env var names explicit
    baseURL: process.env["BASE_URL"] ?? "http://localhost:3435",
    headless: isCI,
    screenshot: "on",
    video: "retain-on-failure",
  },
  webServer: {
    command: "bun ../packages/server/index.ts",
    url: "http://localhost:3435/health",
    reuseExistingServer: !isCI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
