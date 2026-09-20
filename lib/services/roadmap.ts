import { getDb, uid } from '@/lib/db';
import { computeGapAnalysis, GapAnalysis, userSkillsMap } from './gap';
import { resourcesForSkill } from '@/lib/domain/resources';

export interface RoadmapTask {
  id?: string;
  skill: string;
  title: string;
  type: 'learn' | 'practice' | 'quiz' | 'project' | 'review';
  description: string;
  day_offset: number;
  est_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  why: string;
}

export interface Roadplan {
  version: number;
  role: string;
  daily_minutes: number;
  weekly_hours: number;
  style: string;
  today: RoadmapTask[];
  this_week: RoadmapTask[];
  next_30_days: RoadmapTask[];
  long_term: Array<{ phase: string; skills: string[]; goal: string }>;
  generated_reason: string;
}

const LEARN_TEMPLATES: Record<string, Array<{ title: string; desc: string; mins: number; diff: RoadmapTask['difficulty'] }>> = {
  'Programming Fundamentals': [
    { title: 'Core syntax drills', desc: 'Work through 6 short exercises covering variables, loops, functions and collections.', mins: 45, diff: 'beginner' },
    { title: 'Mini problem set', desc: 'Solve 5 beginner problems using conditionals, loops and basic data handling.', mins: 40, diff: 'beginner' },
  ],
  'Data Structures & Algorithms': [
    { title: 'Arrays & strings pattern set', desc: 'Traversal, two-pointer and sliding-window basics: 5 beginner + 2 intermediate problems.', mins: 50, diff: 'beginner' },
    { title: 'Hashing & prefix sums', desc: 'Learn hashing patterns; solve 4 problems applying maps and prefix sums.', mins: 45, diff: 'intermediate' },
    { title: 'Recursion fundamentals', desc: 'Trace recursive calls on paper, then solve 4 recursion problems from scratch.', mins: 45, diff: 'intermediate' },
    { title: 'Sorting & searching', desc: 'Implement binary search variants and one sorting algorithm; 4 practice problems.', mins: 45, diff: 'intermediate' },
  ],
  'Git & GitHub': [
    { title: 'Branch & merge workflow', desc: 'Practice feature-branch workflow: branch, commit, merge, resolve a conflict.', mins: 30, diff: 'beginner' },
    { title: 'Collaboration simulation', desc: 'Fork a repo, open a pull request describing your changes clearly.', mins: 40, diff: 'beginner' },
  ],
  'HTML & CSS': [
    { title: 'Layout lab: flexbox & grid', desc: 'Rebuild 3 UI cards using flexbox, then a page section with CSS grid.', mins: 45, diff: 'beginner' },
    { title: 'Responsive landing section', desc: 'Build a responsive hero + features section that works at 390px and 1440px.', mins: 50, diff: 'beginner' },
  ],
  JavaScript: [
    { title: 'Functions & arrays deep dive', desc: 'Master map/filter/reduce with 6 small exercises.', mins: 45, diff: 'beginner' },
    { title: 'DOM & events mini-app', desc: 'Build a small interactive widget (todo/counter) manipulating the DOM.', mins: 50, diff: 'beginner' },
  ],
  TypeScript: [
    { title: 'Types & interfaces practice', desc: 'Convert 3 small JS snippets to typed TS, including interfaces and unions.', mins: 40, diff: 'beginner' },
  ],
  React: [
    { title: 'Components & props lab', desc: 'Build a reusable card list with props and list keys.', mins: 45, diff: 'beginner' },
    { title: 'State & hooks drills', desc: 'useState/useEffect exercises: counter, fetch-on-mount, form state.', mins: 50, diff: 'intermediate' },
  ],
  Python: [
    { title: 'Python fluency set 1', desc: 'Loops, lists, dicts: 6 short exercises with edge cases.', mins: 40, diff: 'beginner' },
    { title: 'Python fluency set 2', desc: 'Functions, file handling and error handling exercises.', mins: 45, diff: 'beginner' },
  ],
  Java: [
    { title: 'OOP essentials', desc: 'Classes, inheritance and interfaces: write 3 small class hierarchies.', mins: 50, diff: 'beginner' },
    { title: 'Collections practice', desc: 'ArrayList/HashMap drills: 5 exercises including iteration and sorting.', mins: 45, diff: 'beginner' },
  ],
  SQL: [
    { title: 'Joins & aggregations', desc: '10 queries practicing INNER/LEFT joins, GROUP BY and HAVING.', mins: 40, diff: 'beginner' },
    { title: 'Schema design basics', desc: 'Design a schema for a library app; write 5 queries against it.', mins: 45, diff: 'intermediate' },
  ],
  'REST APIs': [
    { title: 'API design workshop', desc: 'Design endpoints for a notes app: resources, verbs, status codes.', mins: 40, diff: 'beginner' },
  ],
  'Node.js': [
    { title: 'Build a small API', desc: 'Implement CRUD endpoints for a notes API with Express.', mins: 55, diff: 'intermediate' },
  ],
  'Machine Learning': [
    { title: 'First supervised model', desc: 'Train/evaluate a classifier on a Kaggle dataset; log metrics.', mins: 60, diff: 'intermediate' },
    { title: 'Model evaluation clinic', desc: 'Practice accuracy vs precision/recall tradeoffs on 2 datasets.', mins: 45, diff: 'intermediate' },
  ],
  Statistics: [
    { title: 'Descriptive stats drills', desc: 'Mean/median/variance exercises plus one hypothesis-test walkthrough.', mins: 40, diff: 'beginner' },
  ],
  Pandas: [
    { title: 'DataFrame operations set', desc: 'Filtering, groupby, merge: 8 exercises on a messy CSV.', mins: 45, diff: 'beginner' },
  ],
  'Data Visualization': [
    { title: 'Chart choice workshop', desc: 'Pick correct chart types for 6 scenarios; build 3 in matplotlib.', mins: 40, diff: 'beginner' },
  ],
  'Linux & Shell': [
    { title: 'Command-line survival set', desc: 'File ops, permissions and pipes: 12 terminal tasks.', mins: 40, diff: 'beginner' },
  ],
  'Cybersecurity Fundamentals': [
    { title: 'Threat model basics', desc: 'Map threats for a login system; write mitigations for the top 5.', mins: 45, diff: 'intermediate' },
  ],
  'Web Security (OWASP)': [
    { title: 'OWASP Top 10 walkthrough', desc: 'For each of the top 10, write one attack example and one defense.', mins: 50, diff: 'intermediate' },
  ],
  'Cloud Platforms (AWS/GCP/Azure)': [
    { title: 'Cloud free-tier lab', desc: 'Provision storage + compute in free tier; tear down and document.', mins: 60, diff: 'intermediate' },
  ],
  Docker: [
    { title: 'Containerize an app', desc: 'Write a Dockerfile for a small web app and run it locally.', mins: 55, diff: 'intermediate' },
  ],
  'Power BI / Tableau': [
    { title: 'First dashboard', desc: 'Build a sales dashboard with 4 visuals and one slicer.', mins: 50, diff: 'beginner' },
  ],
  'Excel & Sheets': [
    { title: 'Formulas & pivots', desc: 'VLOOKUP/XLOOKUP, conditional formulas and one pivot table task.', mins: 40, diff: 'beginner' },
  ],
  'System Design': [
    { title: 'Design a URL shortener', desc: 'Write the design: API, storage, caching, scaling notes.', mins: 50, diff: 'advanced' },
  ],
  Testing: [
    { title: 'Unit test bootcamp', desc: 'Write 8 unit tests for a small module, including 2 edge cases.', mins: 40, diff: 'beginner' },
  ],
  'NoSQL (MongoDB)': [
    { title: 'Document modeling drills', desc: 'Model 3 entities as documents; write 5 queries.', mins: 40, diff: 'beginner' },
  ],
  'Networking Fundamentals': [
    { title: 'Packet walkthrough', desc: 'Trace a request end-to-end (DNS→TCP→TLS→HTTP) in your own words.', mins: 40, diff: 'beginner' },
  ],
  'Big Data Tools': [
    { title: 'Spark intro exercises', desc: 'Run 5 Spark DataFrame operations on a sample dataset.', mins: 45, diff: 'intermediate' },
  ],
};

