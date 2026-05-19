import { sql } from "../db";

export type LibraryTagWeight = "major" | "minor";

export interface LibraryEntry {
  id: string;
  user_id: string;

  title: string | null;

  media_id: string | null;
  source_id: string | null;

  media_type: string | null;
  status: string | null;

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
  source_id?: string;

  media_type?: string;
  status?: string;

  image_src?: string;

  public_rating?: number;
  personal_rating?: number;

  released_at?: string;
}

export interface UpdateLibraryEntryData {
  title?: string;

  media_id?: string;
  source_id?: string;

  media_type?: string;
  status?: string;

  image_src?: string;

  public_rating?: number;
  personal_rating?: number;

  released_at?: string;
}

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
        ${data.image_src ?? null},
        ${data.public_rating ?? null},
        ${data.personal_rating ?? null},
        ${data.released_at ?? null}
      )
      RETURNING *
    `;

    return result[0] as LibraryEntry;
  }

  async getById(id: string): Promise<LibraryEntry | null> {
    const result = await sql`
      SELECT * FROM library_entries WHERE id = ${id}
    `;

    return (result[0] as LibraryEntry) || null;
  }

  async getByUser(userId: string): Promise<LibraryEntry[]> {
    const result = await sql`
      SELECT * FROM library_entries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return result as LibraryEntry[];
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

    return result as LibraryEntry[];
  }

  async update(
    id: string,
    userId: string,
    data: UpdateLibraryEntryData
  ): Promise<LibraryEntry | null> {
    const result = await sql`
      UPDATE library_entries
      SET
        title = COALESCE(${data.title}, title),
        media_id = COALESCE(${data.media_id}, media_id),
        source_id = COALESCE(${data.source_id}, source_id),
        media_type = COALESCE(${data.media_type}, media_type),
        status = COALESCE(${data.status}, status),
        image_src = COALESCE(${data.image_src}, image_src),
        public_rating = COALESCE(${data.public_rating}, public_rating),
        personal_rating = COALESCE(${data.personal_rating}, personal_rating),
        released_at = COALESCE(${data.released_at}, released_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING *
    `;

    return (result[0] as LibraryEntry) || null;
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
}

export const libraryModel = new LibraryModel();
