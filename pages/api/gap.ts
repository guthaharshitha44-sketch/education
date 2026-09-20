import { ok, fail, withUser } from '@/lib/api';
import { computeGapAnalysis } from '@/lib/services/gap';
import { getDb } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();
  const profile = db.prepare('SELECT target_role FROM profiles WHERE user_id = ?').get(user.id) as any;
  if (!profile?.target_role) return fail(res, 400, 'Complete onboarding first.');
  const gap = computeGapAnalysis(user.id, profile.target_role);
  ok(res, { gap });
});