const DIFFICULTY_MAP = {
  beginner: { learn: 25, practice: 35, quiz: 15, project: 90, review: 20 },
  intermediate: { learn: 30, practice: 45, quiz: 20, project: 120, review: 25 },
  advanced: { learn: 35, practice: 50, quiz: 25, project: 150, review: 30 },
};

export function pickTemplates(gap: GapAnalysis, style: string): RoadmapTask[] {
  const ordered = [...gap.biggestGaps];
  const tasks: RoadmapTask[] = [];
  let day = 0;
  let dayMinutes = 0;
  const daily = 60; // baseline; adjusted by caller
  for (const item of ordered) {
    const t = LEARN_TEMPLATES[item.skill] || [{
      title: `${item.skill} focused study block`,
      desc: `Work through curated ${item.skill} material matched to your ${item.state.replace('-', ' ')} state.`,
      mins: 45,
      diff: item.target > 75 ? 'advanced' as const : 'intermediate' as const,
    }];
    for (const tmpl of t) {
      tasks.push({
        skill: item.skill,
        title: tmpl.title,
        type: 'learn',
        description: tmpl.desc,
        day_offset: day,
        est_minutes: tmpl.mins,
        difficulty: tmpl.diff,
        why: `${item.skill} is ${/^[aeiou]/i.test(item.importance) ? 'an' : 'a'} ${item.importance} skill for ${gap.role} (current ${item.current}%, target ${item.target}%).`,
      });
      dayMinutes += tmpl.mins;
      if (dayMinutes >= daily) { day++; dayMinutes = 0; }
      // one practice task per skill after its learn block
      tasks.push({
        skill: item.skill,
        title: `${item.skill} practice set`,
        type: 'practice',
        description: `Solve 4–5 exercises applying ${item.skill}. Focus on accuracy first, speed second.`,
        day_offset: day,
        est_minutes: 35,
        difficulty: item.target > 75 ? 'advanced' : 'intermediate',
        why: `Practice converts knowledge of ${item.skill} into durable skill.`,
      });
      dayMinutes += 35;
      if (dayMinutes >= daily) { day++; dayMinutes = 0; }
    }
  }
  return tasks;
}

