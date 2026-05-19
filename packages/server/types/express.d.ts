import type { logger } from "../logger";

export interface AuthUser {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      log?: typeof logger;
      user?: AuthUser;
    }
  }
}
