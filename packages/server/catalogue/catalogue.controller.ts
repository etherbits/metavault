import { Router } from "express";
import { parsedEnv } from "../env";
import { validatedRoute } from "../middleware/validation";
import { sendServiceError } from "../utils/http";
import { refreshCatalogueSchema } from "./catalogue.schema";
import { catalogueService } from "./catalogue.service";

const CATALOGUE_KEY_HEADER = "x-metavault-catalogue-key";

export const catalogueRouter = Router().post(
  "/refresh",
  ...validatedRoute(
    {
      body: refreshCatalogueSchema,
    },
    async (req, res) => {
      if (!parsedEnv.METAVAULT_CATALOGUE_REFRESH_KEY) {
        return res
          .status(503)
          .json({ message: "Catalogue refresh is disabled" });
      }

      if (
        req.header(CATALOGUE_KEY_HEADER) !==
        parsedEnv.METAVAULT_CATALOGUE_REFRESH_KEY
      ) {
        return res
          .status(401)
          .json({ message: "Invalid catalogue refresh key" });
      }

      const result = await catalogueService.refreshAniList(req.body);
      if (!result.ok) {
        return sendServiceError(res, result.error);
      }

      return res.json(result.data);
    }
  )
);
