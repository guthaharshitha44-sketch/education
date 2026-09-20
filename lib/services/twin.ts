import { userSkillsMap, computeGapAnalysis } from './gap';
import { DEPENDENCIES } from '@/lib/domain/skills';
import { getDb, uid } from '@/lib/db';
import { saveRoadmap, Roadplan, RoadmapTask } from './roadmap';
import { buildRoadplan } from './roadmap';
import { logActivity } from './adaptive';

export interface TwinSkill {
  name: string;
  level: number;
  target: number | null;
  state: string;
  velocity: number; // points per week, from snapshots & completions
  unlocks: string[];
}

export interface SkillTwin {
  generatedAt: string;
  focus: string | null;
  overallLevel: number;
  readiness: number;
  skills: TwinSkill[];
  strong: string[];
  weak: string[];
  velocityWeekly: number;
}

export function buildSkillTwin(userId: string): SkillTwin {
  const db = getDb();
  const profile = db.prepare('SELECT target_role FROM profiles WHERE user_id = ?').get(userId) as any;
  const current = userSkillsMap(userId);
  const gap = profile?.target_role ? computeGapAnalysis(userId, profile.target_role) : null;
  const targetMap: Record<string, number> = {};
  if (gap) for (const it of gap.items) targetMap[it.skill] = it.target;

  // learning velocity: minutes logged last 14 days → normalized points/week
  const recent = db.prepare(`
    SELECT day, minutes FROM progress_snapshots
    WHERE user_id = ? AND day >= date('now', '-14 days') ORDER BY day`).all(userId) as any[];
  const minutes14 = recent.reduce((a, b) => a + (b.minutes || 0), 0);
  const velocityWeekly = Math.round((minutes14 / 2) / 6); // ~6 pts per focused hour, per week

  const skills: TwinSkill[] = Object.entries(current).map(([name, level]) => ({
    name,
    level,
    target: targetMap[name] ?? null,
    state: level <= 5 ? 'missing' : (level / (targetMap[name] || 70) >= 0.9 ? 'strong' : level / (targetMap[name] || 70) >= 0.6 ? 'developing' : 'needs-work'),
    velocity: velocityWeekly,
    unlocks: DEPENDENCIES.filter(d => d.from === name).map(d => d.to),
  }));

  const focus = gap?.biggestGaps[0]?.skill || null;
  return {
    generatedAt: new Date().toISOString(),
    focus,
    overallLevel: skills.length ? Math.round(skills.reduce((a, b) => a + b.level, 0) / skills.length) : 0,
    readiness: gap?.readiness ?? 0,
    skills: skills.sort((a, b) => b.level - a.level),
    strong: skills.filter(s => s.state === 'strong').map(s => s.name),
    weak: skills.filter(s => s.state === 'needs-work' || s.state === 'missing').map(s => s.name),
    velocityWeekly,
  };
}

// ---------------- What-If Simulator ----------------

export interface SimQuestion {
  key: string;
  label: string;
  type: 'multichoice' | 'freetext';
  options?: string[];
}

export const WHAT_IF_QUESTIONS: SimQuestion[] = [
  { key: 'intent', label: 'What do you want to simulate?', type: 'multichoice', options: ['More time on one skill', 'Reduce study time', 'Switch target role', 'Intensive sprint'] },
  { key: 'skill', label: 'Which skill?', type: 'freetext', options: [] },
  { key: 'days', label: 'How many days?', type: 'multichoice', options: ['7', '14', '30'] },
  { key: 'newTime', label: 'New study time per day (minutes)?', type: 'multichoice', options: ['15', '30', '60', '90', '120'] },
  { key: 'newRole', label: 'New target role', type: 'freetext', options: [] },
];

export interface ScenarioResult {
  ok: boolean;
  error?: string;
  title: string;
  currentPathSummary: string;
  simulatedPathSummary: string;
  changes: Array<{ type: 'added' | 'removed' | 'moved' | 'delayed' | 'time_change'; label: string; detail: string }>;
  estimatedExtraDays: number;
  newReadinessProjection: number;
  disclaimer: string;
  plan?: Roadplan;
}

