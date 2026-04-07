import { applySchema, seed } from "../db";

await applySchema();
await seed();
