import { getDb, uid } from '@/lib/db';
import { computeGapAnalysis } from './gap';
import { computeStreak } from './coach';

export interface ProgressOverview {
  learnerName: string;
  targetRole: string;
  readiness: number;
  skills: { acquired: number; inProgress: number; needsWork: number; missing: number };
  weeklyMinutes: number;
  weeklyHours: number;
  tasksCompleted: number;
  tasksRemaining: number;
  assessmentTrend: Array<{ label: string; score: number }>;
  skillGrowth: Array<{ skill: string; before: number; current: number }>;
  streak: number;
  milestones: Array<{ label: string; done: boolean }>;
  biggestGap: { skill: string; current: number; target: number } | null;
  todayFocus: { title: string; minutes: number } | null;
  aiRecommendation: string;
}

export function computeProgress(userId: string): ProgressOverview {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
  const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
  const role = profile?.target_role || '';
  const gap = role ? computeGapAnalysis(userId, role) : null;

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const wRow = db.prepare('SELECT COALESCE(SUM(minutes),0) m, COALESCE(SUM(tasks_completed),0) t FROM progress_snapshots WHERE user_id = ? AND day >= ?').get(userId, weekAgo) as any;
  const remaining = db.prepare("SELECT COUNT(*) c FROM learning_tasks WHERE user_id = ? AND status = 'todo' AND day_offset < 30").get(userId) as any;

  const attempts = db.prepare(`
    SELECT ROUND(aa.score * 100.0 / NULLIF(aa.total,0)) AS pct, aa.created_at
    FROM assessment_attempts aa WHERE aa.user_id = ? ORDER BY aa.created_at DESC LIMIT 12`).all(userId) as any[];
  const assessmentTrend = attempts.slice(0, 10).reverse().map((a, i) => ({ label: `#${i + 1}`, score: a.pct }));

  const skillGrowth = gap ? gap.items.slice(0, 6).map(it => ({
    skill: it.skill,
    before: Math.max(0, it.current - 10),
    current: it.current,
  })) : [];

  const today = db.prepare(`
    SELECT title, est_minutes FROM learning_tasks
    WHERE user_id = ? AND status = 'todo' AND day_offset <= 0 ORDER BY day_offset, est_minutes LIMIT 1`).get(userId) as any;

  const biggestGap = gap?.biggestGaps[0] ? { skill: gap.biggestGaps[0].skill, current: gap.biggestGaps[0].current, target: gap.biggestGaps[0].target } : null;

  return {
    learnerName: userRow?.name || '',
    targetRole: role || '',
    readiness: gap?.readiness ?? 0,
    skills: {
      acquired: gap?.strongest.length ?? 0,
      inProgress: gap?.items.filter(i => i.state === 'developing').length ?? 0,
      needsWork: gap?.items.filter(i => i.state === 'needs-work').length ?? 0,
      missing: gap?.items.filter(i => i.state === 'missing').length ?? 0,
    },
    weeklyMinutes: wRow?.m || 0,
    weeklyHours: Math.round((wRow?.m || 0) / 6) / 10,
    tasksCompleted: wRow?.t || 0,
    tasksRemaining: remaining?.c || 0,
    assessmentTrend,
    skillGrowth,
    streak: computeStreak(userId),
    milestones: buildMilestones(userId, gap?.readiness ?? 0),
    biggestGap,
    todayFocus: today ? { title: today.title, minutes: today.est_minutes } : null,
    aiRecommendation: biggestGap
      ? `Prioritize ${biggestGap.skill}: it's the largest weighted gap for ${role} and unlocks downstream topics. One focused session today compounds.`
      : 'Complete onboarding and generate your roadmap to unlock recommendations.',
  };
}

