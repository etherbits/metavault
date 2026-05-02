import { sql } from "../db";

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

  created_at: string;
  updated_at: string;
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
}

export class LibraryModel {
  // CREATE
  static async create(
    data: CreateLibraryEntryData & { id: string },
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
        personal_rating
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
        ${data.personal_rating ?? null}
      )
      RETURNING *
    `;

    return result[0] as LibraryEntry;
  }

  // GET BY ID
  static async getById(id: string): Promise<LibraryEntry | null> {
    const result = await sql`
      SELECT * FROM library_entries WHERE id = ${id}
    `;

    return (result[0] as LibraryEntry) || null;
  }

  // GET ALL USER ENTRIES
  static async getByUser(userId: string): Promise<LibraryEntry[]> {
    const result = await sql`
      SELECT * FROM library_entries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return result as LibraryEntry[];
  }

  // UPDATE
  static async update(
    id: string,
    userId: string,
    data: UpdateLibraryEntryData,
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING *
    `;

    return (result[0] as LibraryEntry) || null;
  }

  // DELETE
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM library_entries
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  }
}
