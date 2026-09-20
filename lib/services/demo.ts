import { getDb, uid } from '@/lib/db';
import { SKILLS } from '@/lib/domain/skills';
import { computeGapAnalysis } from './gap';
import { buildRoadplan, saveRoadmap } from './roadmap';
import { logActivity } from './adaptive';
import { saveChatMessage } from './coach';

export function createDemoUser(): string {
  const db = getDb();
  seedSkillsCatalog(); // ensure the skills catalog exists before linking user skills
  const email = `demo_${Date.now()}@edupath.demo`;
  const userId = uid();
  db.prepare('INSERT INTO users (id, email, password_hash, name, is_demo, onboarded) VALUES (?,?,?,?,1,1)')
    .run(userId, email, 'demo:no-login', 'Aarav (Demo)');

  const upsert = (skill: string, level: number, source = 'self_reported', confidence = 1) => {
    const row = db.prepare('SELECT id FROM skills WHERE name = ?').get(skill) as any;
    if (!row) return;
    db.prepare(`INSERT INTO user_skills (user_id, skill_id, level, source, confidence) VALUES (?,?,?,?,?)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET level = excluded.level`).run(userId, row.id, level, source, confidence);
  };

  // Demo learner: 2nd-year CS student aiming at Software Engineer
  const skills: Array<[string, number, string]> = [
    ['Python', 62, 'resume_detected'], ['HTML & CSS', 70, 'resume_detected'],
    ['SQL', 48, 'resume_detected'], ['JavaScript', 34, 'resume_detected'],
    ['Java', 38, 'resume_detected'], ['Data Structures & Algorithms', 35, 'self_reported'],
    ['Git & GitHub', 42, 'resume_detected'], ['Programming Fundamentals', 58, 'self_reported'],
  ];
  for (const [s, lvl, src] of skills) upsert(s, lvl, src);

  db.prepare(`
    INSERT INTO profiles (user_id, education, current_status, target_role, career_goal, daily_minutes, learning_style, resume_text)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(userId, 'B.Tech Computer Science, 2nd year', 'Student', 'Software Engineer',
      'Land a product-based SDE internship by next summer', 90, 'hands-on coding',
      'Resume text placeholder (demo)');

  // resume analysis record
  db.prepare('INSERT INTO resumes (id, user_id, filename, mime, text, parsed_json) VALUES (?,?,?,?,?,?)')
    .run(uid(), userId, 'aarav_resume.pdf', 'application/pdf',
      'Aarav — B.Tech CS student. Skills: Python, HTML, CSS, SQL, basic Java, DSA basics, Git. Projects: Student Record Analyzer CLI; Personal portfolio website. Certificate: Google Data Analytics (in progress).',
      JSON.stringify({
        detectedSkills: [
          { skill: 'Python', level: 62, confidence: 0.9, evidence: ['python'] },
          { skill: 'HTML & CSS', level: 70, confidence: 0.92, evidence: ['html', 'css'] },
          { skill: 'SQL', level: 48, confidence: 0.85, evidence: ['sql'] },
          { skill: 'Java', level: 38, confidence: 0.7, evidence: ['java'] },
          { skill: 'JavaScript', level: 34, confidence: 0.55, evidence: ['javascript'] },
          { skill: 'Git & GitHub', level: 42, confidence: 0.8, evidence: ['git', 'github'] },
        ],
        projects: ['Student Record Analyzer CLI', 'Personal portfolio website'],
        certificates: ['Google Data Analytics (in progress)'],
        experience: ['Summer intern — college tech fest web team'],
        education: ['B.Tech Computer Science, 2nd year'],
        achievements: ['Top 10% in college coding contest'],
        summary: 'Second-year CS student with Python and web basics, building toward SDE readiness.',
        needsConfirmation: ['JavaScript'],
      }));

  // seeded project + certificate
  db.prepare('INSERT INTO projects (id, user_id, title, description, skills, source) VALUES (?,?,?,?,?,?)')
    .run(uid(), userId, 'Student Record Analyzer CLI', 'Python CLI that reads a CSV of scores and prints averages, rankings and at-risk students.', JSON.stringify(['Python', 'SQL']), 'user_added');
  db.prepare('INSERT INTO certificates (id, user_id, title, issuer) VALUES (?,?,?,?)')
    .run(uid(), userId, 'Google Data Analytics (in progress)', 'Coursera');

  // realistic 9-day progress history with a dip (struggle) pattern in DSA
  const days = [9, 8, 7, 6, 5, 4, 3, 2, 1];
  for (const d of days) {
    const day = new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);
    const minutes = [75, 60, 90, 45, 80, 30, 95, 70, 85][9 - d];
    const completed = [3, 2, 3, 1, 3, 1, 4, 2, 3][9 - d];
    db.prepare('INSERT OR IGNORE INTO progress_snapshots (id, user_id, day, minutes, tasks_completed, readiness) VALUES (?,?,?,?,?,0)')
      .run(uid(), userId, day, minutes, completed);
  }

  // practice/assessment history showing a recursion + DSA struggle pattern
  const addAttempt = (skill: string, title: string, pct: number, daysAgo: number) => {
    const aid = uid();
    db.prepare('INSERT INTO assessments (id, user_id, skill, title, difficulty, questions_json) VALUES (?,?,?,?,?,?)')
      .run(aid, userId, skill, title, 'medium', '[]');
    db.prepare('INSERT INTO assessment_attempts (id, assessment_id, user_id, answers_json, score, total, mistakes_json) VALUES (?,?,?,?,?,?,?)')
      .run(uid(), aid, userId, '[]', pct, 100, JSON.stringify(pct < 50 ? ['missed base case', 'wrong complexity estimate'] : []));
  };
  addAttempt('Data Structures & Algorithms', 'Arrays quiz', 72, 8);
  addAttempt('SQL', 'Joins quiz', 80, 7);
  addAttempt('Data Structures & Algorithms', 'Recursion diagnostic', 40, 6);
  addAttempt('JavaScript', 'Functions quiz', 64, 5);
  addAttempt('Data Structures & Algorithms', 'Recursion practice set', 44, 4);
  addAttempt('Python', 'Loop drills', 88, 3);
  addAttempt('Data Structures & Algorithms', 'Time complexity quiz', 42, 2);

  // struggle area derived from those attempts
  db.prepare('INSERT OR IGNORE INTO struggle_areas (id, user_id, skill, evidence_json, severity) VALUES (?,?,?,?,3)')
    .run(uid(), userId, 'Data Structures & Algorithms',
      JSON.stringify(['Assessment: 40%', 'Practice: 44%', 'Assessment: 42% — three low results in a row']));

  // roadmap v1 + adapted v2 for version history demo
  const gap = computeGapAnalysis(userId, 'Software Engineer');
  const plan1 = buildRoadplan(userId, 'Software Engineer', { dailyMinutes: 90, style: 'hands-on coding', gapOverride: gap });
  const v1 = saveRoadmap(userId, plan1, 'Initial plan from onboarding + resume analysis');
  const plan2 = buildRoadplan(userId, 'Software Engineer', { dailyMinutes: 90, style: 'hands-on coding', gapOverride: gap });
  plan2.today = [{
    skill: 'Data Structures & Algorithms',
    title: 'DSA reinforcement: recursion trace practice',
    type: 'review' as const,
    description: 'Rebuild recursion fundamentals: trace calls on paper, then solve 3 guided problems slowly.',
    day_offset: 0,
    est_minutes: 40,
    difficulty: 'beginner' as const,
    why: 'Struggle detection: three low DSA results recently. Slowing down before new material.',
  }, ...plan2.today.slice(0, 3)];
  plan2.this_week = [...plan2.today, ...plan2.this_week.filter(t => !plan2.today.some(x => x.title === t.title))].slice(0, 14);
  plan2.generated_reason = 'Adapted: added recursion reinforcement after low DSA assessment scores; dependent topics rescheduled';
  const v2 = saveRoadmap(userId, plan2, 'Adapted: added recursion reinforcement after low DSA assessment scores; rescheduled dependent topics by +1 day');

  // materialize a few completed tasks for realism (v1 history)
  const histTasks: Array<[string, string, string, number, number]> = [
    ['Python', 'Python fluency set 1', 'learn', 0, 8],
    ['Git & GitHub', 'Branch & merge workflow', 'learn', 1, 7],
    ['SQL', 'Joins & aggregations', 'practice', 2, 6],
    ['HTML & CSS', 'Layout lab: flexbox & grid', 'learn', 3, 5],
  ];
  for (const [skill, title, type, daysAgo, mins] of histTasks) {
    db.prepare(`INSERT INTO learning_tasks (id, user_id, roadmap_id, skill, title, type, description, day_offset, est_minutes, difficulty, why, status, score, completed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now', ?))`)
      .run(uid(), userId, v1.id, skill, title, type, 'Historical completed task from your first week.', 0, mins, 'beginner', 'Initial plan', 'done', 70 + Math.floor(Math.random() * 25), `-${daysAgo} days`);
  }

  // (saveRoadmap above already materialized plan2's tasks as learning_tasks,
  //  including today's 4 missions — no manual seeding needed here)

  logActivity(userId, 'onboarding', 'Demo learner profile created with realistic 9-day history.', {});
  logActivity(userId, 'roadmap_adapted', 'EduPath adapted your plan: added recursion reinforcement after low DSA scores.', { version: v2.version });

  // chat history
  saveChatMessage(userId, 'user', 'What should I study today?');
  saveChatMessage(userId, 'assistant', "Today's mission is ~90 minutes across 4 tasks. Start with \"DSA reinforcement: recursion trace practice\" — it targets your biggest gap and unblocks the rest of the week.");
  saveChatMessage(userId, 'user', 'Why did my roadmap change?');
  saveChatMessage(userId, 'assistant', 'Your roadmap was adapted after three low DSA results (40%, 44%, 42%). I added a recursion reinforcement session today and pushed dependent topics one day later. You can see every version in Reports → Roadmap history.');

  return userId;
}

export function seedSkillsCatalog() {
  const db = getDb();
  for (const s of SKILLS) {
    db.prepare('INSERT OR IGNORE INTO skills (id, name, category) VALUES (?,?,?)')
      .run(uid(), s.name, s.category);
  }
  // canonical deterministic ids are unnecessary; name is unique
}
