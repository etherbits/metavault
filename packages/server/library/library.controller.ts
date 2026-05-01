import { Router } from "express";
import { upload } from "../middleware/upload";
import { authMiddleware } from "../middleware/isAuth";
import { LibraryService } from "./library.service";
import {
  validateMiddleware,
  validateParamsMiddleware,
} from "../middleware/validation";
import {
  createLibraryEntrySchema,
  updateLibraryEntrySchema,
  libraryIdSchema,
} from "./library.validation";

const libraryRouter = Router();

libraryRouter.post(
  "/",
  authMiddleware,
  upload.single("image"),
  validateMiddleware(createLibraryEntrySchema),
  LibraryService.createEntry,
);
libraryRouter.get("/", authMiddleware, LibraryService.getUserLibrary);
libraryRouter.get(
  "/:id",
  authMiddleware,
  validateParamsMiddleware(libraryIdSchema),
  LibraryService.getEntriyById,
);
libraryRouter.patch(
  "/:id",
  authMiddleware,
  upload.single("image"),
  validateMiddleware(updateLibraryEntrySchema),
  validateParamsMiddleware(libraryIdSchema),
  LibraryService.updateEntry,
);
libraryRouter.delete(
  "/:id",
  authMiddleware,
  validateParamsMiddleware(libraryIdSchema),
  LibraryService.deleteEntry,
);
libraryRouter.get("/", authMiddleware, LibraryService.getUserLibrary);
libraryRouter.get(
  "/:id",
  authMiddleware,
  validateParamsMiddleware(libraryIdSchema),
  LibraryService.getEntriyById,
);
libraryRouter.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  validateMiddleware(updateLibraryEntrySchema),
  validateParamsMiddleware(libraryIdSchema),
  LibraryService.updateEntry,
);
libraryRouter.delete(
  "/:id",
  authMiddleware,
  validateParamsMiddleware(libraryIdSchema),
  LibraryService.deleteEntry,
);

export default libraryRouter;
