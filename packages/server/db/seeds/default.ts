import type { SQL } from "bun";

export async function defaultSeed(sql: SQL) {
  const alice = {
    id: crypto.randomUUID(),
    username: "alice",
    email: "alice@example.com",
    password_hash: "hashed_password_1",
  };
  const bob = {
    id: crypto.randomUUID(),
    username: "bob",
    email: "bob@example.com",
    password_hash: "hashed_password_2",
  };

  await sql`INSERT INTO users ${sql(alice)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO users ${sql(bob)} ON CONFLICT DO NOTHING`;

  await sql`INSERT INTO library_entries ${sql({
    id: crypto.randomUUID(),
    user_id: alice.id,
    media_id: "tt0111161",
    media_type: "movie",
    status: "completed",
    personal_rating: 9.5,
  })} ON CONFLICT DO NOTHING`;

  await sql`INSERT INTO library_entries ${sql({
    id: crypto.randomUUID(),
    user_id: alice.id,
    media_id: "tt0068646",
    media_type: "movie",
    status: "watching",
    personal_rating: null,
  })} ON CONFLICT DO NOTHING`;
}
