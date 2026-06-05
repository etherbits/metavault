import type { SQL } from "bun";

export async function createCatalogueEntriesTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS catalogue_entries (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_media_id TEXT NOT NULL,
      media_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_src TEXT,
      adult INTEGER NOT NULL DEFAULT 0,
      public_rating REAL,
      popularity INTEGER,
      released_at DATETIME,
      genres_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      embedding_text_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_catalogue_entries_source_media
    ON catalogue_entries(source_type, source_media_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_catalogue_entries_filters
    ON catalogue_entries(source_type, media_type, adult, public_rating, released_at)
  `;
}

export async function createCatalogueEmbeddingsTable(sql: SQL) {
  await sql`
    CREATE TABLE IF NOT EXISTS catalogue_embeddings (
      catalogue_entry_id TEXT NOT NULL,
      embedding_model TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      embedding_blob BLOB NOT NULL,
      embedding_text_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (catalogue_entry_id, embedding_model),
      FOREIGN KEY (catalogue_entry_id) REFERENCES catalogue_entries(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_catalogue_embeddings_model
    ON catalogue_embeddings(embedding_model)
  `;
}

export async function createCatalogueTables(sql: SQL) {
  await createCatalogueEntriesTable(sql);
  await createCatalogueEmbeddingsTable(sql);
}
