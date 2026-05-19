import { Router } from "express";
import { sql } from "../db";
import { validatedRoute } from "../middleware/validation";
import { ezqQuerySchema } from "./ezq.schema";
import { EzqService } from "./ezq.service";

const ezqService = new EzqService(sql);

export const ezqRouter = Router().post(
  "/",
  ...validatedRoute({ auth: true, body: ezqQuerySchema }, async (req, res) => {
    const result = await ezqService.execute(req.body.query, {
      user_id: req.user.userId,
    });

    if (!result.ok) {
      return res.status(result.status).json({ message: result.error });
    }

    return res.json({ rows: result.rows });
  })
);
