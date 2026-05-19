import { rmSync } from "node:fs";

export default async function globalTeardown() {
  const e2eRoot = process.env.METAVAULT_E2E_ROOT;
  const e2eEnvFile = process.env.METAVAULT_E2E_ENV_FILE;

  if (e2eEnvFile) {
    rmSync(e2eEnvFile, { force: true });
  }

  if (e2eRoot) {
    rmSync(e2eRoot, { force: true, recursive: true });
  }
}
