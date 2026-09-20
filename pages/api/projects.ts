import { ok, fail, withUser } from '@/lib/api';
import { generateProjectIdea } from '@/lib/services/progress';
import { getDb } from '@/lib/db';
import { uid } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = db.prepare("SELECT id, title, description, source, created_at FROM projects WHERE user_id = ? AND source = 'user_added' ORDER BY created_at DESC").all(user.id) as any[];
    return ok(res, { projects: rows });
  }

  if (req.method === 'POST') {
    const { skill } = req.body || {};
    const idea = generateProjectIdea(user.id, skill);
    return ok(res, { idea });
  }

  return fail(res, 405, 'Method not allowed.');
});
