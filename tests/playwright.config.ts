import { defineConfig } from "@playwright/test";
import path from "node:path";

// biome-ignore lint/complexity/useLiteralKeys: bracket notation keeps env var names explicit
const isCI = !!process.env["CI"];
const projectRoot = process.cwd();
const serverDataDir = path.join(projectRoot, "packages/server/data");
const serverDbPath = path.join(serverDataDir, "db.sqlite");

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
    command: `mkdir -p "${serverDataDir}" && DATABASE_URL=sqlite://${serverDbPath} bun "${path.join(projectRoot, "packages/server/index.ts")}"`,
    url: "http://localhost:3435/health",
    reuseExistingServer: !isCI,
    stdout: "pipe",
    stderr: "pipe",
  },
});
