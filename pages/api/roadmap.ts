import { ok, fail, withUser } from '@/lib/api';
import { buildRoadplan, saveRoadmap } from '@/lib/services/roadmap';
import { getDb } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const row = db.prepare('SELECT * FROM roadmaps WHERE user_id = ? AND active = 1 ORDER BY version DESC LIMIT 1').get(user.id) as any;
    const history = db.prepare('SELECT id, version, reason, created_at, active FROM roadmaps WHERE user_id = ? ORDER BY version DESC LIMIT 12').all(user.id) as any[];
    if (!row) return ok(res, { plan: null, history: history.map(h => ({ ...h, active: !!h.active })) });
    return ok(res, {
      plan: JSON.parse(row.plan_json),
      history: history.map(h => ({ ...h, active: !!h.active })),
    });
  }

  if (req.method === 'POST') {
    const profile = db.prepare('SELECT target_role, daily_minutes, learning_style FROM profiles WHERE user_id = ?').get(user.id) as any;
    if (!profile?.target_role) return fail(res, 400, 'Complete onboarding first.');
    const plan = buildRoadplan(user.id, profile.target_role, { dailyMinutes: profile.daily_minutes, style: profile.learning_style });
    const saved = saveRoadmap(user.id, plan, req.body?.reason || 'Regenerated from your current skill profile');
    return ok(res, { plan, version: saved.version });
  }

  return fail(res, 405, 'Method not allowed.');
});