function buildMilestones(userId: string, readiness: number): Array<{ label: string; done: boolean }> {
  const db = getDb();
  const doneTasks = db.prepare("SELECT COUNT(*) c FROM learning_tasks WHERE user_id = ? AND status = 'done'").get(userId) as any;
  const resume = db.prepare('SELECT COUNT(*) c FROM resumes WHERE user_id = ?').get(userId) as any;
  const roadmap = db.prepare('SELECT COUNT(*) c FROM roadmaps WHERE user_id = ?').get(userId) as any;
  const firstAssessment = db.prepare('SELECT COUNT(*) c FROM assessment_attempts WHERE user_id = ?').get(userId) as any;
  return [
    { label: 'Profile & resume analyzed', done: (resume?.c || 0) > 0 },
    { label: 'First roadmap generated', done: (roadmap?.c || 0) > 0 },
    { label: 'First task completed', done: (doneTasks?.c || 0) > 0 },
    { label: 'First assessment taken', done: (firstAssessment?.c || 0) > 0 },
    { label: 'Readiness 60%+', done: readiness >= 60 },
    { label: 'Readiness 80%+ (role-ready)', done: readiness >= 80 },
  ];
}

export function buildWeeklyReport(userId: string): Record<string, unknown> {
  const db = getDb();
  const p = computeProgress(userId);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const struggles = db.prepare('SELECT skill, evidence_json, severity FROM struggle_areas WHERE user_id = ? AND resolved = 0').all(userId) as any[];
  const logs = db.prepare(`SELECT type, message, created_at FROM activity_logs WHERE user_id = ? AND created_at >= datetime('now', '-7 days') ORDER BY created_at DESC LIMIT 30`).all(userId) as any[];
  const adaptations = db.prepare(`SELECT reason, version, created_at FROM roadmaps WHERE user_id = ? AND created_at >= datetime('now', '-7 days') ORDER BY version DESC`).all(userId) as any[];

  const acquired = db.prepare(`
    SELECT s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = ? AND us.source = 'earned' AND us.level >= 60`).all(userId) as any[];

  return {
    weekStart: weekAgo,
    readiness: p.readiness,
    skillsAcquired: acquired.map(a => a.name),
    skillsInProgress: p.skills.inProgress,
    remainingGaps: p.biggestGap ? [p.biggestGap.skill] : [],
    struggleAreas: struggles.map(s => ({ skill: s.skill, severity: s.severity, evidence: JSON.parse(s.evidence_json || '[]') })),
    tasksCompleted: p.tasksCompleted,
    assessmentPerformance: p.assessmentTrend,
    learningHours: p.weeklyHours,
    recommendedNextSteps: [
      p.biggestGap ? `Focus block on ${p.biggestGap.skill}` : 'Generate your roadmap',
      p.tasksRemaining > 0 ? `Clear ${p.tasksRemaining} planned tasks` : 'Generate fresh practice sets',
    ],
    roadmapChanges: adaptations.map(a => `v${a.version}: ${a.reason}`),
    recentActivity: logs.map(l => ({ type: l.type, message: l.message, at: l.created_at })),
  };
}

// ---------------- Project generator ----------------

