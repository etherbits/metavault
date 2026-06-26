import { sql } from "../db";
import type { EntryMediaType, EntryStatus } from "../db/schema/libraryEntries";

export type LibraryTagWeight = "major" | "minor";
export type EnrichmentUpdateMode = "add" | "override";

export interface LibraryEntry {
  id: string;
  user_id: string;

  title: string;

  media_id: string | null;
  source_id: string | null;

  media_type: EntryMediaType | null;
  status: EntryStatus | null;
  adult: boolean;

  image_src: string | null;

  public_rating: number | null;
  personal_rating: number | null;

  released_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface LibraryTag {
  id: string;
  value: string;
  weight: LibraryTagWeight;
}

export interface CreateLibraryEntryData {
  user_id: string;
  title?: string;

  media_id?: string;
  source_id?: string | null;

  media_type?: EntryMediaType;
  status?: EntryStatus;
  adult?: boolean;

  image_src?: string;

  public_rating?: number;
  personal_rating?: number;

  released_at?: string;
}

export interface UpdateLibraryEntryData {
  title?: string;

  media_id?: string;
  source_id?: string | null;

  media_type?: EntryMediaType;
  status?: EntryStatus | null;
  adult?: boolean;

  image_src?: string;

  public_rating?: number;
  personal_rating?: number;

  released_at?: string;
}

export interface EnrichedLibraryEntryUpdateData {
  title?: string;

  media_id?: string | null;
  source_id?: string | null;
  media_type?: EntryMediaType | null;
  adult?: boolean;
  image_src?: string | null;

  public_rating?: number | null;
  released_at?: string | null;

  tags?: Array<{ value: string; weight: LibraryTagWeight }>;
}

export type LibraryEntryWithTags = LibraryEntry & { tags: LibraryTag[] };

type EnrichmentScalarColumn = keyof Omit<
  EnrichedLibraryEntryUpdateData,
  "tags"
>;

const ENRICHMENT_SCALAR_COLUMNS: EnrichmentScalarColumn[] = [
  "title",
  "media_id",
  "source_id",
  "media_type",
  "adult",
  "image_src",
  "public_rating",
  "released_at",
];

class LibraryModel {
  async create(
    data: CreateLibraryEntryData & { id: string }
  ): Promise<LibraryEntry> {
    const result = await sql`
      INSERT INTO library_entries (
        id,
        user_id,
        title,
        media_id,
        source_id,
        media_type,
        status,
        adult,
        image_src,
        public_rating,
        personal_rating,
        released_at
      )
      VALUES (
        ${data.id},
        ${data.user_id},
        ${data.title ?? null},
        ${data.media_id ?? null},
        ${data.source_id ?? null},
        ${data.media_type ?? null},
        ${data.status ?? null},
        ${data.adult ? 1 : 0},
        ${data.image_src ?? null},
        ${data.public_rating ?? null},
        ${data.personal_rating ?? null},
        ${data.released_at ?? null}
      )
      RETURNING *
    `;

    return this.toLibraryEntry(result[0] as LibraryEntry);
  }

  async getById(id: string): Promise<LibraryEntry | null> {
    const result = await sql`
      SELECT * FROM library_entries WHERE id = ${id}
    `;

    return result[0] ? this.toLibraryEntry(result[0] as LibraryEntry) : null;
  }

