import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  contentNodeIdSchema,
  createContentNodeSchema,
  updateContentNodeSchema,
} from "./contentNode.schema";
import { contentNodeService } from "./contentNode.service";

const libraryEntryIdSchema = contentNodeIdSchema;

export const contentNodeRouter = Router()
  .post(
    "/",
    ...validatedRoute(
      { auth: true, body: createContentNodeSchema },
      async (req, res) => {
        const result = await contentNodeService.createContentNode({
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
  .get(
    "/:id",
    ...validatedRoute(
      { auth: true, params: contentNodeIdSchema },
      async (req, res) => {
        const result = await contentNodeService.getContentNodeById({
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
    "/library-entry/:id",
    ...validatedRoute(
      { auth: true, params: libraryEntryIdSchema },
      async (req, res) => {
        const result = await contentNodeService.getContentNodesByLibraryEntry({
          userId: req.user.userId,
          libraryEntryId: req.params.id,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .patch(
    "/:id",
    ...validatedRoute(
      {
        auth: true,
        params: contentNodeIdSchema,
        body: updateContentNodeSchema,
      },
      async (req, res) => {
        const result = await contentNodeService.updateContentNode({
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
  .delete(
    "/:id",
    ...validatedRoute(
      { auth: true, params: contentNodeIdSchema },
      async (req, res) => {
        const result = await contentNodeService.deleteContentNode({
          userId: req.user.userId,
          id: req.params.id,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  );
