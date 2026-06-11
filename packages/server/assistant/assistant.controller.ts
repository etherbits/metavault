import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  assistantChatSchema,
  assistantSessionParamsSchema,
  upsertAssistantSessionSchema,
} from "./assistant.schema";
import { assistantService } from "./assistant.service";

export const assistantRouter = Router()
  .get(
    "/sessions",
    ...validatedRoute(
      {
        auth: true,
      },
      async (req, res) => {
        const result = await assistantService.getSessions(req.user.userId);
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .put(
    "/sessions/:id",
    ...validatedRoute(
      {
        auth: true,
        params: assistantSessionParamsSchema,
        body: upsertAssistantSessionSchema,
      },
      async (req, res) => {
        const result = await assistantService.upsertSession({
          id: req.params.id,
          userId: req.user.userId,
          input: req.body,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .post(
    "/chat/stream",
    ...validatedRoute(
      {
        auth: true,
        body: assistantChatSchema,
      },
      async (req, res) => {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const result = await assistantService.streamChat({
          userId: req.user.userId,
          input: req.body,
          onDelta: (delta) => {
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
          },
        });

        if (!result.ok) {
          res.write(
            `event: error\ndata: ${JSON.stringify({ message: result.error.message })}\n\n`
          );
          return res.end();
        }

        res.write(
          `event: done\ndata: ${JSON.stringify({ message: result.data.message })}\n\n`
        );
        return res.end();
      }
    )
  )
  .post(
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
