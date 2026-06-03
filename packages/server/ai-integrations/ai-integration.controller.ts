import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  aiIntegrationParamsSchema,
  updateAiIntegrationSchema,
} from "./ai-integration.schema";
import { aiIntegrationService } from "./ai-integration.service";

export const aiIntegrationRouter = Router()
  .get(
    "/",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await aiIntegrationService.getSettings(req.user.userId);
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
        params: aiIntegrationParamsSchema,
        body: updateAiIntegrationSchema,
      },
      async (req, res) => {
        const result = await aiIntegrationService.updateSettings({
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
