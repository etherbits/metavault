import { sql } from "../db";

export class UserModel {
  static async createUser(data: CreateUserData): Promise<User> {
    const { username, email, password_hash, is_verified = 0 } = data;
    const id = crypto.randomUUID();

    const result = await sql`
      INSERT INTO users (id, username, email, password_hash, is_verified)
      VALUES (${id}, ${username}, ${email}, ${password_hash}, ${is_verified})
      RETURNING *
    `;

    return result[0] as User;
  }

  static async getUserById(id: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;

    return (result[0] as User) || null;
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;

    return (result[0] as User) || null;
  }

  static async getUserByUsername(username: string): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;

    return (result[0] as User) || null;
  }

  static async getUsers(): Promise<User[]> {
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;

    return result as User[];
  }

  static async deleteUser(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM users WHERE id = ${id}
    `;

    return result.length > 0;
  }

  static async verifyUser(id: string): Promise<User | null> {
    const result = await sql`
    UPDATE users
    SET is_verified = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

    return (result[0] as User) || null;
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
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
  is_verified?: number;
}
