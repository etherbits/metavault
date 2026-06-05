import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  aiIntegrationIdParamsSchema,
  aiIntegrationParamsSchema,
  createAiIntegrationProfileSchema,
  updateAiIntegrationProfileSchema,
  updateAiIntegrationSchema,
} from "./ai-integration.schema";
import { aiIntegrationService } from "./ai-integration.service";

export const aiIntegrationRouter = Router()
  .get(
    "/",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await aiIntegrationService.getProfiles(req.user.userId);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .post(
    "/",
    ...validatedRoute(
      {
        auth: true,
        body: createAiIntegrationProfileSchema,
      },
      async (req, res) => {
        const result = await aiIntegrationService.createProfile({
          userId: req.user.userId,
          body: req.body,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.status(201).json(result.data);
      }
    )
  )
  .put(
    "/profiles/:id",
    ...validatedRoute(
      {
        auth: true,
        params: aiIntegrationIdParamsSchema,
        body: updateAiIntegrationProfileSchema,
      },
      async (req, res) => {
        const result = await aiIntegrationService.updateProfile({
          userId: req.user.userId,
          id: req.params.id,
          body: req.body,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .put(
    "/profiles/:id/active",
    ...validatedRoute(
      {
        auth: true,
        params: aiIntegrationIdParamsSchema,
      },
      async (req, res) => {
        const result = await aiIntegrationService.setActiveProfile({
          userId: req.user.userId,
          id: req.params.id,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .delete(
    "/profiles/:id",
    ...validatedRoute(
      {
        auth: true,
        params: aiIntegrationIdParamsSchema,
      },
      async (req, res) => {
        const result = await aiIntegrationService.deleteProfile({
          userId: req.user.userId,
          id: req.params.id,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .get(
    "/settings",
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
