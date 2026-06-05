import type { SQL } from "bun";

export type Migration = {
  id: string;
  name: string;
  up: (sql: SQL) => Promise<void>;
};
