import { Router } from "express";
import { authMiddleware } from "../middleware/isAuth";
import {
  validateMiddleware,
  validateParamsMiddleware,
} from "../middleware/validation";
import { CollectionService } from "./collection.service";
import {
  collectionIdSchema,
  createCollectionSchema,
  removeCollectionEntriesSchema,
  updateCollectionSchema,
} from "./collection.validation";

const collectionRouter = Router();

collectionRouter.post(
  "/",
  authMiddleware,
  validateMiddleware(createCollectionSchema),
  CollectionService.createCollection,
);
collectionRouter.get("/", authMiddleware, CollectionService.getUserCollections);
collectionRouter.get(
  "/:id",
  authMiddleware,
  validateParamsMiddleware(collectionIdSchema),
  CollectionService.getCollectionById,
);
collectionRouter.patch(
  "/:id",
  authMiddleware,
  validateMiddleware(updateCollectionSchema),
  validateParamsMiddleware(collectionIdSchema),
  CollectionService.updateCollection,
);
collectionRouter.delete(
  "/:id/entries",
  authMiddleware,
  validateMiddleware(removeCollectionEntriesSchema),
  validateParamsMiddleware(collectionIdSchema),
  CollectionService.removeCollectionEntries,
);
collectionRouter.delete(
  "/:id",
  authMiddleware,
  validateParamsMiddleware(collectionIdSchema),
  CollectionService.deleteCollection,
);

export default collectionRouter;
