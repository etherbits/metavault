import { Router } from "express";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  collectionIdSchema,
  createCollectionSchema,
  removeCollectionEntriesSchema,
  updateCollectionSchema,
} from "./collection.schema";
import { collectionService } from "./collection.service";

const collectionRouter = Router()
  .post(
    "/",
    ...validatedRoute(
      { auth: true, body: createCollectionSchema },
      async (req, res) => {
        const result = await collectionService.createCollection({
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
    "/",
    ...validatedRoute({ auth: true }, async (req, res) => {
      const result = await collectionService.getUserCollections(
        req.user.userId
      );
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .get(
    "/:id",
    ...validatedRoute(
      { auth: true, params: collectionIdSchema },
      async (req, res) => {
        const result = await collectionService.getCollectionById({
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
  .patch(
    "/:id",
    ...validatedRoute(
      {
        auth: true,
        params: collectionIdSchema,
        body: updateCollectionSchema,
      },
      async (req, res) => {
        const result = await collectionService.updateCollection({
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
    "/:id/entries",
    ...validatedRoute(
      {
        auth: true,
        params: collectionIdSchema,
        body: removeCollectionEntriesSchema,
      },
      async (req, res) => {
        const result = await collectionService.removeCollectionEntries({
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
      { auth: true, params: collectionIdSchema },
      async (req, res) => {
        const result = await collectionService.deleteCollection({
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

export default collectionRouter;
