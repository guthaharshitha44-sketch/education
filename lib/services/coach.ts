import { getDb } from '@/lib/db';
import { userSkillsMap, computeGapAnalysis } from './gap';
import { generateText, aiEnabled } from './llm';
import { resourcesForSkill } from '@/lib/domain/resources';
import { LEVEL_LABELS } from '@/lib/domain/skills';
import { savePracticeAttempt } from './practice';

export interface CoachContext {
  name: string;
  targetRole: string;
  readiness: number;
  topGaps: string[];
  todayTasks: Array<{ title: string; skill?: string; minutes: number; done: boolean }>;
  struggles: string[];
  recentScores: Array<{ skill: string; pct: number }>;
  streak: number;
}

export function buildCoachContext(userId: string): CoachContext {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
  const u = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
  const gap = profile?.target_role ? computeGapAnalysis(userId, profile.target_role) : null;

  const todayTasks = db.prepare(`
    SELECT title, skill, est_minutes, status FROM learning_tasks
    WHERE user_id = ? AND day_offset <= 0 AND status = 'todo'
    ORDER BY day_offset, est_minutes LIMIT 5`).all(userId) as any[];

  const struggles = (db.prepare('SELECT skill FROM struggle_areas WHERE user_id = ? AND resolved = 0').all(userId) as any[]).map(r => r.skill);
  const recentScores = db.prepare(`
    SELECT a.skill, ROUND(aa.score * 100.0 / NULLIF(aa.total,0)) AS pct
    FROM assessment_attempts aa JOIN assessments a ON a.id = aa.assessment_id
    WHERE aa.user_id = ? ORDER BY aa.created_at DESC LIMIT 5`).all(userId) as any[];

  return {
    name: u?.name || 'Learner',
    targetRole: profile?.target_role || 'your target role',
    readiness: gap?.readiness ?? 0,
    topGaps: gap ? gap.biggestGaps.slice(0, 3).map(g => g.skill) : [],
    todayTasks: todayTasks.map(t => ({ title: t.title, skill: t.skill, minutes: t.est_minutes, done: t.status === 'done' })),
    struggles,
    recentScores: recentScores.map(r => ({ skill: r.skill, pct: r.pct })),
    streak: computeStreak(userId),
  };
}

