import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { ok, fail, withUser, parseBody } from '@/lib/api';
import { saveOnboarding, markOnboarded } from '@/lib/services/profile';

const SkillSchema = z.object({ name: z.string().min(1).max(60), level: z.number().min(0).max(100) });

const PayloadSchema = z.object({
  name: z.string().min(1).max(80),
  education: z.string().max(120),
  currentStatus: z.string().max(60),
  skills: z.array(SkillSchema).max(40),
  targetRole: z.string().min(1).max(80),
  careerGoal: z.string().max(300),
  dailyMinutes: z.number().min(15).max(300),
  learningStyle: z.enum(['video', 'reading', 'hands-on coding', 'projects', 'mixed']),
  projects: z.array(z.object({ title: z.string().max(120), description: z.string().max(800) })).max(10).optional(),
  certificates: z.array(z.object({ title: z.string().max(120), issuer: z.string().max(80).default('') })).max(10).optional(),
  portfolioUrl: z.string().max(300).optional(),
  githubUrl: z.string().max(300).optional(),
});

export default withUser(async ({ req, res, user }) => {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed.');
  const payload = parseBody(PayloadSchema, req);
  saveOnboarding(user.id, payload);
  markOnboarded(user.id);
  ok(res, { next: '/dashboard' });
});
