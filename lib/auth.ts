import { getDb, uid } from '@/lib/db';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SESSION_COOKIE = 'ep_session';
const SESSION_DAYS = 30;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function createSession(res: any, userId: string) {
  const db = getDb();
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)').run(token, userId, expires);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
}

export function destroySession(req: any, res: any) {
  const db = getDb();
  const token = parseCookie(req)[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function parseCookie(req: any): Record<string, string> {
  const header = req.headers?.cookie || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function getUser(req: any): { id: string; email: string; name: string; isDemo: boolean; onboarded: boolean } | null {
  const db = getDb();
  const token = parseCookie(req)[SESSION_COOKIE];
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.is_demo, u.onboarded, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?`).get(token) as any;
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, isDemo: !!row.is_demo, onboarded: !!row.onboarded };
}

export function requireUser(req: any, res: any): any | null {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ ok: false, error: 'Not signed in.' });
    return null;
  }
  return user;
}

export function signup(email: string, password: string, name: string) {
  const db = getDb();
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError('Please enter a valid email address.');
  if (password.length < 8) throw new AuthError('Password must be at least 8 characters.');
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new AuthError('An account with this email already exists. Try signing in.');
  const id = uid();
  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?,?,?,?)')
    .run(id, email, hashPassword(password), name.trim() || 'Learner');
  return id;
}

export function login(email: string, password: string) {
  const db = getDb();
  const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
  if (!row || !verifyPassword(password, row.password_hash)) throw new AuthError('Incorrect email or password.');
  return row.id;
}

export function createResetToken(email: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
  if (!row) return null;
  const token = randomBytes(24).toString('hex');
  db.prepare('INSERT INTO password_resets (token, user_id) VALUES (?,?)').run(token, row.id);
  return token;
}

export function resetPassword(token: string, newPassword: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT user_id, used FROM password_resets WHERE token = ? AND used = 0').get(token) as any;
  if (!row || newPassword.length < 8) return false;
  db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(newPassword), row.user_id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
  return true;
}

export class AuthError extends Error {}