export function computeStreak(userId: string): number {
  const db = getDb();
  const rows = db.prepare(`
    SELECT day FROM progress_snapshots WHERE user_id = ? AND minutes > 0 ORDER BY day DESC LIMIT 60`).all(userId) as any[];
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const day = cursor.toISOString().slice(0, 10);
    const hit = rows.find(r => r.day === day);
    if (hit) streak++;
    else if (streak > 0 || day === new Date().toISOString().slice(0, 10)) {
      // allow today not yet logged; break after first gap
      if (streak > 0) break;
    } else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function contextBlock(ctx: CoachContext): string {
  return JSON.stringify({
    learner: ctx.name,
    target_role: ctx.targetRole,
    learning_readiness: `${ctx.readiness}%`,
    biggest_gaps: ctx.topGaps,
    today_plan: ctx.todayTasks,
    struggle_areas: ctx.struggles,
    recent_assessment_scores: ctx.recentScores,
    streak_days: ctx.streak,
  });
}

// Rule-based coach: always available, uses the learner's actual data.
export function coachAnswer(userId: string, question: string): string {
  const ctx = buildCoachContext(userId);
  const q = question.toLowerCase();

  if (/what should i study today|today|start with/.test(q)) {
    if (ctx.todayTasks.length === 0) {
      return `Your plan for today is still being built, ${ctx.name}. Open the Roadmap and hit "Regenerate plan" — or ask me to prioritize your biggest gap (${ctx.topGaps[0] || ' fundamentals'}).`;
    }
    const first = ctx.todayTasks.find(t => !t.done);
    const total = ctx.todayTasks.reduce((a, b) => a + b.minutes, 0);
    return `Today's mission is ~${total} minutes across ${ctx.todayTasks.length} tasks. Start with "${first?.title}" (~${first?.minutes} min). Why: it targets ${first?.skill || ctx.topGaps[0] || 'your core gap'}, one of your highest-impact gaps for ${ctx.targetRole}.`;
  }
  if (/why did my (roadmap|plan) change|changed/.test(q)) {
    const db = getDb();
    const logs = db.prepare(`SELECT message FROM activity_logs WHERE user_id = ? AND type = 'roadmap_adapted' ORDER BY created_at DESC LIMIT 2`).all(userId) as any[];
    if (logs.length === 0) return `Your roadmap hasn't been adapted yet. It changes when you complete tasks, skip, or log practice scores — then EduPath rebalances and logs the reason in your activity timeline.`;
    return `Here's why your roadmap changed: ${logs.map(l => `• ${l.message}`).join('\n')}`;
  }
  if (/struggl|why am i (so )?bad|failing/.test(q)) {
    if (ctx.struggles.length === 0) {
      return `No struggle pattern detected yet — your recent results look consistent. Keep logging practice and assessments and I'll flag any skill where results dip below 50% repeatedly.`;
    }
    const s = ctx.struggles[0];
    const db = getDb();
    const ev = db.prepare('SELECT evidence_json FROM struggle_areas WHERE user_id = ? AND skill = ?').get(userId, s) as any;
    const evidence = ev ? JSON.parse(ev.evidence_json) : [];
    return `You're struggling with **${s}**. Evidence: ${evidence.slice(0, 4).join('; ')}. My recommendation: slow down — do one reinforcement session before new material. Want a 5-question diagnostic on ${s}? Just ask.`;
  }
  if (/30 minutes|only have|short on time|little time/.test(q)) {
    const first = ctx.todayTasks.find(t => !t.done);
    return `With 30 minutes: do "${first?.title || 'one practice set'}" (~${Math.min(30, first?.minutes || 30)} min) — it's the highest-impact item today. Skip the rest without guilt; I'll reschedule them to tomorrow automatically.`;
  }
  if (/biggest (gap|gaps|weakness)/.test(q)) {
    return `Your biggest remaining gaps for ${ctx.targetRole}: ${ctx.topGaps.map((g, i) => `${i + 1}. ${g}`).join(', ') || 'none — you are close to target!'}. Readiness is ${ctx.readiness}%. Focusing on ${ctx.topGaps[0] || 'advanced topics'} moves the needle most.`;
  }
  if (/project/.test(q)) {
    const skill = ctx.topGaps[0] || 'JavaScript';
    const res = resourcesForSkill(skill, 'projects');
    return `Build a small project practicing **${skill}**: check the Projects tab for a generated idea. Good first step: re-implement something you already use (a to-do, a calculator) entirely yourself, then extend it with one feature you've never built.`;
  }
  if (/focus|next/.test(q)) {
    return `Focus next on **${ctx.topGaps[0] || 'Programming Fundamentals'}** — it's your largest weighted gap and it unlocks downstream topics. One focused session today beats three scattered ones.`;
  }
  if (/explain|what is|how does/.test(q)) {
    const skill = ctx.topGaps[0] || 'the skill you asked about';
    return `Great question. Here's the short version: start from the core definition, then one worked example, then a common mistake people make with ${skill}. For a deeper pass, open Practice and generate a 5-question set on ${skill} — teaching-by-testing sticks better than re-reading.`;
  }

  // Generic fallback grounded in data
  return `Here's where you stand, ${ctx.name}: readiness ${ctx.readiness}% for ${ctx.targetRole}, biggest gap ${ctx.topGaps[0] || '—'}, streak ${ctx.streak} days. Ask me "what should I study today", "why did my roadmap change", or "what are my biggest gaps".`;
}

// AI coach when a key is configured — prompt is grounded in learner data.
export async function coachAnswerAI(userId: string, question: string): Promise<string | null> {
  if (!aiEnabled()) return null;
  const ctx = buildCoachContext(userId);
  const system = `You are EduPath's learning coach. You know this learner's real data and must personalize answers. Never invent completed work, skills or scores. Be concise, specific, encouraging. When recommending study, reference their actual gaps and today's plan.`;
  const user = `LEARNER DATA: ${contextBlock(ctx)}\n\nQUESTION: ${question}`;
  return generateText(system, user, 500);
}

export function saveChatMessage(userId: string, role: 'user' | 'assistant', content: string) {
  getDb().prepare('INSERT INTO chat_messages (id, user_id, role, content) VALUES (?,?,?,?)')
    .run(uid(), userId, role, content.slice(0, 4000));
}

import { uid } from '@/lib/db';
