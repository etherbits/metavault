import type { Request, Response } from "express";
import { CollectionModel } from "./collection.model";
import { logger } from "../logger";

async function createCollection(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const body = req.body as {
      name: string;
      entries?: Array<{ library_entry_id: string }>;
    };

    const collectionId = crypto.randomUUID();
    const libraryEntryIds = (body.entries ?? []).map((entry) => entry.library_entry_id);

    const hasValidEntries = await CollectionModel.validateLibraryEntriesOwnership(
      userId,
      libraryEntryIds,
    );

    if (!hasValidEntries) {
      return res.status(400).json({
        message: "One or more library entries do not belong to the user",
      });
    }

    const collection = await CollectionModel.create({
      id: collectionId,
      user_id: userId,
      name: body.name,
    });

    await CollectionModel.createEntries(collectionId, libraryEntryIds);

    logger.info(`Collection created: ${collection.id}`);
    res.status(201).json(collection);
  } catch (error) {
    logger.error("Create collection error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getUserCollections(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const collections = await CollectionModel.getByUser(userId);
    res.json(collections);
  } catch (error) {
    logger.error("Get user collections error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getCollectionById(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;

    const collection = await CollectionModel.getById(id);

    if (!collection || collection.user_id !== userId) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res.json(collection);
  } catch (error) {
    logger.error("Get collection error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function updateCollection(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;
    const body = req.body as {
      name?: string;
      entries?: Array<{ library_entry_id: string }>;
    };

    const existing = await CollectionModel.getById(id);

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const libraryEntryIds = body.entries?.map((entry) => entry.library_entry_id);

    if (libraryEntryIds) {
      const hasValidEntries = await CollectionModel.validateLibraryEntriesOwnership(
        userId,
        libraryEntryIds,
      );

      if (!hasValidEntries) {
        return res.status(400).json({
          message: "One or more library entries do not belong to the user",
        });
      }
    }

    const updated = await CollectionModel.update(id, userId, body.name);

    if (!updated) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (libraryEntryIds) {
      await CollectionModel.replaceEntries(id, libraryEntryIds);
    }

    res.json(updated);
  } catch (error) {
    logger.error("Update collection error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteCollection(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;

    const deleted = await CollectionModel.delete(id, userId);

    if (!deleted) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res.json({ message: "Collection deleted successfully" });
  } catch (error) {
    logger.error("Delete collection error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function removeCollectionEntries(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;
    const body = req.body as { library_entry_ids: string[] };

    const existing = await CollectionModel.getById(id);

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const hasValidEntries = await CollectionModel.validateLibraryEntriesOwnership(
      userId,
      body.library_entry_ids,
    );

    if (!hasValidEntries) {
      return res.status(400).json({
        message: "One or more library entries do not belong to the user",
      });
    }

    await CollectionModel.removeEntries(id, body.library_entry_ids);

    res.json({ message: "Collection entries removed successfully" });
  } catch (error) {
    logger.error("Remove collection entries error: " + (error as Error).message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const CollectionService = {
  createCollection,
  getUserCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  removeCollectionEntries,
};
