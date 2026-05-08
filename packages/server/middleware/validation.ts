import type { Request, RequestHandler, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { z } from "zod";
import type { AuthUser } from "../types/express";
import { authMiddleware } from "./isAuth";

type AnySchema = z.ZodType;
type SchemaOutput<T> = T extends AnySchema ? z.output<T> : unknown;
type ParamsOutput<T> =
  T extends z.ZodType<ParamsDictionary> ? z.output<T> : ParamsDictionary;
type AuthenticatedRequest = Request & { user: AuthUser };
type ValidatedRequest<ParamsSchema, BodySchema, Auth extends boolean> = Request<
  ParamsOutput<ParamsSchema>,
  unknown,
  SchemaOutput<BodySchema>
> &
  (Auth extends true ? { user: AuthUser } : { user?: AuthUser });

type ValidatedRouteOptions<
  ParamsSchema extends z.ZodType<ParamsDictionary> | undefined,
  BodySchema extends AnySchema | undefined,
  Auth extends boolean,
> = {
  auth?: Auth;
  params?: ParamsSchema;
  body?: BodySchema;
  middleware?: RequestHandler[];
};

export const validateBodyMiddleware =
  <T extends z.ZodSchema>(
    schema: T
  ): RequestHandler<ParamsDictionary, unknown, z.output<T>> =>
  (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map((issue) => issue.message),
      });
    }

    req.body = result.data;
    next();
  };

export const validateParamsMiddleware =
  <T extends z.ZodType<ParamsDictionary>>(schema: T): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        message: result.error.issues.map((i) => i.message),
      });
    }
    req.params = result.data;

    next();
  };

export function requireAuth(req: Request): asserts req is AuthenticatedRequest {
  if (!req.user) {
    throw new Error("Authenticated request is missing user");
  }
}

export function validatedRoute<
  ParamsSchema extends z.ZodType<ParamsDictionary> | undefined = undefined,
  BodySchema extends AnySchema | undefined = undefined,
  Auth extends boolean = false,
>(
  options: ValidatedRouteOptions<ParamsSchema, BodySchema, Auth>,
  handler: (
    req: ValidatedRequest<ParamsSchema, BodySchema, Auth>,
    res: Response
  ) => unknown | Promise<unknown>
): RequestHandler[] {
  const handlers: RequestHandler[] = [];

  if (options.auth) {
    handlers.push(authMiddleware);
  }

  if (options.middleware) {
    handlers.push(...options.middleware);
  }

  if (options.params) {
    handlers.push(validateParamsMiddleware(options.params));
  }

  if (options.body) {
    handlers.push(validateBodyMiddleware(options.body));
  }

  handlers.push((req, res, next) => {
    if (options.auth && !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    Promise.resolve(
      handler(req as ValidatedRequest<ParamsSchema, BodySchema, Auth>, res)
    ).catch(next);
  });

  return handlers;
}
