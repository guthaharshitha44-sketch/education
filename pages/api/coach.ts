import { ok, fail, withUser, rateLimit } from '@/lib/api';
import { coachAnswer, coachAnswerAI, saveChatMessage } from '@/lib/services/coach';
import { getDb } from '@/lib/db';
import { uid } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const rows = db.prepare('SELECT role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 60').all(user.id) as any[];
    return ok(res, { messages: rows });
  }

  if (req.method === 'POST') {
    if (!rateLimit(`coach:${user.id}`, 20, 10 * 60_000)) return fail(res, 429, 'The coach needs a short break. Try again in a few minutes.');
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') return fail(res, 400, 'Type a question first.');
    saveChatMessage(user.id, 'user', message);
    const ai = await coachAnswerAI(user.id, message.slice(0, 800));
    const answer = ai || coachAnswer(user.id, message);
    saveChatMessage(user.id, 'assistant', answer);
    return ok(res, { answer, source: ai ? 'ai' : 'edupath-engine' });
  }

  return fail(res, 405, 'Method not allowed.');
});
