import { createCatalogueTables } from "../schema/catalogue";
import type { Migration } from "./types";

export const catalogueMigration: Migration = {
  id: "005",
  name: "catalogue",
  async up(sql) {
    await createCatalogueTables(sql);
  },
};
