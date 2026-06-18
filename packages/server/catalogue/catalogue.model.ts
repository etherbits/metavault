import { sql } from "../db";
import type { EntryMediaType } from "../db/schema/libraryEntries";

export type CatalogueSourceType = "anilist" | "tmdb" | "igdb" | "openlibrary";

export type CatalogueEntryData = {
  id: string;
  source_type: CatalogueSourceType;
  source_media_id: string;
  media_type: Exclude<EntryMediaType, "other">;
  title: string;
  description: string | null;
  image_src: string | null;
  adult: boolean;
  public_rating: number | null;
  popularity: number | null;
  released_at: string | null;
  genres: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  embedding_text_hash: string;
};

export type CatalogueEntry = CatalogueEntryData & {
  created_at: string;
  updated_at: string;
};

export type CataloguePullMediaType = Exclude<EntryMediaType, "other"> | "all";

type RawCatalogueRow = Omit<
  CatalogueEntry,
  "adult" | "genres" | "tags" | "metadata"
> & {
  adult: number;
  genres_json: string;
  tags_json: string;
  metadata_json: string;
};

type RawCandidateRow = RawCatalogueRow & {
  embedding_model: string;
  dimensions: number;
  embedding_blob: Buffer | Uint8Array;
};

class CatalogueModel {
  async upsertEntry(data: CatalogueEntryData) {
    const rows = await sql`
      INSERT INTO catalogue_entries (
        id,
        source_type,
        source_media_id,
        media_type,
        title,
        description,
        image_src,
        adult,
        public_rating,
        popularity,
        released_at,
        genres_json,
        tags_json,
        metadata_json,
        embedding_text_hash
      )
      VALUES (
        ${data.id},
        ${data.source_type},
        ${data.source_media_id},
        ${data.media_type},
        ${data.title},
        ${data.description},
        ${data.image_src},
        ${data.adult ? 1 : 0},
        ${data.public_rating},
        ${data.popularity},
        ${data.released_at},
        ${JSON.stringify(data.genres)},
        ${JSON.stringify(data.tags)},
        ${JSON.stringify(data.metadata)},
        ${data.embedding_text_hash}
      )
      ON CONFLICT(source_type, source_media_id, media_type) DO UPDATE SET
        media_type = excluded.media_type,
        title = excluded.title,
        description = excluded.description,
        image_src = excluded.image_src,
        adult = excluded.adult,
        public_rating = excluded.public_rating,
        popularity = excluded.popularity,
        released_at = excluded.released_at,
        genres_json = excluded.genres_json,
        tags_json = excluded.tags_json,
        metadata_json = excluded.metadata_json,
        embedding_text_hash = excluded.embedding_text_hash,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return this.toCatalogueEntry(rows[0] as RawCatalogueRow);
  }

  async getEntriesNeedingEmbedding(input: { embeddingModel: string }) {
    const rows = await sql`
      SELECT catalogue_entries.*
      FROM catalogue_entries
      LEFT JOIN catalogue_embeddings
        ON catalogue_embeddings.catalogue_entry_id = catalogue_entries.id
        AND catalogue_embeddings.embedding_model = ${input.embeddingModel}
      WHERE (
        catalogue_embeddings.catalogue_entry_id IS NULL
        OR catalogue_embeddings.embedding_text_hash != catalogue_entries.embedding_text_hash
      )
      ORDER BY catalogue_entries.updated_at ASC
    `;

    return (rows as RawCatalogueRow[]).map((row) => this.toCatalogueEntry(row));
  }

  async upsertEmbedding(data: {
    catalogueEntryId: string;
    embeddingModel: string;
    dimensions: number;
    embeddingBlob: Buffer;
    embeddingTextHash: string;
  }) {
    await sql`
      INSERT INTO catalogue_embeddings (
        catalogue_entry_id,
        embedding_model,
        dimensions,
        embedding_blob,
        embedding_text_hash
      )
      VALUES (
        ${data.catalogueEntryId},
        ${data.embeddingModel},
        ${data.dimensions},
        ${data.embeddingBlob},
        ${data.embeddingTextHash}
      )
      ON CONFLICT(catalogue_entry_id, embedding_model) DO UPDATE SET
        dimensions = excluded.dimensions,
        embedding_blob = excluded.embedding_blob,
        embedding_text_hash = excluded.embedding_text_hash,
        updated_at = CURRENT_TIMESTAMP
    `;
  }

  async getCandidates(input: {
    userId: string;
    embeddingModel: string;
    adult: "exclude" | "include" | "only";
    excludedMediaTypes: EntryMediaType[];
    releaseYearFrom?: number;
    releaseYearTo?: number;
    minPublicRating?: number;
    excludeExistingLibrary: boolean;
  }) {
    const params: unknown[] = [input.embeddingModel];
    const where = [
      "catalogue_embeddings.embedding_text_hash = catalogue_entries.embedding_text_hash",
    ];

    if (input.adult === "exclude") {
      where.push("catalogue_entries.adult = 0");
    } else if (input.adult === "only") {
      where.push("catalogue_entries.adult = 1");
    }

    if (input.excludedMediaTypes.length > 0) {
      const placeholders = input.excludedMediaTypes.map(() => "?").join(", ");
      where.push(`catalogue_entries.media_type NOT IN (${placeholders})`);
      params.push(...input.excludedMediaTypes);
    }

    if (input.releaseYearFrom !== undefined) {
      where.push(
        "CAST(strftime('%Y', catalogue_entries.released_at) AS INTEGER) >= ?"
      );
      params.push(input.releaseYearFrom);
    }

    if (input.releaseYearTo !== undefined) {
      where.push(
        "CAST(strftime('%Y', catalogue_entries.released_at) AS INTEGER) <= ?"
      );
      params.push(input.releaseYearTo);
    }

    if (input.minPublicRating !== undefined) {
      where.push("catalogue_entries.public_rating >= ?");
      params.push(input.minPublicRating);
    }

    if (input.excludeExistingLibrary) {
      where.push(`NOT EXISTS (
        SELECT 1
        FROM library_entries
        WHERE library_entries.user_id = ?
        AND library_entries.media_id = catalogue_entries.source_media_id
        AND library_entries.media_type = catalogue_entries.media_type
      )`);
      params.push(input.userId);
    }

    const rows = await sql.unsafe(
      `
        SELECT
          catalogue_entries.*,
          catalogue_embeddings.embedding_model,
          catalogue_embeddings.dimensions,
          catalogue_embeddings.embedding_blob
        FROM catalogue_entries
        JOIN catalogue_embeddings
          ON catalogue_embeddings.catalogue_entry_id = catalogue_entries.id
          AND catalogue_embeddings.embedding_model = ?
        WHERE ${where.join(" AND ")}
      `,
      params
    );

    return (rows as RawCandidateRow[]).map((row) => ({
      ...this.toCatalogueEntry(row),
      embedding_model: row.embedding_model,
      dimensions: row.dimensions,
      embedding_blob: row.embedding_blob,
    }));
  }

  async getTopEntries(input: {
    userId: string;
    mediaType: CataloguePullMediaType;
    limit: number;
    excludeExistingLibrary: boolean;
  }) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (input.mediaType !== "all") {
      where.push("catalogue_entries.media_type = ?");
      params.push(input.mediaType);
    }

    if (input.excludeExistingLibrary) {
      where.push(`NOT EXISTS (
        SELECT 1
        FROM library_entries
        WHERE library_entries.user_id = ?
        AND library_entries.media_id = catalogue_entries.source_media_id
        AND library_entries.media_type = catalogue_entries.media_type
      )`);
      params.push(input.userId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await sql.unsafe(
      `
        SELECT catalogue_entries.*
        FROM catalogue_entries
        ${whereClause}
        ORDER BY
          catalogue_entries.popularity IS NULL ASC,
          catalogue_entries.popularity DESC,
          catalogue_entries.public_rating IS NULL ASC,
          catalogue_entries.public_rating DESC,
          catalogue_entries.title ASC
        LIMIT ?
      `,
      [...params, input.limit]
    );

    return (rows as RawCatalogueRow[]).map((row) => this.toCatalogueEntry(row));
  }

  private toCatalogueEntry(row: RawCatalogueRow): CatalogueEntry {
    return {
      id: row.id,
      source_type: row.source_type,
      source_media_id: row.source_media_id,
      media_type: row.media_type,
      title: row.title,
      description: row.description,
      image_src: row.image_src,
      adult: row.adult === 1,
      public_rating: row.public_rating,
      popularity: row.popularity,
      released_at: row.released_at,
      genres: this.parseStringArray(row.genres_json),
      tags: this.parseStringArray(row.tags_json),
      metadata: this.parseMetadata(row.metadata_json),
      embedding_text_hash: row.embedding_text_hash,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private parseStringArray(value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  private parseMetadata(value: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}

export const catalogueModel = new CatalogueModel();
