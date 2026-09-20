import { getDb, uid } from '@/lib/db';
import { SKILLS } from '@/lib/domain/skills';
import { getRoleTemplate, heuristicCustomRole, roleRequirements } from '@/lib/domain/roles';

export interface OnboardingPayload {
  name: string;
  education: string;
  currentStatus: string;
  skills: Array<{ name: string; level: number }>;
  targetRole: string;
  careerGoal: string;
  dailyMinutes: number;
  learningStyle: string;
  projects?: Array<{ title: string; description: string }>;
  certificates?: Array<{ title: string; issuer?: string }>;
  portfolioUrl?: string;
  githubUrl?: string;
}

function ensureSkillId(name: string): string {
  const db = getDb();
  const normalized = name.trim();
  const cat = SKILLS.find(s => s.name.toLowerCase() === normalized.toLowerCase())?.category || 'Custom';
  db.prepare('INSERT OR IGNORE INTO skills (id, name, category) VALUES (?,?,?)')
    .run(uid(), normalized, cat);
  const row = db.prepare('SELECT id FROM skills WHERE name = ?').get(normalized) as any;
  return row.id;
}

export function saveOnboarding(userId: string, payload: OnboardingPayload) {
  const db = getDb();
  db.prepare('UPDATE users SET name = ?, onboarded = 0 WHERE id = ?').run(payload.name.trim() || 'Learner', userId);

  const custom = !getRoleTemplate(payload.targetRole);
  let roleId: string;
  const existingRole = db.prepare('SELECT id FROM target_roles WHERE name = ?').get(payload.targetRole) as any;
  if (existingRole) {
    roleId = existingRole.id;
  } else {
    roleId = uid();
    const tpl = getRoleTemplate(payload.targetRole) || heuristicCustomRole(payload.targetRole);
    db.prepare('INSERT INTO target_roles (id, name, slug, description, is_custom, owner_user_id) VALUES (?,?,?,?,?,?)')
      .run(roleId, tpl.name, tpl.slug, tpl.description, custom ? 1 : 0, custom ? userId : null);
    // persist role_skills + role_meta
    for (const req of roleRequirements(tpl)) {
      const sid = ensureSkillId(req.skill);
      db.prepare('INSERT OR IGNORE INTO role_skills (role_id, skill_id, importance, target_level) VALUES (?,?,?,?)')
        .run(roleId, sid, req.importance, req.target);
    }
    db.prepare('INSERT OR REPLACE INTO role_meta (role_id, recommended_projects, practice_areas, interview_areas, typical_roadmap) VALUES (?,?,?,?,?)')
      .run(roleId, JSON.stringify(tpl.recommended_projects), JSON.stringify(tpl.practice_areas), JSON.stringify(tpl.interview_areas), JSON.stringify(tpl.typical_roadmap));
  }

  db.prepare(`
    INSERT INTO profiles (user_id, education, current_status, target_role, target_role_id, career_goal, daily_minutes, learning_style)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET
      education = excluded.education,
      current_status = excluded.current_status,
      target_role = excluded.target_role,
      target_role_id = excluded.target_role_id,
      career_goal = excluded.career_goal,
      daily_minutes = excluded.daily_minutes,
      learning_style = excluded.learning_style,
      updated_at = datetime('now')`)
    .run(userId, payload.education || '', payload.currentStatus || '', payload.targetRole, roleId, payload.careerGoal || '', payload.dailyMinutes || 60, payload.learningStyle || 'mixed');

  for (const s of payload.skills || []) {
    if (!s.name?.trim()) continue;
    const sid = ensureSkillId(s.name);
    db.prepare(`
      INSERT INTO user_skills (user_id, skill_id, level, source, confidence)
      VALUES (?,?,?, 'self_reported', 1.0)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET level = excluded.level, source = 'self_reported'`)
      .run(userId, sid, Math.max(0, Math.min(100, s.level)));
  }

  for (const p of payload.projects || []) {
    if (!p.title?.trim()) continue;
    db.prepare('INSERT INTO projects (id, user_id, title, description, skills, source) VALUES (?,?,?,?,?,?)')
      .run(uid(), userId, p.title.trim().slice(0, 120), (p.description || '').slice(0, 800), '[]', 'user_added');
  }
  for (const c of payload.certificates || []) {
    if (!c.title?.trim()) continue;
    db.prepare('INSERT INTO certificates (id, user_id, title, issuer) VALUES (?,?,?,?)')
      .run(uid(), userId, c.title.trim().slice(0, 120), (c.issuer || '').slice(0, 80));
  }
  if (payload.githubUrl || payload.portfolioUrl) {
    db.prepare('INSERT INTO projects (id, user_id, title, description, skills, source) VALUES (?,?,?,?,?,?)')
      .run(uid(), userId, payload.githubUrl ? 'GitHub profile' : 'Portfolio', payload.githubUrl || payload.portfolioUrl, '[]', 'link');
  }

  logOnboarding(userId, payload);
}

function logOnboarding(userId: string, payload: OnboardingPayload) {
  getDb().prepare('INSERT INTO activity_logs (id, user_id, type, message, meta_json) VALUES (?,?,?,?,?)')
    .run(uid(), userId, 'onboarding', `Onboarding completed: ${payload.skills?.length || 0} skills self-reported, target role ${payload.targetRole}.`, '{}');
}

export function markOnboarded(userId: string) {
  getDb().prepare('UPDATE users SET onboarded = 1 WHERE id = ?').run(userId);
}

export function getProfileBundle(userId: string) {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, onboarded, is_demo FROM users WHERE id = ?').get(userId) as any;
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
  const skills = db.prepare(`
    SELECT s.name, s.category, us.level, us.source FROM user_skills us
    JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? ORDER BY us.level DESC`).all(userId) as any[];
  const projects = db.prepare('SELECT id, title, description, source FROM projects WHERE user_id = ?').all(userId) as any[];
  const certificates = db.prepare('SELECT id, title, issuer FROM certificates WHERE user_id = ?').all(userId) as any[];
  const latestResume = db.prepare('SELECT id, filename, parsed_json, created_at FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;
  return {
    user: user ? { id: user.id, email: user.email, name: user.name, onboarded: !!user.onboarded, isDemo: !!user.is_demo } : null,
    profile: profile ? {
      education: profile.education,
      currentStatus: profile.current_status,
      targetRole: profile.target_role,
      careerGoal: profile.career_goal,
      dailyMinutes: profile.daily_minutes,
      learningStyle: profile.learning_style,
    } : null,
    skills: skills.map(s => ({ name: s.name, category: s.category, level: s.level, source: s.source })),
    projects,
    certificates,
    resume: latestResume ? { id: latestResume.id, filename: latestResume.filename, parsed: latestResume.parsed_json ? JSON.parse(latestResume.parsed_json) : null, createdAt: latestResume.created_at } : null,
  };
}
