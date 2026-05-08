import { sql } from "../packages/server/db";
import {
  TEST_AUTH_EMAIL,
  TEST_AUTH_PASSWORD,
  TEST_AUTH_USER_ID,
  TEST_AUTH_USERNAME,
  TEST_DELETABLE_USER_ID,
  TEST_UNVERIFIED_EMAIL,
  TEST_UNVERIFIED_OTP,
  TEST_UNVERIFIED_USER_ID,
  TEST_USER_ID,
} from "./test-user";

const authPasswordHash = await Bun.password.hash(TEST_AUTH_PASSWORD, {
  algorithm: "argon2id",
});

await sql`
  INSERT INTO users (id, username, email, password_hash)
  VALUES (${TEST_USER_ID}, 'e2e', 'e2e@test.local', 'no-hash')
  ON CONFLICT DO NOTHING
`;

await sql`
  INSERT INTO users (id, username, email, password_hash, is_verified)
  VALUES (${TEST_AUTH_USER_ID}, ${TEST_AUTH_USERNAME}, ${TEST_AUTH_EMAIL}, ${authPasswordHash}, 1)
  ON CONFLICT DO NOTHING
`;

await sql`
  INSERT INTO users (id, username, email, password_hash, is_verified)
  VALUES (${TEST_UNVERIFIED_USER_ID}, 'e2e-unverified', ${TEST_UNVERIFIED_EMAIL}, 'no-hash', 0)
  ON CONFLICT DO NOTHING
`;

await sql`
  INSERT INTO otp_codes (id, user_id, otp_code, otp_code_expiration_date)
  VALUES ('e2e-unverified-otp', ${TEST_UNVERIFIED_USER_ID}, ${TEST_UNVERIFIED_OTP}, ${new Date(Date.now() + 10_000_000).toISOString()})
  ON CONFLICT DO NOTHING
`;

await sql`
  INSERT INTO users (id, username, email, password_hash, is_verified)
  VALUES (${TEST_DELETABLE_USER_ID}, 'e2e-deletable', 'e2e-deletable@test.local', 'no-hash', 1)
  ON CONFLICT DO NOTHING
`;
