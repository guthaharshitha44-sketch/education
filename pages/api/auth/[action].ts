import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ok, fail, publicHandler, parseBody, rateLimit } from '@/lib/api';
import { signup, login, createSession, destroySession, createResetToken, resetPassword, getUser } from '@/lib/auth';
import { createDemoUser } from '@/lib/services/demo';

const SignupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export default publicHandler(async ({ req, res }) => {
  const action = (req.query.action as string || '').toLowerCase();
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';

  if (action === 'signup' && req.method === 'POST') {
    if (!rateLimit(`signup:${ip}`, 10, 60 * 60_000)) return fail(res, 429, 'Too many attempts. Try again later.');
    const body = parseBody(SignupSchema, req);
    try {
      const userId = signup(body.email, body.password, body.name);
      createSession(res, userId);
      return ok(res, { redirect: '/onboarding' });
    } catch (e: any) {
      if (e instanceof AuthError) return fail(res, 400, e.message);
      throw e;
    }
  }

  if (action === 'login' && req.method === 'POST') {
    if (!rateLimit(`login:${ip}`, 20, 15 * 60_000)) return fail(res, 429, 'Too many attempts. Try again shortly.');
    const body = parseBody(z.object({ email: z.string().email(), password: z.string().min(1) }), req);
    try {
      const userId = login(body.email, body.password);
      createSession(res, userId);
      const user = getUser(req);
      return ok(res, { redirect: user?.onboarded ? '/dashboard' : '/onboarding' });
    } catch (e: any) {
      if (e instanceof AuthError) return fail(res, 400, e.message);
      throw e;
    }
  }

  if (action === 'logout' && req.method === 'POST') {
    destroySession(req, res);
    return ok(res, { redirect: '/' });
  }

  if (action === 'reset-request' && req.method === 'POST') {
    const body = parseBody(z.object({ email: z.string().email() }), req);
    const token = createResetToken(body.email);
    // No email service in the MVP: the token is returned for the demo flow only
    // when the request originates from the reset UI. In production this would be emailed.
    return ok(res, { token });
  }

  if (action === 'reset-confirm' && req.method === 'POST') {
    const body = parseBody(z.object({ token: z.string().min(10), password: z.string().min(8) }), req);
    const success = resetPassword(body.token, body.password);
    if (!success) return fail(res, 400, 'Invalid or expired reset link.');
    return ok(res, { redirect: '/login' });
  }

  if (action === 'demo' && req.method === 'POST') {
    if (!rateLimit(`demo:${ip}`, 12, 60 * 60_000)) return fail(res, 429, 'Too many demo sessions. Try again later.');
    const userId = createDemoUser();
    createSession(res, userId);
    return ok(res, { redirect: '/dashboard' });
  }

  return fail(res, 404, 'Unknown auth action.');
});

import { AuthError } from '@/lib/auth';
