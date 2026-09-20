import { ok, fail, withUser } from '@/lib/api';
import { onTaskCompleted, onTaskSkipped, assessAndAdapt } from '@/lib/services/adaptive';
import { getDb } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = db.prepare(`
      SELECT * FROM learning_tasks WHERE user_id = ? AND status = 'todo' AND day_offset <= 0
      ORDER BY day_offset, est_minutes`).all(user.id) as any[];
    const week = db.prepare(`
      SELECT * FROM learning_tasks WHERE user_id = ? AND status = 'todo' AND day_offset <= 7
      ORDER BY day_offset, est_minutes`).all(user.id) as any[];
    const recentDone = db.prepare(`
      SELECT id, skill, title, type, score, completed_at FROM learning_tasks
      WHERE user_id = ? AND status = 'done' ORDER BY completed_at DESC LIMIT 8`).all(user.id) as any[];
    return ok(res, {
      today: rows, week,
      recentDone: recentDone.map(t => ({ ...t, score: t.score ?? null })),
    });
  }

  if (req.method === 'POST') {
    const { taskId, action: act, reason } = req.body || {};
    if (!taskId || !act) return fail(res, 400, 'taskId and action are required.');
    if (act === 'complete') {
      const result = onTaskCompleted(user.id, taskId, typeof req.body?.score === 'number' ? req.body.score : undefined);
      return ok(res, { result });
    }
    if (act === 'skip') {
      const result = onTaskSkipped(user.id, taskId, String(reason || '').slice(0, 200));
      return ok(res, { result });
    }
    if (act === 'reschedule') {
      db.prepare('UPDATE learning_tasks SET day_offset = day_offset + 1 WHERE id = ? AND user_id = ?').run(taskId, user.id);
      return ok(res, { result: { adapted: true, changes: ['Task moved to tomorrow'] } });
    }
    return fail(res, 400, 'Unknown action.');
  }

  return fail(res, 405, 'Method not allowed.');
});
