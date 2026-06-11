import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import { generateRecommendationsSchema } from "./recommendation.schema";
import { recommendationService } from "./recommendation.service";

export const recommendationRouter = Router().post(
  "/generate",
  ...validatedRoute(
    {
      auth: true,
      body: generateRecommendationsSchema,
    },
    async (req, res) => {
      const result = await recommendationService.generate({
        userId: req.user.userId,
        input: req.body,
      });
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    }
  )
);
