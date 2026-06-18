import type { Migration } from "./types";

export const userAvatarUrlMigration: Migration = {
  id: "008",
  name: "user_avatar_url",
  async up(sql) {
    const columns = (await sql`PRAGMA table_info(users)`) as Array<{
      name: string;
    }>;

    if (columns.some((column) => column.name === "avatar_url")) {
      return;
    }

    await sql`
      ALTER TABLE users
      ADD COLUMN avatar_url TEXT
    `;
  },
};
