import type { ZodError } from "zod";

interface ErrorResponseOptions {
  error: string;
  details?: string;
  path?: string;
  status?: number;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function errorResponse({
  error,
  details,
  path,
  status = 500,
}: ErrorResponseOptions) {
  const body: Record<string, string> = { error };
  if (details) {
    body.details = details;
  }
  if (path) {
    body.path = path;
  }

  return jsonResponse(body, { status });
}

export function validationErrorResponse(validationError: ZodError) {
  const firstError = validationError.issues[0];
  return errorResponse({
    error: firstError?.message || "Invalid request",
    path: firstError?.path?.join("."),
    status: 400,
  });
}