  async getByUser(userId: string): Promise<LibraryEntry[]> {
    const result = await sql`
      SELECT * FROM library_entries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return (result as LibraryEntry[]).map((row) => this.toLibraryEntry(row));
  }

  async getByIds(userId: string, ids: string[]): Promise<LibraryEntry[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await sql`
      SELECT * FROM library_entries
      WHERE user_id = ${userId}
      AND id IN ${sql(ids)}
      ORDER BY created_at DESC
    `;

    return (result as LibraryEntry[]).map((row) => this.toLibraryEntry(row));
  }

  async update(
    id: string,
    userId: string,
    data: UpdateLibraryEntryData
  ): Promise<LibraryEntry | null> {
    const hasStatus = Object.hasOwn(data, "status");
    const hasAdult = Object.hasOwn(data, "adult");
    const hasSourceId = Object.hasOwn(data, "source_id");
    const result = await sql`
      UPDATE library_entries
      SET
        title = COALESCE(${data.title}, title),
        media_id = COALESCE(${data.media_id}, media_id),
        source_id = CASE WHEN ${hasSourceId} THEN ${data.source_id ?? null} ELSE source_id END,
        media_type = COALESCE(${data.media_type}, media_type),
        status = CASE WHEN ${hasStatus} THEN ${data.status ?? null} ELSE status END,
        adult = CASE WHEN ${hasAdult} THEN ${data.adult ? 1 : 0} ELSE adult END,
        image_src = COALESCE(${data.image_src}, image_src),
        public_rating = COALESCE(${data.public_rating}, public_rating),
        personal_rating = COALESCE(${data.personal_rating}, personal_rating),
        released_at = COALESCE(${data.released_at}, released_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING *
    `;

    return result[0] ? this.toLibraryEntry(result[0] as LibraryEntry) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM library_entries
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  }

  async getTagsByEntryIds(
    userId: string,
    entryIds: string[]
  ): Promise<Map<string, LibraryTag[]>> {
    const tagsByEntryId = new Map<string, LibraryTag[]>();

    if (entryIds.length === 0) {
      return tagsByEntryId;
    }

    const result = await sql`
      SELECT
        library_entry_tags.library_entry_id,
        tags.id,
        tags.value,
        tags.weight
      FROM library_entry_tags
      JOIN tags ON tags.id = library_entry_tags.tag_id
      JOIN library_entries ON library_entries.id = library_entry_tags.library_entry_id
      WHERE library_entries.user_id = ${userId}
      AND library_entry_tags.library_entry_id IN ${sql(entryIds)}
      ORDER BY tags.value ASC
    `;

    for (const row of result as Array<
      LibraryTag & { library_entry_id: string }
    >) {
      const tags = tagsByEntryId.get(row.library_entry_id) ?? [];
      tags.push({
        id: row.id,
        value: row.value,
        weight: row.weight,
      });
      tagsByEntryId.set(row.library_entry_id, tags);
    }

    return tagsByEntryId;
  }

  async findOrCreateTag({
    userId,
    value,
    weight,
  }: {
    userId: string;
    value: string;
    weight: LibraryTagWeight;
  }): Promise<LibraryTag> {
    await sql`
      INSERT INTO tags (id, user_id, value, weight)
      VALUES (${crypto.randomUUID()}, ${userId}, ${value}, ${weight})
      ON CONFLICT(value, weight, user_id) DO NOTHING
    `;

    const result = await sql`
      SELECT id, value, weight
      FROM tags
      WHERE user_id = ${userId}
      AND value = ${value}
      AND weight = ${weight}
      LIMIT 1
    `;

    return result[0] as LibraryTag;
  }

  async linkTag(entryId: string, tagId: string): Promise<void> {
    await sql`
      INSERT INTO library_entry_tags (library_entry_id, tag_id)
      VALUES (${entryId}, ${tagId})
      ON CONFLICT(library_entry_id, tag_id) DO NOTHING
    `;
  }

  async updateEntryFromEnrichment({
    entryId,
    userId,
    data,
    mode,
  }: {
    entryId: string;
    userId: string;
    data: EnrichedLibraryEntryUpdateData;
    mode: EnrichmentUpdateMode;
  }): Promise<LibraryEntryWithTags | null> {
    const currentEntry = await this.getByIdWithTags(entryId, userId);
    if (!currentEntry) return null;

    const updates = this.getEnrichmentScalarUpdates(currentEntry, data, mode);
    const columns = Object.keys(updates);
    if (columns.length > 0) {
      const setClause = columns
        .map((column) => `${column} = ?`)
        .concat("updated_at = CURRENT_TIMESTAMP")
        .join(", ");

      await sql.unsafe(
        `UPDATE library_entries SET ${setClause} WHERE id = ? AND user_id = ?`,
        [...Object.values(updates), entryId, userId]
      );
    }

    if (data.tags) {
      const updateTags =
        mode === "override" ? this.replaceEntryTags : this.addEntryTags;
      await updateTags.call(this, {
        entryId,
        userId,
        tags: data.tags,
      });
    }

    return this.getByIdWithTags(entryId, userId);
  }

  private getEnrichmentScalarUpdates(
    currentEntry: LibraryEntry,
    data: EnrichedLibraryEntryUpdateData,
    mode: EnrichmentUpdateMode
  ): Partial<Record<EnrichmentScalarColumn, unknown>> {
    const updates: Partial<Record<EnrichmentScalarColumn, unknown>> = {};

    for (const column of ENRICHMENT_SCALAR_COLUMNS) {
      if (!Object.hasOwn(data, column)) continue;

      const value = data[column];
      if (mode === "add") {
        if (!this.isMissingEnrichmentValue(currentEntry[column])) continue;
        if (this.isMissingEnrichmentValue(value)) continue;
      }

      updates[column] = value ?? null;
    }

    return updates;
  }

  private isMissingEnrichmentValue(value: unknown): boolean {
    return (
      value === null || value === undefined || value === "" || value === false
    );
  }

  async replaceEntryTags({
    entryId,
    userId,
    tags,
  }: {
    entryId: string;
    userId: string;
    tags: Array<{ value: string; weight: LibraryTagWeight }>;
  }): Promise<void> {
    if (!(await this.userOwnsEntry(entryId, userId))) return;

    await sql`
      DELETE FROM library_entry_tags
      WHERE library_entry_id = ${entryId}
    `;

    await this.addEntryTags({ entryId, userId, tags });
  }

  async addEntryTags({
    entryId,
    userId,
    tags,
  }: {
    entryId: string;
    userId: string;
    tags: Array<{ value: string; weight: LibraryTagWeight }>;
  }): Promise<void> {
    if (!(await this.userOwnsEntry(entryId, userId))) return;

    for (const tag of tags) {
      const savedTag = await this.findOrCreateTag({
        userId,
        value: tag.value,
        weight: tag.weight,
      });
      await this.linkTag(entryId, savedTag.id);
    }
  }

  private async userOwnsEntry(
    entryId: string,
    userId: string
  ): Promise<boolean> {
    const result = await sql`
      SELECT 1
      FROM library_entries
      WHERE id = ${entryId}
      AND user_id = ${userId}
      LIMIT 1
    `;

    return result.length > 0;
  }

  async getByIdWithTags(
    entryId: string,
    userId: string
  ): Promise<LibraryEntryWithTags | null> {
    const result = await sql`
      SELECT
        library_entries.*,
        COALESCE((
          SELECT json_group_array(json_object(
            'id', tags.id,
            'value', tags.value,
            'weight', tags.weight
          ))
          FROM library_entry_tags
          JOIN tags ON tags.id = library_entry_tags.tag_id
          WHERE library_entry_tags.library_entry_id = library_entries.id
        ), '[]') AS tags
      FROM library_entries
      WHERE library_entries.id = ${entryId}
      AND library_entries.user_id = ${userId}
      LIMIT 1
    `;

    const row = result[0] as (LibraryEntry & { tags: string }) | undefined;
    if (!row) return null;

    return {
      ...this.toLibraryEntry(row),
      tags: JSON.parse(row.tags) as LibraryTag[],
    };
  }

  private toLibraryEntry(
    row: Omit<LibraryEntry, "adult"> & { adult: boolean | number }
  ): LibraryEntry {
    return {
      ...row,
      adult: row.adult === true || row.adult === 1,
    };
  }
}

export const libraryModel = new LibraryModel();
