import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  sourceIntegrationParamsSchema,
  updateSourceIntegrationSchema,
} from "./source-integration.schema";
import { sourceIntegrationService } from "./source-integration.service";

export const sourceIntegrationRouter = Router()
  .get(
    "/",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await sourceIntegrationService.getSettings(
        req.user.userId
      );
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .put(
    "/:type",
    ...validatedRoute(
      {
        auth: true,
        params: sourceIntegrationParamsSchema,
        body: updateSourceIntegrationSchema,
      },
      async (req, res) => {
        const result = await sourceIntegrationService.updateSettings({
          userId: req.user.userId,
          integrationType: req.params.type,
          body: req.body,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  );
