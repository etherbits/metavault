import { sql } from "../db";

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionEntry {
  id: string;
  collection_id: string;
  library_entry_id: string;
}

export type CollectionWithEntries = Collection & {
  entries: string;
};

class CollectionModel {
  async create(data: {
    id: string;
    user_id: string;
    name: string;
  }): Promise<Collection> {
    const result = await sql`
      INSERT INTO collections (id, user_id, name)
      VALUES (${data.id}, ${data.user_id}, ${data.name})
      RETURNING *
    `;

    return result[0] as Collection;
  }

  async createEntries(collectionId: string, libraryEntryIds: string[]) {
    for (const libraryEntryId of libraryEntryIds) {
      await sql`
        INSERT INTO collection_entries (id, collection_id, library_entry_id)
        VALUES (${crypto.randomUUID()}, ${collectionId}, ${libraryEntryId})
      `;
    }
  }

  async getByUser(userId: string): Promise<CollectionWithEntries[]> {
    const result = await sql`
      SELECT
        c.*,
        COALESCE(
          json_group_array(
            CASE
              WHEN ce.id IS NOT NULL THEN json_object(
                'id', ce.id,
                'collection_id', ce.collection_id,
                'library_entry_id', ce.library_entry_id
              )
            END
          ),
          '[]'
        ) AS entries
      FROM collections c
      LEFT JOIN collection_entries ce ON ce.collection_id = c.id
      WHERE c.user_id = ${userId}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    return result as CollectionWithEntries[];
  }

  async getById(id: string): Promise<Collection | null> {
    const result = await sql`
      SELECT * FROM collections WHERE id = ${id}
    `;

    return (result[0] as Collection) || null;
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string }
  ): Promise<Collection | null> {
    const result = await sql`
      UPDATE collections
      SET
        name = COALESCE(${data.name}, name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING *
    `;

    return (result[0] as Collection) || null;
  }

  async replaceEntries(collectionId: string, libraryEntryIds: string[]) {
    await sql`
      DELETE FROM collection_entries
      WHERE collection_id = ${collectionId}
    `;

    await this.createEntries(collectionId, libraryEntryIds);
  }

  async removeEntries(collectionId: string, libraryEntryIds: string[]) {
    await sql`
      DELETE FROM collection_entries
      WHERE collection_id = ${collectionId}
      AND library_entry_id IN ${sql(libraryEntryIds)}
    `;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM collections
      WHERE id = ${id}
      AND user_id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  }

  async countOwnedLibraryEntries(
    userId: string,
    libraryEntryIds: string[]
  ): Promise<number> {
    if (libraryEntryIds.length === 0) {
      return 0;
    }

    const result = await sql`
      SELECT COUNT(*) as count
      FROM library_entries
      WHERE user_id = ${userId}
      AND id IN ${sql(libraryEntryIds)}
    `;

    return Number(result[0]?.count ?? 0);
  }
}

export const collectionModel = new CollectionModel();
