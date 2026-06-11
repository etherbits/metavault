import { SQL } from "bun";
import { parsedEnv } from "../env";
import { logger } from "../logger";
import { migrate } from "./migrations";
import { defaultSeed } from "./seeds/default";

export const sql = new SQL(parsedEnv.DATABASE_URL);

export async function applySchema() {
  await migrate(sql);
  logger.debug("Schema migrations complete.");
}

export async function seed() {
  await defaultSeed(sql);
  logger.debug("Seed complete.");
}
