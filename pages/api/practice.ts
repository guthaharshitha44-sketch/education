import { ok, fail, withUser, rateLimit } from '@/lib/api';
import { generatePracticeSet, generatePracticeSetAI, savePracticeAttempt, evaluateMCQ, scoreOpenAnswer, PracticeSet, TaskKind } from '@/lib/services/practice';
import { assessAndAdapt } from '@/lib/services/adaptive';
import { getDb } from '@/lib/db';

export default withUser(async ({ req, res, user }) => {
  const db = getDb();

  if (req.method === 'GET') {
    const skills = db.prepare(`
      SELECT DISTINCT lt.skill FROM learning_tasks lt WHERE lt.user_id = ? AND lt.status = 'todo'
      UNION SELECT s.name FROM skills s JOIN user_skills us ON us.skill_id = s.id WHERE us.user_id = ? AND us.level < 60
      LIMIT 20`).all(user.id, user.id) as any[];
    return ok(res, { skills: skills.map(s => s.skill) });
  }

  if (req.method === 'POST') {
    const { action: act } = req.body || {};
    if (!rateLimit(`practice:${user.id}`, 30, 10 * 60_000)) return fail(res, 429, 'Too many generations. Take a short break.');

    if (act === 'generate') {
      const { skill, kind = 'mixed', count = 5, difficulty } = req.body || {};
      if (!skill) return fail(res, 400, 'Pick a skill to practice.');
      const aiSet = await generatePracticeSetAI(skill, kind as TaskKind, Math.min(8, Math.max(3, count)), difficulty);
      const set = aiSet || generatePracticeSet(skill, kind as TaskKind, Math.min(8, Math.max(3, count)), difficulty);
      return ok(res, { set, source: aiSet ? 'ai' : 'curated' });
    }

    if (act === 'submit') {
      const { set, answers } = req.body || {};
      if (!set?.questions || !Array.isArray(answers)) return fail(res, 400, 'Malformed submission.');
      const typed: PracticeSet = set;
      let correct = 0;
      const mistakes: string[] = [];
      const perQuestion = typed.questions.map((q, i) => {
        const ans = answers[i];
        if (q.answerIndex !== undefined && q.choices) {
          const good = evaluateMCQ(q, ans?.choice ?? -1);
          if (good) correct++;
          else mistakes.push(q.prompt.slice(0, 80));
          return { id: q.id, correct: good, explanation: q.explanation };
        }
        const res2 = scoreOpenAnswer(q, String(ans?.text || ''));
        if (res2.score < 50) mistakes.push(q.prompt.slice(0, 80));
        return { id: q.id, score: res2.score, feedback: res2.feedback, explanation: q.explanation };
      });
      const openCount = typed.questions.filter(q => q.answerIndex === undefined).length;
      const mcqCount = typed.questions.length - openCount;
      const score = mcqCount + openCount > 0
        ? Math.round(((correct + perQuestion.filter(p => (p.score ?? 0) >= 50).length) / typed.questions.length) * 100)
        : 0;
      savePracticeAttempt(user.id, typed.skill, typed.kind, score, mistakes);
      const adapt = assessAndAdapt(user.id, `Practice on ${typed.skill}: scored ${score}%`);
      return ok(res, { score, perQuestion, mistakes, adapted: adapt });
    }
    return fail(res, 400, 'Unknown action.');
  }

  return fail(res, 405, 'Method not allowed.');
});
