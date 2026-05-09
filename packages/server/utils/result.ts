export type ServiceError = {
  status: number;
  message: string;
};

export type Result<T, E = ServiceError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(status: number, message: string): Result<never> {
  return { ok: false, error: { status, message } };
}
