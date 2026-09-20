import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ok, fail, publicHandler, parseBody, rateLimit } from '@/lib/api';
import {
  signup,
  login,
  createSession,
  destroySession,
  createResetToken,
  resetPassword,
  getUser,
  AuthError,
  isAuthError,
} from '@/lib/auth';
import { createDemoUser } from '@/lib/services/demo';

const SignupSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(80, 'Name must be at most 80 characters.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(100),
});

export default publicHandler(async ({ req, res }) => {
  const action = (req.query.action as string || '').toLowerCase();
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';
  const ip = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'local');

  if (action === 'signup' || action === 'register') {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed. Use POST.');
    if (!rateLimit(`signup:${ip}`, 10, 60 * 60_000)) return fail(res, 429, 'Too many attempts. Try again later.');
    const body = parseBody(SignupSchema, req);
    try {
      const userId = signup(body.email, body.password, body.name);
      createSession(res, userId);
      return ok(res, {
        success: true,
        message: 'Account created successfully',
        redirect: '/onboarding',
      });
    } catch (e: any) {
      if (isAuthError(e) || e?.name === 'AuthError') {
        return fail(res, 400, e.message);
      }
      console.error('[API /api/auth/signup] Registration failure:', {
        email: body.email,
        name: body.name,
        errorName: e?.name,
        errorMessage: e?.message,
        stack: e?.stack,
      });
      return fail(res, 500, 'Server error occurred during registration. Please try again.');
    }
  }

  if (action === 'login') {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed. Use POST.');
    if (!rateLimit(`login:${ip}`, 20, 15 * 60_000)) return fail(res, 429, 'Too many attempts. Try again shortly.');
    const body = parseBody(z.object({ email: z.string().email(), password: z.string().min(1) }), req);
    try {
      const userId = login(body.email, body.password);
      createSession(res, userId);
      const user = getUser(req);
      return ok(res, {
        success: true,
        message: 'Logged in successfully',
        redirect: user?.onboarded ? '/dashboard' : '/onboarding',
      });
    } catch (e: any) {
      if (isAuthError(e) || e?.name === 'AuthError') return fail(res, 400, e.message);
      console.error('[login error]', e);
      return fail(res, 500, e.message || 'Login failed. Please try again.');
    }
  }

  if (action === 'logout') {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed. Use POST.');
    destroySession(req, res);
    return ok(res, { success: true, message: 'Logged out successfully', redirect: '/' });
  }

  if (action === 'me') {
    const user = getUser(req);
    if (!user) return fail(res, 401, 'Unauthorized');
    return ok(res, { user });
  }

  if (action === 'reset-request') {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed. Use POST.');
    const body = parseBody(z.object({ email: z.string().email() }), req);
    const token = createResetToken(body.email);
    return ok(res, { success: true, message: 'Reset request processed', token });
  }

  if (action === 'reset-confirm') {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed. Use POST.');
    const body = parseBody(z.object({ token: z.string().min(10), password: z.string().min(8) }), req);
    const success = resetPassword(body.token, body.password);
    if (!success) return fail(res, 400, 'Invalid or expired reset link.');
    return ok(res, { success: true, message: 'Password reset successfully', redirect: '/login' });
  }

  if (action === 'demo') {
    if (req.method !== 'POST') return fail(res, 405, 'Method not allowed. Use POST.');
    if (!rateLimit(`demo:${ip}`, 12, 60 * 60_000)) return fail(res, 429, 'Too many demo sessions. Try again later.');
    try {
      const userId = createDemoUser();
      createSession(res, userId);
      return ok(res, { success: true, message: 'Demo session started', redirect: '/dashboard' });
    } catch (e: any) {
      console.error('[demo error]', e);
      return fail(res, 500, e.message || 'Could not start demo session.');
    }
  }

  return fail(res, 404, `Unknown auth action: ${action}`);
});
