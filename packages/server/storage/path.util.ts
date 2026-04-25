import path from "path";

export const MEDIA_ROOT = path.join(process.cwd(), "media");
export const MEDIA_BASE_URL = "/media";

export function getUserLibraryEntryDir(userId: string, entryId: string) {
  return path.join(MEDIA_ROOT, "users", userId, "library", entryId);
}

export function getImagePublicPath(
  userId: string,
  entryId: string,
  filename: string,
) {
  return `${MEDIA_BASE_URL}/users/${userId}/library/${entryId}/${filename}`;
}
