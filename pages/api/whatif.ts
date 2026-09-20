import { ok, fail, withUser } from '@/lib/api';
import { simulateScenario, applyScenario, WHAT_IF_QUESTIONS } from '@/lib/services/twin';
import { getDb } from '@/lib/db';
import { uid } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const scenarios = db.prepare('SELECT id, prompt, result_json, applied, created_at FROM what_if_scenarios WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(user.id) as any[];
    return ok(res, { questions: WHAT_IF_QUESTIONS, scenarios: scenarios.map(s => ({ id: s.id, applied: !!s.applied, createdAt: s.created_at, result: JSON.parse(s.result_json) })) });
  }

  if (req.method === 'POST') {
    const { action: act } = req.body || {};

    if (act === 'simulate') {
      const answers = (req.body?.answers || {}) as Record<string, string>;
      const result = simulateScenario(user.id, answers);
      if (!result.ok) return fail(res, 400, result.error || 'Could not simulate that scenario.');
      const id = uid();
      db.prepare('INSERT INTO what_if_scenarios (id, user_id, prompt, result_json) VALUES (?,?,?,?)')
        .run(id, user.id, JSON.stringify(answers), JSON.stringify(result));
      // strip the full plan from the client payload to keep responses light
      const { plan, ...light } = result;
      return ok(res, { scenarioId: id, result: light });
    }

    if (act === 'apply') {
      const { scenarioId } = req.body || {};
      if (!scenarioId) return fail(res, 400, 'scenarioId required.');
      const out = applyScenario(user.id, scenarioId);
      if (!out.ok) return fail(res, 400, out.error || 'Could not apply scenario.');
      return ok(res, out);
    }

    return fail(res, 400, 'Unknown action.');
  }

  return fail(res, 405, 'Method not allowed.');
});
