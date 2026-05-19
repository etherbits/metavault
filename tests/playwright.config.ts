import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;
const envFile =
  process.env.METAVAULT_E2E_ENV_FILE ??
  path.join(tmpdir(), `metavault-e2e-${process.pid}.json`);

function createE2eEnv() {
  const e2eRoot = mkdtempSync(path.join(tmpdir(), "metavault-e2e-"));

  return {
    NODE_ENV: "test",
    JWT_SECRET: "e2e-secret",
    GLOBAL_RATE_LIMIT_MAX: "1000",
    AUTH_RATE_LIMIT_MAX: "1000",
    DATABASE_URL: `sqlite://${path.join(e2eRoot, "db.sqlite")}`,
    MEDIA_ROOT: path.join(e2eRoot, "media"),
    METAVAULT_E2E_ROOT: e2eRoot,
    METAVAULT_E2E_ENV_FILE: envFile,
  };
}

const e2eEnv = existsSync(envFile)
  ? JSON.parse(readFileSync(envFile, "utf8"))
  : createE2eEnv();

if (!existsSync(envFile)) {
  writeFileSync(envFile, JSON.stringify(e2eEnv));
}

const webServerEnv = {
  NODE_ENV: "test",
  JWT_SECRET: e2eEnv.JWT_SECRET,
  GLOBAL_RATE_LIMIT_MAX: e2eEnv.GLOBAL_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_MAX: e2eEnv.AUTH_RATE_LIMIT_MAX,
  DATABASE_URL: e2eEnv.DATABASE_URL,
  MEDIA_ROOT: e2eEnv.MEDIA_ROOT,
  METAVAULT_E2E_ROOT: e2eEnv.METAVAULT_E2E_ROOT,
  METAVAULT_E2E_ENV_FILE: e2eEnv.METAVAULT_E2E_ENV_FILE,
};

Object.assign(process.env, webServerEnv);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-test-results",
  globalTeardown: "./e2e-global-teardown.ts",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3435",
    headless: isCI,
    screenshot: "on",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "bun packages/server/scripts/reset.ts && bun tests/seed-test-user.ts && bun packages/server/index.ts",
    url: "http://localhost:3435/health",
    reuseExistingServer: false,
    cwd: "..",
    env: webServerEnv,
    stdout: "pipe",
    stderr: "pipe",
  },
});
