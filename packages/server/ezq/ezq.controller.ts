import { Router } from "express";
import { sql } from "../db";
import { validatedRoute } from "../middleware/validation";
import { EzqService } from "./ezq.service";

const ezqService = new EzqService(sql);

export const ezqRouter = Router().post(
  "/",
  ...validatedRoute({ auth: true }, async (req, res) => {
    const { query } = req.body as { query: string };

    const result = await ezqService.execute(query, {
      user_id: req.user.userId,
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ rows: result.rows });
  })
);
