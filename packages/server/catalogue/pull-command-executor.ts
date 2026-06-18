import { z } from "zod";
import type {
  CommandExecutionParams,
  CommandExecutionResult,
  CommandExecutor,
} from "../commands/command-executor";
import { CommandExecutionError } from "../commands/command-executor";
import { parseCommandWithSchema } from "../commands/command-schema";
import { EntryMediaTypeSchema } from "../db/schema/libraryEntries";
import type { LibraryEntryWithTags } from "../ezq/ezq.schema";
import { libraryModel } from "../library/library.model";
import { logger } from "../logger";
import {
  catalogueModel,
  type CatalogueEntry,
  type CataloguePullMediaType,
} from "./catalogue.model";

const pullMediaTypeSchema = z.union([
  EntryMediaTypeSchema.exclude(["other"]),
  z.literal("all"),
]);

const pullCommandSchema = z
  .tuple([
    z.literal("pull"),
    pullMediaTypeSchema,
    z.coerce.number().int().min(1).max(500),
  ])
  .transform(([, mediaType, limit]) => ({ mediaType, limit }));

type PullCommand = z.infer<typeof pullCommandSchema>;

export class PullCommandExecutor implements CommandExecutor {
  canExecute(command: string): boolean {
    return this.parseCommand(command) !== null;
  }

  async execute(
    params: CommandExecutionParams
  ): Promise<CommandExecutionResult> {
    const command = this.parseCommand(params.command);
    if (!command) return { rows: params.rows };

    if (!params.userId) {
      throw new CommandExecutionError(
        401,
        "Pull command requires an authenticated user"
      );
    }

    logger.info(
      {
        action: params.action,
        rawCommand: params.command,
        command,
        rowCount: params.rows.length,
      },
      "Executing catalogue pull command"
    );

    if (params.action === "search") {
      return {
        rows: await this.previewPullRows(command, params.userId),
      };
    }

    if (params.action === "create") {
      return {
        rows: [
          ...params.rows,
          ...(await this.createPulledRows(command, params.userId)),
        ],
      };
    }

    logger.info(
      {
        action: params.action,
        rawCommand: params.command,
        rowCount: params.rows.length,
      },
      "Catalogue pull command skipped for unsupported action"
    );
    return { rows: params.rows };
  }

  private async previewPullRows(command: PullCommand, userId: string) {
    const entries = await this.getPullEntries(command, userId);
    return entries.map((entry) => this.toPreviewRow(entry, userId));
  }

  private async createPulledRows(command: PullCommand, userId: string) {
    const entries = await this.getPullEntries(command, userId);
    const rows: LibraryEntryWithTags[] = [];

    for (const entry of entries) {
      const created = await libraryModel.create({
        id: crypto.randomUUID(),
        user_id: userId,
        title: entry.title,
        media_id: entry.source_media_id,
        media_type: entry.media_type,
        adult: entry.adult,
        image_src: entry.image_src ?? undefined,
        public_rating: entry.public_rating ?? undefined,
        released_at: entry.released_at ?? undefined,
      });

      const tags = this.getTags(entry);
      if (tags.length > 0) {
        await libraryModel.addEntryTags({
          entryId: created.id,
          userId,
          tags,
        });
      }

      const row = await libraryModel.getByIdWithTags(created.id, userId);
      if (row) rows.push(row);
    }

    return rows;
  }

  private getPullEntries(command: PullCommand, userId: string) {
    return catalogueModel.getTopEntries({
      userId,
      mediaType: command.mediaType as CataloguePullMediaType,
      limit: command.limit,
      excludeExistingLibrary: true,
    });
  }

  private toPreviewRow(
    entry: CatalogueEntry,
    userId: string
  ): LibraryEntryWithTags {
    return {
      id: `catalogue:${entry.id}`,
      user_id: userId,
      title: entry.title,
      media_id: entry.source_media_id,
      source_id: null,
      image_src: entry.image_src,
      media_type: entry.media_type,
      status: null,
      adult: entry.adult,
      public_rating: entry.public_rating,
      personal_rating: null,
      released_at: entry.released_at,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      tags: this.getTags(entry).map((tag) => ({
        id: `catalogue:${entry.id}:${tag.value}`,
        value: tag.value,
        weight: tag.weight,
      })),
    };
  }

  private getTags(entry: CatalogueEntry) {
    return Array.from(new Set([...entry.genres, ...entry.tags])).map(
      (value) => ({
        value,
        weight: "major" as const,
      })
    );
  }

  private parseCommand(command: string) {
    return parseCommandWithSchema(pullCommandSchema, command);
  }
}
