import { ok, fail, withUser } from '@/lib/api';
import { getDb } from '@/lib/db';
import { explainRecommendation } from '@/lib/services/progress';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const logs = db.prepare('SELECT type, message, meta_json, created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 40').all(user.id) as any[];
    const struggles = db.prepare('SELECT skill, evidence_json, severity, detected_at, resolved FROM struggle_areas WHERE user_id = ? AND resolved = 0 ORDER BY severity DESC').all(user.id) as any[];
    return ok(res, {
      activity: logs.map(l => ({ type: l.type, message: l.message, meta: JSON.parse(l.meta_json || '{}'), at: l.created_at })),
      struggles: struggles.map(s => ({ skill: s.skill, severity: s.severity, evidence: JSON.parse(s.evidence_json || '[]'), detectedAt: s.detected_at })),
    });
  }

  if (req.method === 'POST') {
    const { subject } = req.body || {};
    if (!subject) return fail(res, 400, 'subject required.');
    return ok(res, { explanation: explainRecommendation(user.id, String(subject).slice(0, 80)) });
  }

  return fail(res, 405, 'Method not allowed.');
});
