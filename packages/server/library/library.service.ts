import { logger } from "../logger";
import { processAndSaveImage } from "../storage/image.service";
import { deleteLibraryEntryDir } from "../storage/storage.service";
import { err, ok, type Result } from "../utils/result";
import type { LibraryEntry } from "./library.model";
import { libraryModel } from "./library.model";
import type {
  CreateLibraryEntryInput,
  UpdateLibraryEntryInput,
} from "./library.schema";

type CreateEntryInput = {
  userId: string;
  body: CreateLibraryEntryInput;
  imageBuffer?: Buffer;
};

type EntryInput = {
  userId: string;
  id: string;
};

type UpdateEntryInput = EntryInput & {
  body: UpdateLibraryEntryInput;
  imageBuffer?: Buffer;
};

class LibraryService {
  async createEntry({
    userId,
    body,
    imageBuffer,
  }: CreateEntryInput): Promise<Result<LibraryEntry>> {
    const entryId = crypto.randomUUID();

    let imagePaths = null;

    if (imageBuffer) {
      imagePaths = await processAndSaveImage(imageBuffer, userId, entryId);
    }

    const entry = await libraryModel.create({
      id: entryId,
      user_id: userId,
      title: body.title,
      media_id: body.media_id,
      source_id: body.source_id,
      media_type: body.media_type,
      status: body.status,
      public_rating: body.public_rating,
      personal_rating: body.personal_rating,
      image_src: imagePaths?.original,
    });

    logger.info(`Library entry created: ${entry.id}`);
    return ok(entry);
  }

  async getUserLibrary(userId: string): Promise<Result<LibraryEntry[]>> {
    const entries = await libraryModel.getByUser(userId);
    return ok(entries);
  }

  async getEntriyById({
    userId,
    id,
  }: EntryInput): Promise<Result<LibraryEntry>> {
    const entry = await libraryModel.getById(id);

    if (!entry || entry.user_id !== userId) {
      return err(404, "Entry not found");
    }

    return ok(entry);
  }

  async updateEntry({
    userId,
    id,
    body,
    imageBuffer,
  }: UpdateEntryInput): Promise<Result<LibraryEntry>> {
    let imageSrc: string | undefined;

    if (imageBuffer) {
      const imagePaths = await processAndSaveImage(imageBuffer, userId, id);

      imageSrc = imagePaths.original;
    }

    const updated = await libraryModel.update(id, userId, {
      ...body,
      ...(imageSrc ? { image_src: imageSrc } : {}),
    });

    if (!updated) {
      return err(404, "Entry not found");
    }

    return ok(updated);
  }

  async deleteEntry({
    userId,
    id,
  }: EntryInput): Promise<Result<{ message: string }>> {
    const deleted = await libraryModel.delete(id, userId);

    if (!deleted) {
      return err(404, "Entry not found");
    }

    logger.info(`Deleting library entry dir for user ${userId}, entry ${id}`);
    await deleteLibraryEntryDir(userId, id);

    return ok({ message: "Entry deleted successfully" });
  }
}

export const libraryService = new LibraryService();
