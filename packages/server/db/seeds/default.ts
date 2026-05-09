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

  const aliceEntry1 = {
    id: crypto.randomUUID(),
    user_id: alice.id,
    media_id: "tt0111161",
    image_src:
      "https://res.cloudinary.com/dxvhcwyxe/image/upload/f_auto,dpr_auto,w_640,q_auto,c_fill,h_480,g_auto/ugc/breed/7d81f4f8-c6d8-47c8-af42-7199d5c9866e",
    media_type: "movie",
    status: "completed",
    personal_rating: 9.5,
  };
  const aliceEntry2 = {
    id: crypto.randomUUID(),
    user_id: alice.id,
    media_id: "tt0068646",
    media_type: "movie",
    status: "watching",
    personal_rating: null,
  };

  await sql`INSERT INTO library_entries ${sql(aliceEntry1)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO library_entries ${sql(aliceEntry2)} ON CONFLICT DO NOTHING`;

  const favorites = {
    id: crypto.randomUUID(),
    name: "Favorites",
  };
  const watchlist = {
    id: crypto.randomUUID(),
    name: "Watchlist",
  };

  await sql`INSERT INTO collections ${sql(favorites)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO collections ${sql(watchlist)} ON CONFLICT DO NOTHING`;

  await sql`INSERT INTO collection_entries ${sql({
    id: crypto.randomUUID(),
    collection_id: favorites.id,
    library_entry_id: aliceEntry1.id,
  })} ON CONFLICT DO NOTHING`;

  await sql`INSERT INTO collection_entries ${sql({
    id: crypto.randomUUID(),
    collection_id: watchlist.id,
    library_entry_id: aliceEntry2.id,
  })} ON CONFLICT DO NOTHING`;
}
