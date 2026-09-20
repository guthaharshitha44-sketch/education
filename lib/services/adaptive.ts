import { getDb, uid } from '@/lib/db';
import { computeGapAnalysis, userSkillsMap } from './gap';
import { buildRoadplan, saveRoadmap, Roadplan, RoadmapTask } from './roadmap';

export interface AdaptResult {
  adapted: boolean;
  reason?: string;
  changes?: string[];
  version?: number;
}

function bumpSkillLevel(userId: string, skill: string, delta: number, source: string) {
  const db = getDb();
  const srow = db.prepare('SELECT id FROM skills WHERE name = ?').get(skill) as any;
  if (!srow) return;
  const existing = db.prepare('SELECT level, source FROM user_skills WHERE user_id = ? AND skill_id = ?')
    .get(userId, srow.id) as any;
  if (existing) {
    db.prepare('UPDATE user_skills SET level = MIN(100, MAX(0, level + ?)), updated_at = datetime(\'now\') WHERE user_id = ? AND skill_id = ?')
      .run(delta, userId, srow.id);
  } else {
    db.prepare('INSERT INTO user_skills (user_id, skill_id, level, source, confidence) VALUES (?,?,?,?,?)')
      .run(userId, srow.id, Math.max(5, 20 + delta), source, 1.0);
  }
}

export function logActivity(userId: string, type: string, message: string, meta: Record<string, unknown> = {}) {
  const db = getDb();
  db.prepare('INSERT INTO activity_logs (id, user_id, type, message, meta_json) VALUES (?,?,?,?,?)')
    .run(uid(), userId, type, message, JSON.stringify(meta));
}