const PROJECT_IDEAS: Record<string, Array<{ title: string; problem: string; skills: string[]; difficulty: string; features: string[]; stack: string[]; outcome: string; extension: string }>> = {
  'Data Structures & Algorithms': [{
    title: 'Student Record Analyzer',
    problem: 'Teachers juggle spreadsheets; you\'ll build a CLI that reads student scores, computes averages/rankings and flags at-risk students.',
    skills: ['Data Structures & Algorithms', 'Programming Fundamentals'],
    difficulty: 'beginner',
    features: ['CSV import', 'Average & ranking report', 'At-risk flagging', 'Search by name'],
    stack: ['Python or Java', 'CSV', 'Git'],
    outcome: 'A clean CLI producing correct analytics for any input file.',
    extension: 'Add sorting-performance comparison of two algorithms on 10k rows.',
  }],
  JavaScript: [{
    title: 'Expense Splitter Web App',
    problem: 'Roommates argue about shared bills. Build a tool that tracks shared expenses and computes who owes whom.',
    skills: ['JavaScript', 'HTML & CSS', 'Git & GitHub'],
    difficulty: 'intermediate',
    features: ['Add expense', 'Balances calculation', 'Minimal transfers suggestion', 'LocalStorage persistence'],
    stack: ['JavaScript', 'HTML/CSS', 'Git'],
    outcome: 'Deployed single-page app handling arbitrary expense sets.',
    extension: 'Add currency conversion via a free API.',
  }],
  SQL: [{
    title: 'Library Lending Database',
    problem: 'A small library needs to track books, members and loans with overdue alerts.',
    skills: ['SQL', 'REST APIs', 'Programming Fundamentals'],
    difficulty: 'beginner',
    features: ['Schema with 4+ tables', 'Overdue loan query', 'Popular-books report', 'Seed data script'],
    stack: ['SQLite', 'Python or Node', 'Git'],
    outcome: 'Working schema + queries answering 10 business questions.',
    extension: 'Wrap queries into a small REST API.',
  }],
  'Machine Learning': [{
    title: 'Exam Score Predictor',
    problem: 'Predict student exam scores from study hours, attendance and past scores to advise study plans.',
    skills: ['Machine Learning', 'Pandas', 'Statistics'],
    difficulty: 'intermediate',
    features: ['EDA notebook', 'Feature engineering', '3 model comparison', 'Error analysis section'],
    stack: ['Python', 'pandas', 'scikit-learn'],
    outcome: 'Notebook with honest evaluation and limitations section.',
    extension: 'Deploy as a Streamlit app.',
  }],
};

const GENERIC_PROJECTS = [
  {
    title: 'Skill Showcase Mini-Project',
    problem: 'Consolidate your newest skill into a small, finished artifact you can demo and push to GitHub.',
    skills: [], // filled at runtime
    difficulty: 'beginner',
    features: ['Clear scope (≤1 week)', 'README with screenshots', '3 core features', 'One documented bug fix'],
    stack: ['Your target stack'],
    outcome: 'A repo that visibly demonstrates the target skill.',
    extension: 'Add tests to the most fragile part.',
  },
];

export function generateProjectIdea(userId: string, skill?: string): Record<string, unknown> {
  const db = getDb();
  const profileRow = db.prepare('SELECT target_role FROM profiles WHERE user_id = ?').get(userId) as any;
  const gap = profileRow?.target_role ? computeGapAnalysis(userId, profileRow.target_role) : null;
  const chosenSkill = skill || gap?.biggestGaps[0]?.skill || 'JavaScript';
  const pool = PROJECT_IDEAS[chosenSkill] || [];
  const idea = pool.length
    ? pool[Math.floor(Math.random() * pool.length)]
    : { ...GENERIC_PROJECTS[0], skills: [chosenSkill], stack: [chosenSkill, 'Git & GitHub'] };
  return { ...idea, skill: chosenSkill, why: `Projects convert ${chosenSkill} knowledge into durable skill — and it's a current gap for ${profileRow?.target_role || 'your target role'}.` };
}

// ---------------- Explainability ----------------

export function explainRecommendation(userId: string, subject: string): string {
  const db = getDb();
  const profile = db.prepare('SELECT target_role FROM profiles WHERE user_id = ?').get(userId) as any;
  const role = profile?.target_role || 'your target role';
  const gap = profile?.target_role ? computeGapAnalysis(userId, role) : null;
  const item = gap?.items.find(i => i.skill === subject);
  if (!item) return `Recommendations follow from your gap analysis vs ${role} requirements.`;
  return `${subject} was prioritized because it is a ${item.importance} skill for ${role}: you're at ${item.current}% vs ${item.target}% expected (${item.state.replace('-', ' ')}), and ${item.unlocks.length} downstream skill(s) depend on it.`;
}
