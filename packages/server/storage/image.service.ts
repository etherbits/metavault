import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { getUserLibraryEntryDir, getImagePublicPath } from "./path.util";

type SavedImages = {
  original: string;
  medium: string;
  small: string;
};

export async function processAndSaveImage(
  fileBuffer: Buffer,
  userId: string,
  entryId: string,
): Promise<SavedImages> {
  const dir = getUserLibraryEntryDir(userId, entryId);

  // ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // file paths
  const originalPath = path.join(dir, "original.webp");
  const mediumPath = path.join(dir, "medium.webp");
  const smallPath = path.join(dir, "small.webp");

  // ORIGINAL (compressed but high quality)
  await sharp(fileBuffer).webp({ quality: 90 }).toFile(originalPath);

  // MEDIUM (~800px)
  await sharp(fileBuffer)
    .resize({ width: 800 })
    .webp({ quality: 80 })
    .toFile(mediumPath);

  // SMALL (~300px)
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
