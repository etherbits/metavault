import { sql } from "../db";

class UserModel {
  async createUser(data: CreateUserData): Promise<User> {
    const { username, email, password_hash, is_verified = 0 } = data;
    const id = crypto.randomUUID();

    const result = await sql`
      INSERT INTO users (id, username, email, password_hash, is_verified)
      VALUES (${id}, ${username}, ${email}, ${password_hash}, ${is_verified})
      RETURNING *
    `;

    return result[0] as User;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;

    return (result[0] as User) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    return (result[0] as User) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;

    return (result[0] as User) || null;
  }

  async getUsers(): Promise<User[]> {
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;

    return result as User[];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await sql.begin(async (tx) => {
      const current = await tx`
        SELECT id FROM users WHERE id = ${id}
      `;

      if (current.length === 0) {
        return [];
      }

      await tx`DELETE FROM assistant_sessions WHERE user_id = ${id}`;
      await tx`DELETE FROM otp_codes WHERE user_id = ${id}`;
      await tx`DELETE FROM alias_mappings WHERE user_id = ${id}`;
      await tx`DELETE FROM ai_integrations WHERE user_id = ${id}`;
      await tx`DELETE FROM collections WHERE user_id = ${id}`;
      await tx`DELETE FROM library_entries WHERE user_id = ${id}`;
      await tx`DELETE FROM tags WHERE user_id = ${id}`;
      await tx`DELETE FROM source_integrations WHERE user_id = ${id}`;

      return tx`
        DELETE FROM users WHERE id = ${id}
        RETURNING id
      `;
    });

    return result.length > 0;
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User | null> {
    const current = await this.getUserById(id);
    if (!current) {
      return null;
    }

    const result = await sql`
      UPDATE users
      SET
        username = ${data.username ?? current.username},
        email = ${data.email ?? current.email},
        password_hash = ${data.password_hash ?? current.password_hash},
        avatar_url = ${data.avatar_url ?? current.avatar_url},
        is_verified = ${data.is_verified ?? current.is_verified},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    return (result[0] as User) || null;
  }

  async verifyUser(id: string): Promise<User | null> {
    const result = await sql`
    UPDATE users
    SET is_verified = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

    return (result[0] as User) || null;
  }
}

export const userModel = new UserModel();

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  is_verified: number;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password_hash: string;
  is_verified?: number;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password_hash?: string;
  avatar_url?: string | null;
  is_verified?: number;
}