function parseFreeText(raw: Record<string, string>): { skill?: string; newRole?: string } {
  return { skill: raw.skill?.trim() || undefined, newRole: raw.newRole?.trim() || undefined };
}

export function simulateScenario(userId: string, answers: Record<string, string>): ScenarioResult {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
  if (!profile?.target_role) {
    return { ok: false, error: 'Complete onboarding first so EduPath knows your target role.', title: '', currentPathSummary: '', simulatedPathSummary: '', changes: [], estimatedExtraDays: 0, newReadinessProjection: 0, disclaimer: '' };
  }
  const { skill, newRole } = parseFreeText(answers);
  const days = Number(answers.days) || 14;
  const newTime = Number(answers.newTime) || profile.daily_minutes;
  const intent = answers.intent || 'More time on one skill';

  const baseGap = computeGapAnalysis(userId, profile.target_role);
  const disclaimer = 'This is a learning-plan simulation, not a prediction of hiring or career outcomes.';

  // Build a "simulated profile" gap. For role switch, recompute gap against the new role.
  let simRole = profile.target_role;
  let simGap = baseGap;
  const changes: ScenarioResult['changes'] = [];

  if (intent === 'Switch target role' && newRole) {
    simRole = newRole;
    simGap = computeGapAnalysis(userId, newRole);
    const removed = baseGap.items.filter(b => !simGap.items.some(s => s.skill === b.skill));
    const added = simGap.items.filter(s => !baseGap.items.some(b => b.skill === s.skill));
    changes.push({ type: 'added', label: `New role: ${newRole}`, detail: `${added.length} new skill objectives added` });
    if (removed.length) changes.push({ type: 'removed', label: 'Dropped objectives', detail: removed.map(r => r.skill).join(', ') });
    changes.push({ type: 'moved', label: 'Re-prioritized', detail: `Plan now targets ${newRole} requirements` });
  }

  const activeRoadmap = db.prepare('SELECT plan_json FROM roadmaps WHERE user_id = ? AND active = 1').get(userId) as any;
  const currentPlan: Roadplan | null = activeRoadmap ? JSON.parse(activeRoadmap.plan_json) : null;
  const currentTaskCount = currentPlan ? currentPlan.next_30_days.length : 0;
  const currentDaily = currentPlan?.daily_minutes || profile.daily_minutes;

  if (intent === 'More time on one skill' && skill) {
    const gapItem = baseGap.items.find(i => i.skill.toLowerCase() === skill.toLowerCase());
    if (!gapItem) {
      return { ok: false, error: `"${skill}" is not tracked for ${profile.target_role}. Try one of your tracked skills.`, title: '', currentPathSummary: '', simulatedPathSummary: '', changes: [], estimatedExtraDays: 0, newReadinessProjection: 0, disclaimer };
    }
    changes.push({ type: 'added', label: `${skill} sprint for ${days} days`, detail: `${days} days of focused ${skill} blocks at ${newTime} min/day` });
    const displaced = Math.round((days * Math.min(newTime, 60)) / 60);
    changes.push({ type: 'delayed', label: 'Other topics', detail: `~${displaced}h of general plan content shifted later` });
  }

  if (intent === 'Reduce study time') {
    const factor = newTime / Math.max(1, currentDaily);
    if (factor >= 1) {
      return { ok: false, error: 'Choose a daily time LOWER than your current plan to simulate a reduction.', title: '', currentPathSummary: '', simulatedPathSummary: '', changes: [], estimatedExtraDays: 0, newReadinessProjection: 0, disclaimer };
    }
    const extraDays = Math.max(1, Math.round((currentTaskCount * 30) / Math.max(1, currentTaskCount) * (1 / factor - 1)));
    changes.push({ type: 'time_change', label: `Daily time: ${currentDaily} → ${newTime} min`, detail: `Plan stretches ~${Math.round((1 / factor - 1) * 100)}% longer` });
    changes.push({ type: 'delayed', label: 'Long-term milestones', detail: 'Each phase completes proportionally later' });
  }

  if (intent === 'Intensive sprint') {
    changes.push({ type: 'time_change', label: `Daily time: ${currentDaily} → ${newTime} min`, detail: `Compressed schedule over ${days} days` });
    changes.push({ type: 'added', label: 'Daily review block', detail: '15-min spaced-repetition review added each day' });
  }

  if (changes.length === 0) {
    return { ok: false, error: 'Pick an intent (and a skill or role where needed) to simulate something.', title: '', currentPathSummary: '', simulatedPathSummary: '', changes: [], estimatedExtraDays: 0, newReadinessProjection: 0, disclaimer };
  }

  // Build the simulated plan
  const simPlan = buildRoadplan(userId, simRole, { dailyMinutes: intent === 'Reduce study time' ? newTime : (intent === 'More time on one skill' ? currentDaily : newTime), style: profile.learning_style, gapOverride: simGap });
  if (intent === 'More time on one skill' && skill) {
    const sprint: RoadmapTask[] = Array.from({ length: Math.min(days, 10) }, (_, i) => ({
      skill,
      title: `${skill} sprint — session ${i + 1}`,
      type: 'learn' as const,
      description: `Focused ${skill} block ${i + 1}/${days}: concepts first, then guided practice.`,
      day_offset: i,
      est_minutes: Math.min(newTime, 60),
      difficulty: 'intermediate' as const,
      why: `What-If scenario: ${days}-day focus on ${skill}.`,
    }));
    simPlan.today = [...sprint.filter(t => t.day_offset === 0), ...simPlan.today].slice(0, 4);
    simPlan.this_week = [...sprint, ...simPlan.this_week].slice(0, 14);
    simPlan.next_30_days = [...sprint, ...simPlan.next_30_days];
  }

  const readinessProjection = Math.min(99, Math.round(baseGap.readiness + (intent === 'Reduce study time' ? -3 : intent === 'Intensive sprint' ? 6 : 4)));

  const title = intent === 'Switch target role' && newRole ? `Path: ${profile.target_role} → ${newRole}` : intent === 'Reduce study time' ? 'Reduced study time' : intent === 'Intensive sprint' ? `Intensive sprint (${newTime} min/day)` : `Focus sprint: ${skill} × ${days} days`;

  return {
    ok: true,
    title,
    currentPathSummary: currentPlan
      ? `${currentPlan.next_30_days.length} tasks over 30 days at ${currentPlan.daily_minutes} min/day targeting ${currentPlan.role}`
      : `${baseGap.readiness}% readiness on your current path`,
    simulatedPathSummary: `${simPlan.next_30_days.length} tasks over 30 days at ${simPlan.daily_minutes} min/day targeting ${simRole}`,
    changes,
    estimatedExtraDays: intent === 'Reduce study time' ? Math.round(30 * ((currentDaily / Math.max(1, newTime)) - 1)) : intent === 'More time on one skill' ? days : 0,
    newReadinessProjection: readinessProjection,
    disclaimer,
    plan: simPlan,
  };
}

export function applyScenario(userId: string, scenarioId: string): { ok: boolean; version?: number; error?: string } {
  const db = getDb();
  const row = db.prepare('SELECT * FROM what_if_scenarios WHERE id = ? AND user_id = ?').get(scenarioId, userId) as any;
  if (!row || row.applied) return { ok: false, error: 'Scenario not found or already applied.' };
  const result: ScenarioResult = JSON.parse(row.result_json);
  if (!result.plan) return { ok: false, error: 'This scenario has no applicable plan.' };

  const saved = saveRoadmap(userId, result.plan, `Applied What-If scenario: ${result.title}`);
  db.prepare('UPDATE what_if_scenarios SET applied = 1 WHERE id = ?').run(scenarioId);
  logActivity(userId, 'roadmap_adapted', `Applied What-If scenario "${result.title}". Roadmap replaced (v${saved.version}).`, { scenarioId });
  return { ok: true, version: saved.version };
}
