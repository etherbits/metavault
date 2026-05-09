import fs from "fs/promises";
import { getUserLibraryEntryDir } from "./path.util";
import { logger } from "../logger";

export async function ensureDirExists(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function createLibraryEntryDir(userId: string, entryId: string) {
  const dir = getUserLibraryEntryDir(userId, entryId);
  await ensureDirExists(dir);
  return dir;
}

export async function deleteLibraryEntryDir(userId: string, entryId: string) {
  const dir = getUserLibraryEntryDir(userId, entryId);
  logger.info(`Deleting dir: ${dir}`);
  await fs.rm(dir, { recursive: true, force: true });
}
