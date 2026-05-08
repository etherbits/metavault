import path from "node:path";
import { parsedEnv } from "../env";

export const MEDIA_ROOT = path.resolve(process.cwd(), parsedEnv.MEDIA_ROOT);
export const MEDIA_BASE_URL = "/media";

export function getUserLibraryEntryDir(userId: string, entryId: string) {
  return path.join(MEDIA_ROOT, "users", userId, "library", entryId);
}

export function getUserMediaDir(userId: string) {
  return path.join(MEDIA_ROOT, "users", userId);
}

export function getImagePublicPath(
  userId: string,
  entryId: string,
  filename: string
) {
  return `${MEDIA_BASE_URL}/users/${userId}/library/${entryId}/${filename}`;
}