// Called when a task is completed. Score 0-100 optional (quiz/practice).
export function onTaskCompleted(userId: string, taskId: string, score?: number): AdaptResult {
  const db = getDb();
  const task = db.prepare('SELECT * FROM learning_tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as any;
  if (!task || task.status === 'done') return { adapted: false };

  db.prepare('UPDATE learning_tasks SET status = \'done\', score = ?, completed_at = datetime(\'now\') WHERE id = ?')
    .run(score ?? null, taskId);

  // progress snapshot upsert for today
  const day = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO progress_snapshots (id, user_id, day, minutes, tasks_completed, readiness)
    VALUES (?,?,?, ?, ?, 0)
    ON CONFLICT(user_id, day) DO UPDATE SET
      minutes = minutes + excluded.minutes,
      tasks_completed = tasks_completed + 1`)
    .run(uid(), userId, day, task.est_minutes, 1);

  // slow, evidence-based skill growth
  const growth = task.type === 'project' ? 8 : task.type === 'practice' ? 5 : task.type === 'quiz' ? 4 : 3;
  bumpSkillLevel(userId, task.skill, score !== undefined ? Math.round(growth * (0.5 + score / 200)) : growth, 'earned');
  logActivity(userId, 'task_completed', `Completed "${task.title}" (${task.skill})${score !== undefined ? ` — scored ${Math.round(score)}%` : ''}`, { taskId, score });

  return assessAndAdapt(userId, `Task "${task.title}" completed with ${score !== undefined ? score + '%' : 'no score'}.`);
}

export function onTaskSkipped(userId: string, taskId: string, reason: string): AdaptResult {
  const db = getDb();
  const task = db.prepare('SELECT * FROM learning_tasks WHERE id = ? AND user_id = ?').get(taskId, userId) as any;
  if (!task) return { adapted: false };
  db.prepare("UPDATE learning_tasks SET status = 'skipped', skipped_reason = ? WHERE id = ?").run(reason, taskId);
  logActivity(userId, 'task_skipped', `Skipped "${task.title}" — ${reason || 'no reason given'}`, { taskId });

  // A skipped task today is moved forward: same task, next day offset.
  db.prepare('INSERT INTO learning_tasks (id, user_id, roadmap_id, skill, title, type, description, day_offset, est_minutes, difficulty, why) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(uid(), userId, task.roadmap_id, task.skill, task.title, task.type, task.description, (task.day_offset || 0) + 1, task.est_minutes, task.difficulty, `Rescheduled after skip: ${reason || 'user chose to skip'}`);
  logActivity(userId, 'roadmap_adapted', `Rescheduled "${task.title}" to tomorrow.`, { taskId });
  return { adapted: true, reason: 'Task rescheduled to keep today\'s plan achievable.', changes: [`Moved "${task.title}" to tomorrow`] };
}

export function detectStruggles(userId: string): void {
  const db = getDb();
  // quiz/practice performance per skill from attempts + low-scored tasks
  const rows = db.prepare(`
    SELECT a.skill, aa.score * 100.0 / NULLIF(aa.total, 0) AS pct, 'assessment' AS src, aa.created_at
    FROM assessment_attempts aa JOIN assessments a ON a.id = aa.assessment_id
    WHERE aa.user_id = ?
    UNION ALL
    SELECT skill, score AS pct, 'task' AS src, completed_at AS created_at
    FROM learning_tasks
    WHERE user_id = ? AND score IS NOT NULL AND status = 'done'`).all(userId, userId) as Array<{ skill: string; pct: number; src: string; created_at: string }>;

  const bySkill: Record<string, Array<{ pct: number; src: string }>> = {};
  for (const r of rows) {
    if (r.pct == null) continue;
    (bySkill[r.skill] ||= []).push({ pct: r.pct, src: r.src });
  }

  for (const [skill, list] of Object.entries(bySkill)) {
    const recent = list.slice(-6);
    const lows = recent.filter(x => x.pct < 50);
    const fails = recent.filter(x => x.pct < 40);
    if (lows.length >= 2 && lows.length / recent.length >= 0.5) {
      const evidence = recent.map(x => `${x.src === 'assessment' ? 'Assessment' : 'Practice'}: ${Math.round(x.pct)}%`);
      const severity = lows.length >= 4 ? 3 : 2;
      db.prepare(`
        INSERT INTO struggle_areas (id, user_id, skill, evidence_json, severity, resolved)
        VALUES (?,?,?,?,?,0)
        ON CONFLICT(user_id, skill) DO UPDATE SET
          evidence_json = excluded.evidence_json,
          severity = MAX(severity, excluded.severity),
          detected_at = datetime('now'),
          resolved = 0`)
        .run(uid(), userId, skill, JSON.stringify(evidence), severity);
      logActivity(userId, 'struggle_detected', `Struggle pattern detected in ${skill}: ${lows.length} low results recently.`, { skill });
    }
  }
}

export function assessAndAdapt(userId: string, trigger: string): AdaptResult {
  const db = getDb();
  detectStruggles(userId);
  const profile = db.prepare('SELECT target_role, daily_minutes, learning_style FROM profiles WHERE user_id = ?').get(userId) as any;
  if (!profile?.target_role) return { adapted: false };

  const struggles = db.prepare('SELECT skill, severity FROM struggle_areas WHERE user_id = ? AND resolved = 0').all(userId) as Array<{ skill: string; severity: number }>;
  const recentScores = db.prepare(`
    SELECT a.skill, aa.score * 100.0 / NULLIF(aa.total, 0) AS pct
    FROM assessment_attempts aa JOIN assessments a ON a.id = aa.assessment_id
    WHERE aa.user_id = ? ORDER BY aa.created_at DESC LIMIT 3`).all(userId) as Array<{ skill: string; pct: number }>;

  let changes: string[] = [];
  let shouldRebuild = false;
  let reasonBits: string[] = [trigger];

  for (const s of struggles) {
    if (s.severity >= 2) {
      shouldRebuild = true;
      reasonBits.push(`Repeated difficulty in ${s.skill}`);
    }
  }
  const avgRecent = recentScores.length ? recentScores.reduce((a, b) => a + (b.pct || 0), 0) / recentScores.length : null;
  if (avgRecent !== null && avgRecent >= 85) {
    shouldRebuild = true;
    reasonBits.push(`Strong recent assessment average (${Math.round(avgRecent)}%) — accelerating`);
  }
  if (avgRecent !== null && avgRecent < 45 && recentScores.length >= 2) {
    shouldRebuild = true;
    reasonBits.push(`Low recent assessment average (${Math.round(avgRecent)}%) — reinforcing foundations`);
  }

  if (!shouldRebuild) return { adapted: false };

  const gap = computeGapAnalysis(userId, profile.target_role);

  // reinforcement: struggling skills get review tasks injected at the front
  const reinforcement: RoadmapTask[] = struggles.map(s => ({
    skill: s.skill,
    title: `${s.skill} reinforcement session`,
    type: 'review' as const,
    description: `Rebuild fundamentals of ${s.skill}: re-read core concepts, then solve 3 guided problems slowly, checking each step.`,
    day_offset: 0,
    est_minutes: 30,
    difficulty: 'beginner' as const,
    why: `Struggle detection: ${s.severity >= 3 ? 'severe' : 'moderate'} — ${s.severity >= 3 ? 4 : 2}+ low results recently. Slowing down to solidify basics before new material.`,
  }));

  const base = buildRoadplan(userId, profile.target_role, { dailyMinutes: profile.daily_minutes, style: profile.learning_style, gapOverride: gap });

  // prepend reinforcement into today/this_week/30d
  const merged: RoadmapTask[] = [...reinforcement, ...base.today, ...base.this_week, ...base.next_30_days];
  const seen = new Set<string>();
  const dedup = merged.filter(t => {
    const k = `${t.skill}|${t.title}|${t.day_offset}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // push non-reinforcement tasks one day later
  const shifted = dedup.map(t =>
    reinforcement.some(r => r.skill === t.skill && r.title === t.title)
      ? t
      : { ...t, day_offset: t.day_offset + 1 });

  const plan: Roadplan = {
    ...base,
    today: shifted.filter(t => t.day_offset === 0).slice(0, 4),
    this_week: shifted.filter(t => t.day_offset < 7),
    next_30_days: shifted.filter(t => t.day_offset < 30),
    generated_reason: reasonBits.join('. '),
  };

  const saved = saveRoadmap(userId, plan, reasonBits.join('. '));
  changes = [
    ...reinforcement.map(r => `Added: ${r.title}`),
    `Rescheduled upcoming topics by +1 day to make room`,
  ];

  logActivity(userId, 'roadmap_adapted', `EduPath adapted your plan: ${changes.join('; ')}. Reason: ${reasonBits.join('; ')}`, { version: saved.version });
  return { adapted: true, reason: reasonBits.join('. '), changes, version: saved.version };
}
