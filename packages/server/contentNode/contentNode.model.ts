import { sql } from "../db";

export interface ContentNode {
  id: string;
  title: string | null;
  link: string | null;
  order_index: number | null;
  library_entry_id: string;
}

export interface CreateContentNodeData {
  id: string;
  title?: string;
  link?: string;
  order_index?: number;
  library_entry_id: string;
}

export interface UpdateContentNodeData {
  title?: string;
  link?: string;
  order_index?: number;
}

class ContentNodeModel {
  async getNextOrderIndex(libraryEntryId: string): Promise<number> {
    const result = await sql`
      SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order_index
      FROM content_nodes
      WHERE library_entry_id = ${libraryEntryId}
    `;

    return Number((result[0] as { next_order_index: number }).next_order_index);
  }

  async create(data: CreateContentNodeData): Promise<ContentNode> {
    const result = await sql`
      INSERT INTO content_nodes (id, title, link, order_index, library_entry_id)
      VALUES (
        ${data.id},
        ${data.title ?? null},
        ${data.link ?? null},
        ${data.order_index ?? null},
        ${data.library_entry_id}
      )
      RETURNING *
    `;

    return result[0] as ContentNode;
  }

  async getById(id: string): Promise<ContentNode | null> {
    const result = await sql`
      SELECT * FROM content_nodes WHERE id = ${id}
    `;

    return (result[0] as ContentNode) || null;
  }

  async getByLibraryEntryId(libraryEntryId: string): Promise<ContentNode[]> {
    const result = await sql`
      SELECT * FROM content_nodes
      WHERE library_entry_id = ${libraryEntryId}
      ORDER BY order_index ASC, rowid ASC
    `;

    return result as ContentNode[];
  }

  async update(
    id: string,
    data: UpdateContentNodeData
  ): Promise<ContentNode | null> {
    const result = await sql`
      UPDATE content_nodes
      SET
        title = COALESCE(${data.title}, title),
        link = COALESCE(${data.link}, link),
        order_index = COALESCE(${data.order_index}, order_index)
      WHERE id = ${id}
      RETURNING *
    `;

    return (result[0] as ContentNode) || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM content_nodes
      WHERE id = ${id}
      RETURNING id
    `;

    return result.length > 0;
  }

  async getOwnedLibraryEntryById(
    userId: string,
    libraryEntryId: string
  ): Promise<{ id: string } | null> {
    const result = await sql`
      SELECT id FROM library_entries
      WHERE id = ${libraryEntryId}
      AND user_id = ${userId}
      LIMIT 1
    `;

    return (result[0] as { id: string }) || null;
  }

  async getOwnedLibraryEntryByTitle(
    userId: string,
    title: string
  ): Promise<{ id: string } | null> {
    const result = await sql`
      SELECT id FROM library_entries
      WHERE user_id = ${userId}
      AND title = ${title}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return (result[0] as { id: string }) || null;
  }

  async getOwnerByContentNodeId(
    id: string
  ): Promise<{ user_id: string } | null> {
    const result = await sql`
      SELECT library_entries.user_id
      FROM content_nodes
      JOIN library_entries ON library_entries.id = content_nodes.library_entry_id
      WHERE content_nodes.id = ${id}
      LIMIT 1
    `;

    return (result[0] as { user_id: string }) || null;
  }
}

export const contentNodeModel = new ContentNodeModel();
