import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import { assistantChatSchema } from "./assistant.schema";
import { assistantService } from "./assistant.service";

export const assistantRouter = Router().post(
  "/chat",
  ...validatedRoute(
    {
      auth: true,
      body: assistantChatSchema,
    },
    async (req, res) => {
      const result = await assistantService.chat({
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
