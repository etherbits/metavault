import type { SQL } from "bun";

export async function defaultSeed(sql: SQL) {
  const alice = {
    id: "seed-user-alice",
    username: "alice",
    email: "alice@example.com",
    password_hash: "hashed_password_1",
  };
  const bob = {
    id: "seed-user-bob",
    username: "bob",
    email: "bob@example.com",
    password_hash: "hashed_password_2",
  };

  await sql`INSERT INTO users ${sql(alice)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO users ${sql(bob)} ON CONFLICT DO NOTHING`;

  const aliceRows = (await sql`
    SELECT id FROM users WHERE username = ${alice.username}
  `) as Array<{ id: string }>;
  const aliceId = aliceRows[0]?.id ?? alice.id;

  const aliceEntry1 = {
    id: "seed-entry-shawshank",
    user_id: aliceId,
    title: "The Shawshank Redemption",
    media_id: "tt0111161",
    image_src:
      "https://res.cloudinary.com/dxvhcwyxe/image/upload/f_auto,dpr_auto,w_640,q_auto,c_fill,h_480,g_auto/ugc/breed/7d81f4f8-c6d8-47c8-af42-7199d5c9866e",
    media_type: "movie",
    status: "finished",
    personal_rating: 9.5,
  };
  const aliceEntry2 = {
    id: "seed-entry-godfather",
    user_id: aliceId,
    title: "The Godfather",
    media_id: "tt0068646",
    media_type: "movie",
    status: "in_progress",
    personal_rating: null,
  };

  await sql`INSERT INTO library_entries ${sql(aliceEntry1)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO library_entries ${sql(aliceEntry2)} ON CONFLICT DO NOTHING`;

  const favorites = {
    id: "seed-collection-favorites",
    user_id: aliceId,
    name: "Favorites",
  };
  const watchlist = {
    id: "seed-collection-watchlist",
    user_id: aliceId,
    name: "Watchlist",
  };

  await sql`INSERT INTO collections ${sql(favorites)} ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO collections ${sql(watchlist)} ON CONFLICT DO NOTHING`;

  await sql`INSERT INTO collection_entries ${sql({
    id: "seed-collection-entry-favorite-shawshank",
    collection_id: favorites.id,
    library_entry_id: aliceEntry1.id,
  })} ON CONFLICT DO NOTHING`;

  await sql`INSERT INTO collection_entries ${sql({
    id: "seed-collection-entry-watchlist-godfather",
    collection_id: watchlist.id,
    library_entry_id: aliceEntry2.id,
  })} ON CONFLICT DO NOTHING`;
}
