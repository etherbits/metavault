import type { Request, Response } from "express";
import { LibraryModel } from "./library.model";
import { processAndSaveImage } from "../storage/image.service";
import { deleteLibraryEntryDir } from "../storage/storage.service";
import { logger } from "../logger";

async function createEntry(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const body = req.body;

    const entryId = crypto.randomUUID();

    let imagePaths = null;

    // If image uploaded
    if (req.file) {
      imagePaths = await processAndSaveImage(req.file.buffer, userId, entryId);
    }

    const entry = await LibraryModel.create({
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
    res.status(201).json(entry);
  } catch (error) {
    logger.error("Create library entry error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getUserLibrary(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const entries = await LibraryModel.getByUser(userId);
    res.json(entries);
  } catch (error) {
    logger.error("Get user library error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getEntriyById(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;

    const entry = await LibraryModel.getById(id);

    // security check
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json(entry);
  } catch (error) {
    logger.error("Get library entry error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function updateEntry(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;
    const body = req.body;

    let imageSrc = undefined;

    if (req.file) {
      const imagePaths = await processAndSaveImage(req.file.buffer, userId, id);

      imageSrc = imagePaths.original;
    }

    const updated = await LibraryModel.update(id, userId, {
      ...body,
      ...(imageSrc ? { image_src: imageSrc } : {}),
    });

    if (!updated) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.json(updated);
  } catch (error) {
    logger.error("Update library entry error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteEntry(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;

    const deleted = await LibraryModel.delete(id, userId);

    if (!deleted) {
      return res.status(404).json({ message: "Entry not found" });
    }

    // cleanup filesystem
    logger.info(`Deleting library entry dir for user ${userId}, entry ${id}`);
    await deleteLibraryEntryDir(userId, id);

    res.json({ message: "Entry deleted successfully" });
  } catch (error) {
    logger.error("Delete library entry error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const LibraryService = {
  createEntry,
  getUserLibrary,
  getEntriyById,
  updateEntry,
  deleteEntry,
};
