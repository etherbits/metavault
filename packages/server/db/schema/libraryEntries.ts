import type { SQL } from "bun";
import { z } from "zod";

export async function createLibraryEntriesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS library_entries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      user_id TEXT NOT NULL,
      media_id TEXT,
      source_id TEXT,
      image_src TEXT,
      media_type TEXT,
      status TEXT,
      public_rating REAL,
      personal_rating REAL,
      released_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (source_id) REFERENCES source_integrations(id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_library_entries_user_id
    ON library_entries(user_id)
  `;
}

export const EntryStatusSchema = z.enum([
  "in_progress",
  "dropped",
  "planning",
  "on_hold",
  "finished",
]);

export type EntryStatus = z.infer<typeof EntryStatusSchema>;

export const EntryMediaTypeSchema = z.enum([
  "movie",
  "tv_show",
  "anime",
  "game",
  "book",
  "manga",
  "other",
]);
export type EntryMediaType = z.infer<typeof EntryMediaTypeSchema>;

export const LibraryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  user_id: z.string(),
  media_id: z.string().nullable(),
  source_id: z.string().nullable(),
  image_src: z.string().nullable(),
  media_type: EntryMediaTypeSchema.nullable(),
  status: EntryStatusSchema.nullable(),
  public_rating: z.number().nullable(),
  personal_rating: z.number().nullable(),
  released_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;
