import { logger } from "../logger";
import { err, ok, type Result } from "../utils/result";
import { contentNodeModel, type ContentNode } from "./contentNode.model";
import type {
  CreateContentNodeInput,
  UpdateContentNodeInput,
} from "./contentNode.schema";

type CreateInput = {
  userId: string;
  body: CreateContentNodeInput;
};

type IdInput = {
  userId: string;
  id: string;
};

type UpdateInput = IdInput & {
  body: UpdateContentNodeInput;
};

class ContentNodeService {
  async createContentNode({
    userId,
    body,
  }: CreateInput): Promise<Result<ContentNode>> {
    const libraryEntry = body.library_entry_id
      ? await contentNodeModel.getOwnedLibraryEntryById(
          userId,
          body.library_entry_id
        )
      : await contentNodeModel.getOwnedLibraryEntryByTitle(
          userId,
          body.library_entry_title as string
        );

    if (!libraryEntry) {
      return err(404, "Library entry not found");
    }

    const orderIndex =
      body.order_index ??
      (await contentNodeModel.getNextOrderIndex(libraryEntry.id));

    const node = await contentNodeModel.create({
      id: crypto.randomUUID(),
      title: body.title,
      link: body.link,
      order_index: orderIndex,
      library_entry_id: libraryEntry.id,
    });

    logger.info(`Content node created: ${node.id}`);
    return ok(node);
  }

  async getContentNodeById({
    userId,
    id,
  }: IdInput): Promise<Result<ContentNode>> {
    const node = await contentNodeModel.getById(id);
    const owner = await contentNodeModel.getOwnerByContentNodeId(id);

    if (!node || !owner || owner.user_id !== userId) {
      return err(404, "Content node not found");
    }

    return ok(node);
  }

  async getContentNodesByLibraryEntry({
    userId,
    libraryEntryId,
  }: {
    userId: string;
    libraryEntryId: string;
  }): Promise<Result<ContentNode[]>> {
    const ownedEntry = await contentNodeModel.getOwnedLibraryEntryById(
      userId,
      libraryEntryId
    );

    if (!ownedEntry) {
      return err(404, "Library entry not found");
    }

    const nodes = await contentNodeModel.getByLibraryEntryId(libraryEntryId);
    return ok(nodes);
  }

  async updateContentNode({
    userId,
    id,
    body,
  }: UpdateInput): Promise<Result<ContentNode>> {
    const owner = await contentNodeModel.getOwnerByContentNodeId(id);

    if (!owner || owner.user_id !== userId) {
      return err(404, "Content node not found");
    }

    const updated = await contentNodeModel.update(id, body);

    if (!updated) {
      return err(404, "Content node not found");
    }

    return ok(updated);
  }

  async deleteContentNode({
    userId,
    id,
  }: IdInput): Promise<Result<{ message: string }>> {
    const owner = await contentNodeModel.getOwnerByContentNodeId(id);

    if (!owner || owner.user_id !== userId) {
      return err(404, "Content node not found");
    }

    const deleted = await contentNodeModel.delete(id);

    if (!deleted) {
      return err(404, "Content node not found");
    }

    return ok({ message: "Content node deleted successfully" });
  }
}

export const contentNodeService = new ContentNodeService();
