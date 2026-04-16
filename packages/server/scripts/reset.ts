import { sql, applySchema } from "../db";

await sql`PRAGMA foreign_keys = OFF`;
await sql`DROP TABLE IF EXISTS tags`;
await sql`DROP TABLE IF EXISTS collection_entries`;
await sql`DROP TABLE IF EXISTS content_nodes`;
await sql`DROP TABLE IF EXISTS source_integrations`;
await sql`DROP TABLE IF EXISTS ai_integrations`;
await sql`DROP TABLE IF EXISTS alias_mappings`;
await sql`DROP TABLE IF EXISTS collections`;
await sql`DROP TABLE IF EXISTS otp_codes`;
await sql`DROP TABLE IF EXISTS library_entries`;
await sql`DROP TABLE IF EXISTS users`;
await sql`PRAGMA foreign_keys = ON`;

await applySchema();

console.log("Reset complete. Run db:seed to populate with sample data.");
