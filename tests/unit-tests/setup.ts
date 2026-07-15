import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const testRoot = mkdtempSync(path.join(tmpdir(), "metavault-unit-"));

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "unit-secret";
process.env.DATABASE_URL = `sqlite://${path.join(testRoot, "db.sqlite")}`;
