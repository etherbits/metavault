import { Router } from "express";
import { bundleUpload, imageUpload, upload } from "../middleware/upload";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import {
  createLibraryEntrySchema,
  exportLibraryEntriesSchema,
  libraryIdSchema,
  updateLibraryEntrySchema,
} from "./library.schema";
import { libraryService } from "./library.service";

const libraryRouter = Router()
  .post(
    "/",
    ...validatedRoute(
      {
        auth: true,
        body: createLibraryEntrySchema,
        middleware: [imageUpload.single("image")],
      },
      async (req, res) => {
        const result = await libraryService.createEntry({
          userId: req.user.userId,
          body: req.body,
          imageBuffer: req.file?.buffer,
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
      const result = await libraryService.getUserLibrary(req.user.userId);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    })
  )
  .get(
    "/:id",
    ...validatedRoute(
      { auth: true, params: libraryIdSchema },
      async (req, res) => {
        const result = await libraryService.getEntryById({
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
        params: libraryIdSchema,
        body: updateLibraryEntrySchema,
        middleware: [imageUpload.single("image")],
      },
      async (req, res) => {
        const result = await libraryService.updateEntry({
          userId: req.user.userId,
          id: req.params.id,
          body: req.body,
          imageBuffer: req.file?.buffer,
        });
        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.json(result.data);
      }
    )
  )
  .put(
    "/:id",
    ...validatedRoute(
      {
        auth: true,
        params: libraryIdSchema,
        body: updateLibraryEntrySchema,
        middleware: [imageUpload.single("image")],
      },
      async (req, res) => {
        const result = await libraryService.updateEntry({
          userId: req.user.userId,
          id: req.params.id,
          body: req.body,
          imageBuffer: req.file?.buffer,
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
      { auth: true, params: libraryIdSchema },
      async (req, res) => {
        const result = await libraryService.deleteEntry({
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
  .post(
    "/export/csv",
    ...validatedRoute(
      {
        auth: true,
        body: exportLibraryEntriesSchema,
      },
      async (req, res) => {
        const result = await libraryService.exportEntriesToCsv({
          userId: req.user.userId,
          ids: req.body.ids,
        });

        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="library-export.csv"'
        );

        return res.status(200).send(result.data.csv);
      }
    )
  )
  .post(
    "/export/bundle",
    ...validatedRoute(
      {
        auth: true,
        body: exportLibraryEntriesSchema,
      },
      async (req, res) => {
        const result = await libraryService.exportEntriesToBundle({
          userId: req.user.userId,
          ids: req.body.ids,
        });

        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="library-export.zip"'
        );

        return res.status(200).send(result.data.buffer);
      }
    )
  )
  .post(
    "/import/csv",
    ...validatedRoute(
      {
        auth: true,
        middleware: [upload.single("file")],
      },
      async (req, res) => {
        const result = await libraryService.importEntriesFromCsv({
          userId: req.user.userId,
          csvBuffer: req.file?.buffer,
        });

        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.status(201).json(result.data);
      }
    )
  )
  .post(
    "/import/bundle",
    ...validatedRoute(
      {
        auth: true,
        middleware: [bundleUpload.single("file")],
      },
      async (req, res) => {
        const result = await libraryService.importEntriesFromBundle({
          userId: req.user.userId,
          bundleBuffer: req.file?.buffer,
        });

        if (!result.ok) {
          return sendServiceError(res, result.error);
        }

        return res.status(201).json(result.data);
      }
    )
  );

export default libraryRouter;