export function buildRoadplan(
  userId: string,
  targetRole: string,
  opts: { dailyMinutes: number; style: string; gapOverride?: GapAnalysis }
): Roadplan {
  const db = getDb();
  const gap = opts.gapOverride || computeGapAnalysis(userId, targetRole);
  const tasks = pickTemplates(gap, opts.style);

  // spread tasks across days based on available daily minutes
  let day = 0, used = 0;
  const spread: RoadmapTask[] = [];
  for (const t of tasks) {
    let task = { ...t };
    if (used > 0 && used + task.est_minutes > opts.dailyMinutes + 15) {
      day++; used = 0;
    }
    task.day_offset = day;
    spread.push(task);
    used += task.est_minutes;
  }

  const today = spread.filter(t => t.day_offset === 0).slice(0, 4);
  const thisWeek = spread.filter(t => t.day_offset < 7);
  const next30 = spread.filter(t => t.day_offset < 30);

  const longTerm: Roadplan['long_term'] = [];
  const phases = ['Foundations', 'Core skills', 'Applied practice', 'Interview & polish'];
  const skillsByPhase = Math.max(1, Math.ceil(gap.biggestGaps.length / 4));
  gap.biggestGaps.forEach((g, i) => {
    const phase = phases[Math.min(3, Math.floor(i / skillsByPhase))];
    const bucket = longTerm.find(b => b.phase === phase);
    if (bucket) bucket.skills.push(g.skill);
    else longTerm.push({ phase, skills: [g.skill], goal: `Reach role-level confidence in ${g.skill}` });
  });

  return {
    version: 0,
    role: targetRole,
    daily_minutes: opts.dailyMinutes,
    weekly_hours: Math.round((opts.dailyMinutes * 7) / 60),
    style: opts.style,
    today,
    this_week: thisWeek,
    next_30_days: next30,
    long_term: longTerm,
    generated_reason: `Built from your ${gap.biggestGaps.length} priority gaps for ${targetRole}, paced for ${opts.dailyMinutes} min/day (${opts.style} style).`,
  };
}

export function saveRoadmap(userId: string, plan: Roadplan, reason: string): { id: string; version: number } {
  const db = getDb();
  const current = db.prepare('SELECT MAX(version) v FROM roadmaps WHERE user_id = ?').get(userId) as any;
  const version = (current?.v || 0) + 1;
  const id = uid();
  plan.version = version;
  db.prepare('UPDATE roadmaps SET active = 0 WHERE user_id = ?').run(userId);
  db.prepare('INSERT INTO roadmaps (id, user_id, version, reason, plan_json, active) VALUES (?,?,?,?,?,1)')
    .run(id, userId, version, reason, JSON.stringify(plan));

  // replace outstanding planned tasks with the new plan (completed history is kept)
  db.prepare("DELETE FROM learning_tasks WHERE user_id = ? AND status = 'todo'").run(userId);

  // materialize learning_tasks for the next 30 days
  const all = [...plan.today, ...plan.this_week, ...plan.next_30_days];
  const seen = new Set<string>();
  for (const t of all) {
    const key = `${t.skill}|${t.title}|${t.day_offset}`;
    if (seen.has(key)) continue;
    seen.add(key);
    db.prepare(`
      INSERT INTO learning_tasks (id, user_id, roadmap_id, skill, title, type, description, day_offset, est_minutes, difficulty, why)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(uid(), userId, id, t.skill, t.title, t.type, t.description, t.day_offset, t.est_minutes, t.difficulty, t.why);
  }
  return { id, version };
}
