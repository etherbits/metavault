import { sql } from "../packages/server/db";
import { TEST_USER_ID } from "./test-user";

await sql`
  INSERT INTO users (id, username, email, password_hash)
  VALUES (${TEST_USER_ID}, 'e2e', 'e2e@test.local', 'no-hash')
  ON CONFLICT DO NOTHING
`;
