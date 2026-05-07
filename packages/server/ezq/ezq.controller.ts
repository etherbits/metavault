import { Router } from "express";
import type { Extras } from "../../ezq/out/node/ezq.js";
import { sql } from "../db";
import { EzqService } from "./ezq.service";

const ezqService = new EzqService(sql);

export const ezqRouter = Router().post("/", async (req, res) => {
  const { query, extras } = req.body as {
    query: string;
    extras?: Extras;
  };

  const result = await ezqService.execute(query, extras ?? null);

  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.json({ rows: result.rows });
});
