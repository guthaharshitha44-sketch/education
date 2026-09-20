import type { NextApiRequest, NextApiResponse } from 'next';
import { ZodSchema, ZodError } from 'zod';
import { requireUser } from '@/lib/auth';

export function ok(res: NextApiResponse, data: unknown) {
  return res.status(200).json({ ok: true, ...(data as any) });
}

export function fail(res: NextApiResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}

export function getMethod(req: NextApiRequest): string {
  return (req.method || 'GET').toUpperCase();
}

export type Handler = (ctx: { req: NextApiRequest; res: NextApiResponse; user: any }) => Promise<void> | void;

export function withUser(handler: Handler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = requireUser(req, res);
      if (!user) return;
      await handler({ req, res, user });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return fail(res, 400, err.errors[0]?.message || 'Invalid input.');
      }
      console.error('[api]', err);
      return fail(res, 500, 'Something went wrong on our side. Your progress is safe — please try again.');
    }
  };
}

export function publicHandler(handler: (ctx: { req: NextApiRequest; res: NextApiResponse }) => Promise<void> | void) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler({ req, res });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return fail(res, 400, err.errors[0]?.message || 'Invalid input.');
      }
      console.error('[api]', err);
      return fail(res, 500, 'Something went wrong on our side. Please try again.');
    }
  };
}

export function parseBody<T>(schema: ZodSchema<T>, req: NextApiRequest): T {
  return schema.parse(req.body ?? {});
}

// naive fixed-window rate limiter (per user or IP)
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}
