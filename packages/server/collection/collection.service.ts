import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import {
  collectionModel,
  type Collection,
  type CollectionWithEntries,
} from "./collection.model";
import type {
  CreateCollectionInput,
  RemoveCollectionEntriesInput,
  UpdateCollectionInput,
} from "./collection.schema";

type CollectionInput = {
  userId: string;
  id: string;
};

type CreateInput = {
  userId: string;
  body: CreateCollectionInput;
};

type UpdateInput = CollectionInput & {
  body: UpdateCollectionInput;
};

type RemoveEntriesInput = CollectionInput & {
  body: RemoveCollectionEntriesInput;
};

class CollectionService {
  async createCollection({
    userId,
    body,
  }: CreateInput): Promise<Result<Collection>> {
    const libraryEntryIds =
      body.entries?.map((entry) => entry.library_entry_id) ?? [];

    const entriesAreOwned = await this.userOwnsLibraryEntries(
      userId,
      libraryEntryIds
    );

    if (!entriesAreOwned) {
      return err(400, "One or more library entries do not belong to the user");
    }

    const collection = await collectionModel.create({
      id: crypto.randomUUID(),
      user_id: userId,
      name: body.name,
    });

    await collectionModel.createEntries(collection.id, libraryEntryIds);

    logger.info(`Collection created: ${collection.id}`);
    return ok(collection);
  }

  async getUserCollections(
    userId: string
  ): Promise<Result<CollectionWithEntries[]>> {
    const collections = await collectionModel.getByUser(userId);
    return ok(collections);
  }

  async getCollectionById({
    userId,
    id,
  }: CollectionInput): Promise<Result<Collection>> {
    const collection = await collectionModel.getById(id);

    if (!collection || collection.user_id !== userId) {
      return err(404, "Collection not found");
    }

    return ok(collection);
  }

  async updateCollection({
    userId,
    id,
    body,
  }: UpdateInput): Promise<Result<Collection>> {
    const existing = await collectionModel.getById(id);

    if (!existing || existing.user_id !== userId) {
      return err(404, "Collection not found");
    }

    const libraryEntryIds = body.entries
      ? body.entries.map((entry) => entry.library_entry_id)
      : undefined;

    if (libraryEntryIds) {
      const entriesAreOwned = await this.userOwnsLibraryEntries(
        userId,
        libraryEntryIds
      );

      if (!entriesAreOwned) {
        return err(
          400,
          "One or more library entries do not belong to the user"
        );
      }
    }

    const updated = await collectionModel.update(id, userId, {
      name: body.name,
    });

    if (!updated) {
      return err(404, "Collection not found");
    }

    if (libraryEntryIds) {
      await collectionModel.replaceEntries(id, libraryEntryIds);
    }

    return ok(updated);
  }

  async deleteCollection({
    userId,
    id,
  }: CollectionInput): Promise<Result<{ message: string }>> {
    const deleted = await collectionModel.delete(id, userId);

    if (!deleted) {
      return err(404, "Collection not found");
    }

    return ok({ message: "Collection deleted successfully" });
  }

  async removeCollectionEntries({
    userId,
    id,
    body,
  }: RemoveEntriesInput): Promise<Result<{ message: string }>> {
    const existing = await collectionModel.getById(id);

    if (!existing || existing.user_id !== userId) {
      return err(404, "Collection not found");
    }

    const libraryEntryIds = body.library_entry_ids;
    const entriesAreOwned = await this.userOwnsLibraryEntries(
      userId,
      libraryEntryIds
    );

    if (!entriesAreOwned) {
      return err(400, "One or more library entries do not belong to the user");
    }

    await collectionModel.removeEntries(id, libraryEntryIds);

    return ok({ message: "Collection entries removed successfully" });
  }

  private async userOwnsLibraryEntries(
    userId: string,
    libraryEntryIds: string[]
  ) {
    const ownedCount = await collectionModel.countOwnedLibraryEntries(
      userId,
      libraryEntryIds
    );

    return ownedCount === libraryEntryIds.length;
  }
}

export const collectionService = new CollectionService();
