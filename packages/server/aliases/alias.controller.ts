import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  aliasMappingParamsSchema,
  upsertAliasMappingSchema,
} from "./alias.schema";
import { aliasMappingService } from "./alias.service";

export const aliasMappingRouter = Router()
  .get(
    "/",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await aliasMappingService.getMappings(req.user.userId);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .put(
    "/:alias",
    ...validatedRoute(
      {
        auth: true,
        params: aliasMappingParamsSchema,
        body: upsertAliasMappingSchema,
      },
      async (req, res) => {
        if (req.params.alias !== req.body.alias) {
          return res
            .status(400)
            .json({ message: "Alias path does not match body" });
        }

        const result = await aliasMappingService.upsertMapping({
          userId: req.user.userId,
          body: req.body,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .delete(
    "/:alias",
    ...validatedRoute(
      {
        auth: true,
        params: aliasMappingParamsSchema,
      },
      async (req, res) => {
        const result = await aliasMappingService.deleteMapping({
          userId: req.user.userId,
          alias: req.params.alias,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  );
