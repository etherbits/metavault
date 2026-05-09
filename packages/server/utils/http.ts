import type { Response } from "express";
import type { ServiceError } from "./result";

export function sendServiceError(res: Response, error: ServiceError) {
  return res.status(error.status).json({ message: error.message });
}
