import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  getAvatarPublicPath,
  getImagePublicPath,
  getUserLibraryEntryDir,
  getUserProfileMediaDir,
} from "./path.util";

type SavedImages = {
  original: string;
  medium: string;
  small: string;
};

export async function processAndSaveImage(
  fileBuffer: Buffer,
  userId: string,
  entryId: string
): Promise<SavedImages> {
  const dir = getUserLibraryEntryDir(userId, entryId);

  await fs.mkdir(dir, { recursive: true });

  const originalPath = path.join(dir, "original.webp");
  const mediumPath = path.join(dir, "medium.webp");
  const smallPath = path.join(dir, "small.webp");

  await sharp(fileBuffer).webp({ quality: 90 }).toFile(originalPath);

  await sharp(fileBuffer)
    .resize({ width: 800 })
    .webp({ quality: 80 })
    .toFile(mediumPath);

  await sharp(fileBuffer)
    .resize({ width: 300 })
    .webp({ quality: 70 })
    .toFile(smallPath);

  return {
    original: getImagePublicPath(userId, entryId, "original.webp"),
    medium: getImagePublicPath(userId, entryId, "medium.webp"),
    small: getImagePublicPath(userId, entryId, "small.webp"),
  };
}

export async function processAndSaveAvatar(fileBuffer: Buffer, userId: string) {
  const dir = getUserProfileMediaDir(userId);
  const filename = "avatar.webp";
  const avatarPath = path.join(dir, filename);

  await fs.mkdir(dir, { recursive: true });
  await sharp(fileBuffer)
    .resize({ width: 256, height: 256, fit: "cover" })
    .webp({ quality: 82 })
    .toFile(avatarPath);

  return `${getAvatarPublicPath(userId, filename)}?v=${Date.now()}`;
}
