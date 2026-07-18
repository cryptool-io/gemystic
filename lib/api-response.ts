import { NextResponse } from 'next/server';

/**
 * API envelope, Trust-Agent's lib/api-response.ts contract:
 *   success: { success: true, data, meta? }
 *   failure: { success: false, error: { code, message, details? } }
 *
 * New routes use these helpers; existing routes migrate as they are touched
 * (tracked in NEXT-SESSION M8). One envelope means one client-side unwrapping
 * path and no guessing which key holds the payload.
 */
export interface ApiMeta {
  [key: string]: unknown;
}

export function ok<T>(data: T, meta?: ApiMeta, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data, ...(meta ? { meta } : {}) }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false as const,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    { status },
  );
}

/** Common failures, so status codes and codes stay consistent across routes. */
export const apiError = {
  badRequest: (message: string, details?: unknown) => fail('bad_request', message, 400, details),
  unauthorized: (message = 'Sign in required.') => fail('unauthorized', message, 401),
  forbidden: (message = 'Not permitted.') => fail('forbidden', message, 403),
  notFound: (message = 'Not found.') => fail('not_found', message, 404),
  rateLimited: (message = 'Too many requests. Try again shortly.') =>
    fail('rate_limited', message, 429),
  internal: (message = 'Something went wrong on our side.') => fail('internal', message, 500),
};
