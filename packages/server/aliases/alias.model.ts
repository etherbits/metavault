import { sql } from "../db";

export type AliasMappingRow = {
  id: string;
  user_id: string;
  alias: string;
  expansion: string;
};

class AliasMappingModel {
  async getByUser(userId: string): Promise<AliasMappingRow[]> {
    const rows = await sql`
      SELECT *
      FROM alias_mappings
      WHERE user_id = ${userId}
      ORDER BY alias ASC
    `;

    return rows as AliasMappingRow[];
  }

  async getByUserAndAlias(
    userId: string,
    alias: string
  ): Promise<AliasMappingRow | null> {
    const rows = await sql`
      SELECT *
      FROM alias_mappings
      WHERE user_id = ${userId}
      AND alias = ${alias}
      LIMIT 1
    `;

    return (rows[0] as AliasMappingRow | undefined) ?? null;
  }

  async upsert(data: {
    userId: string;
    alias: string;
    expansion: string;
  }): Promise<AliasMappingRow> {
    const rows = await sql`
      INSERT INTO alias_mappings (id, user_id, alias, expansion)
      VALUES (
        ${crypto.randomUUID()},
        ${data.userId},
        ${data.alias},
        ${data.expansion}
      )
      ON CONFLICT(user_id, alias) DO UPDATE SET
        expansion = excluded.expansion
      RETURNING *
    `;

    return rows[0] as AliasMappingRow;
  }

  async delete(userId: string, alias: string): Promise<boolean> {
    const rows = await sql`
      DELETE FROM alias_mappings
      WHERE user_id = ${userId}
      AND alias = ${alias}
      RETURNING id
    `;

    return rows.length > 0;
  }
}

export const aliasMappingModel = new AliasMappingModel();
