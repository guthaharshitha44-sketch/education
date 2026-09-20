import { getDb, uid } from '@/lib/db';
import { aiEnabled, generateStructured } from './llm';
import { logActivity } from './adaptive';

export type TaskKind = 'quiz' | 'coding' | 'debug' | 'scenario' | 'concept';

export interface PracticeQuestion {
  id: string;
  kind: TaskKind;
  skill: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prompt: string;
  choices?: string[];
  answerIndex?: number;
  explanation: string;
  expected?: string; // expected outcome for open-ended
  est_minutes: number;
}

export interface PracticeSet {
  id: string;
  skill: string;
  kind: TaskKind;
  questions: PracticeQuestion[];
}

// Deterministic question bank (used when no AI key; always the fallback).
const BANK: Record<string, Array<{ kind: TaskKind; diff: 'beginner'|'intermediate'|'advanced'; prompt: string; choices?: string[]; answer?: number; explanation: string; expected?: string }>> = {
  'Data Structures & Algorithms': [
    { kind: 'quiz', diff: 'beginner', prompt: 'What is the time complexity of binary search on a sorted array of n elements?', choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], answer: 1, explanation: 'Binary search halves the search space each step → O(log n).' },
    { kind: 'quiz', diff: 'beginner', prompt: 'Which data structure gives O(1) average lookup by key?', choices: ['Array', 'Stack', 'Hash map', 'Queue'], answer: 2, explanation: 'Hash maps hash the key to a bucket, giving O(1) average lookup.' },
    { kind: 'coding', diff: 'intermediate', prompt: 'Write a function that reverses a string without using built-in reverse helpers.', explanation: 'Iterate from both ends swapping, or build backwards. O(n) time, O(n) space.', expected: 'A working function with correct output for at least: "abc" → "cba", "" → "".' },
    { kind: 'debug', diff: 'intermediate', prompt: 'This loop is meant to sum an array but returns 0: `for (let i = 1; i < arr.length; i++) sum += arr[i]` with `sum` declared inside the loop. Find the two bugs.', explanation: 'Bug 1: sum is re-declared each iteration (declare outside). Bug 2: loop starts at i=1, skipping index 0.', expected: 'Identify scope bug and off-by-one start.' },
    { kind: 'concept', diff: 'beginner', prompt: 'Explain in your own words the difference between an array and a linked list.', explanation: 'Arrays: contiguous memory, O(1) index access, costly middle inserts. Linked lists: node-based, O(1) insert/delete at known node, no random access.', expected: 'Mention memory layout, access vs insertion tradeoff.' },
  ],
  JavaScript: [
    { kind: 'quiz', diff: 'beginner', prompt: 'What does `typeof null` return in JavaScript?', choices: ["'null'", "'object'", "'undefined'", 'throws'], answer: 1, explanation: "A historical bug: typeof null === 'object'." },
    { kind: 'quiz', diff: 'beginner', prompt: 'Which method creates a new array with elements that pass a test?', choices: ['forEach', 'map', 'filter', 'reduce'], answer: 2, explanation: 'filter returns a new array of elements where the predicate is true.' },
    { kind: 'coding', diff: 'intermediate', prompt: 'Write a function `chunk(arr, size)` that splits an array into sub-arrays of at most `size` elements.', explanation: 'Loop in steps of size, slicing each window.', expected: 'chunk([1,2,3,4,5],2) → [[1,2],[3,4],[5]].' },
    { kind: 'debug', diff: 'intermediate', prompt: 'Why might `document.querySelectorAll(".item").map(...)` throw in the browser?', explanation: 'querySelectorAll returns a NodeList, which has no .map. Use Array.from(...) first.', expected: 'Identify NodeList vs Array.' },
  ],
  React: [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which hook adds local state to a function component?', choices: ['useEffect', 'useState', 'useMemo', 'useRef'], answer: 1, explanation: 'useState declares a state variable and its setter.' },
    { kind: 'quiz', diff: 'intermediate', prompt: 'When does a useEffect with dependency array [a, b] re-run?', choices: ['Every render', 'Only on mount', 'When a or b changes', 'Never re-runs'], answer: 2, explanation: 'It re-runs when any listed dependency changes (after mount).' },
    { kind: 'coding', diff: 'intermediate', prompt: 'Write a React component that fetches from an API on mount and shows loading state.', explanation: 'useState for data/loading, useEffect with [] to fetch, cleanup optional.', expected: 'Correct hook usage with a loading flag.' },
  ],
  Python: [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which collection does NOT allow duplicate members?', choices: ['list', 'tuple', 'set', 'dict values'], answer: 2, explanation: 'Sets enforce uniqueness.' },
    { kind: 'quiz', diff: 'beginner', prompt: 'What does `len("abc" * 2)` evaluate to?', choices: ['3', '5', '6', 'error'], answer: 2, explanation: '"abc"*2 = "abcabc", length 6.' },
    { kind: 'coding', diff: 'intermediate', prompt: 'Write a function to count word frequencies in a sentence and return a dict.', explanation: 'Split then tally with a dict (or Counter).', expected: 'freq("a b a") → {"a": 2, "b": 1}.' },
  ],
  SQL: [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which JOIN returns all rows from the left table plus matches from the right?', choices: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN'], answer: 1, explanation: 'LEFT JOIN keeps unmatched left rows with NULLs on the right side.' },
    { kind: 'quiz', diff: 'intermediate', prompt: 'Which clause filters groups after aggregation?', choices: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], answer: 1, explanation: 'HAVING filters aggregated groups; WHERE filters rows pre-aggregation.' },
    { kind: 'coding', diff: 'intermediate', prompt: 'Write a query: total sales per region, highest first, only regions above 10,000.', explanation: 'SELECT region, SUM(amount) FROM sales GROUP BY region HAVING SUM(amount) > 10000 ORDER BY 2 DESC.', expected: 'GROUP BY + HAVING + ORDER BY.' },
  ],
  Java: [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which keyword creates a subclass relationship?', choices: ['implements', 'extends', 'inherits', 'super'], answer: 1, explanation: 'extends inherits from a class; implements is for interfaces.' },
    { kind: 'quiz', diff: 'beginner', prompt: 'What is the default value of an uninitialized int field in Java?', choices: ['null', '0', 'undefined', 'garbage'], answer: 1, explanation: 'Numeric fields default to 0; references to null.' },
  ],
  'Machine Learning': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which metric suits imbalanced binary classification best?', choices: ['Accuracy', 'F1-score', 'MSE', 'R²'], answer: 1, explanation: 'F1 balances precision and recall; accuracy misleads under imbalance.' },
    { kind: 'quiz', diff: 'intermediate', prompt: 'High training accuracy, low test accuracy suggests…', choices: ['Underfitting', 'Overfitting', 'Data leakage', 'Perfect model'], answer: 1, explanation: 'The model memorized training data — classic overfitting.' },
  ],
  'Git & GitHub': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which command stages a file for commit?', choices: ['git commit', 'git add', 'git push', 'git stage --now'], answer: 1, explanation: 'git add stages; commit records the staged snapshot.' },
    { kind: 'quiz', diff: 'beginner', prompt: 'What does `git pull` do?', choices: ['Uploads commits', 'Fetch + merge remote changes', 'Creates a branch', 'Reverts last commit'], answer: 1, explanation: 'pull = fetch + integrate remote branch.' },
  ],
  'HTML & CSS': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which CSS property controls space INSIDE an element border?', choices: ['margin', 'padding', 'gap', 'border-spacing'], answer: 1, explanation: 'Padding is inner space; margin is outer.' },
    { kind: 'quiz', diff: 'beginner', prompt: 'Which HTML tag semantically marks standalone content?', choices: ['<div>', '<article>', '<span>', '<section>'], answer: 1, explanation: '<article> is for standalone, self-contained content.' },
  ],
  'REST APIs': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which HTTP verb updates a resource partially?', choices: ['GET', 'POST', 'PATCH', 'DELETE'], answer: 2, explanation: 'PATCH applies a partial update; PUT replaces whole resource.' },
    { kind: 'quiz', diff: 'intermediate', prompt: 'What does HTTP 201 mean?', choices: ['OK', 'Created', 'No content', 'Bad request'], answer: 1, explanation: '201 Created — successful creation of a resource.' },
  ],
  Statistics: [
    { kind: 'quiz', diff: 'beginner', prompt: 'What does a p-value below 0.05 conventionally indicate?', choices: ['The null hypothesis is true', 'Statistically significant result', 'Large effect size', 'Sampling error is zero'], answer: 1, explanation: 'Evidence against the null at the 5% level — not proof of truth.' },
  ],
  Pandas: [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which pandas method shows the first 5 rows?', choices: ['head()', 'first()', 'top()', 'preview()'], answer: 0, explanation: 'df.head() defaults to 5 rows.' },
  ],
  'Linux & Shell': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which command lists files including hidden ones?', choices: ['ls', 'ls -a', 'ls -h', 'dir /all'], answer: 1, explanation: '-a includes dotfiles.' },
  ],
  Docker: [
    { kind: 'quiz', diff: 'beginner', prompt: 'What file defines the image build steps?', choices: ['docker-compose.yml', 'Dockerfile', 'container.json', 'image.cfg'], answer: 1, explanation: 'A Dockerfile scripts the image build.' },
  ],
  'Cloud Platforms (AWS/GCP/Azure)': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which AWS service is object storage?', choices: ['EC2', 'S3', 'RDS', 'VPC'], answer: 1, explanation: 'S3 stores objects in buckets.' },
  ],
  'Cybersecurity Fundamentals': [
    { kind: 'quiz', diff: 'beginner', prompt: 'Which attack tricks a user into executing malicious scripts in their own browser?', choices: ['DDoS', 'XSS', 'ARP spoofing', 'Port scan'], answer: 1, explanation: 'Cross-Site Scripting injects client-side scripts.' },
  ],
  'Programming Fundamentals': [
    { kind: 'quiz', diff: 'beginner', prompt: 'What is a loop invariant?', choices: ['A condition true before/after each iteration', 'A constant variable', 'An infinite loop', 'A compiler flag'], answer: 0, explanation: 'It documents correctness across iterations.' },
  ],
};

const GENERIC: Array<{ kind: TaskKind; diff: 'beginner'|'intermediate'|'advanced'; prompt: string; choices?: string[]; answer?: number; explanation: string; expected?: string }> = [
  { kind: 'concept', diff: 'beginner', prompt: 'Explain {skill} to a beginner in 3-4 sentences, using an everyday analogy.', explanation: 'Strong answers use a clear analogy, correct vocabulary, no jargon loops.', expected: 'A correct, jargon-free explanation with a concrete example.' },
  { kind: 'quiz', diff: 'intermediate', prompt: `Which statement about {skill} is TRUE?`, choices: ['It is only useful in academia', 'It builds on core prerequisite concepts', 'It never appears in interviews', 'It replaces fundamentals'], answer: 1, explanation: 'Skills build hierarchically; {skill} rests on its prerequisites.' },
  { kind: 'scenario', diff: 'intermediate', prompt: 'Your {skill} work keeps producing inconsistent results. Walk through how you would debug it.', explanation: 'Systematic isolation: reproduce, hypothesize, test one variable at a time.', expected: 'A systematic debugging approach mentioning reproduction and isolation.' },
];

function withSkill(s: string, text: string): string {
  return text.split('{skill}').join(s);
}

export function generatePracticeSet(skill: string, kind: TaskKind | 'mixed', count = 5, difficulty?: string): PracticeSet {
  const pool: Array<{ kind: TaskKind; diff: string; prompt: string; choices?: string[]; answer?: number; explanation: string; expected?: string }> = [
    ...(BANK[skill] || []),
    ...GENERIC.map(g => ({ ...g, prompt: withSkill(skill, g.prompt), explanation: g.explanation.replace('{skill}', skill), expected: g.expected?.replace('{skill}', skill) })),
  ];
  const filtered = difficulty ? pool.filter(p => p.diff === difficulty) : pool;
  const usable = (filtered.length >= count ? filtered : pool).slice(0, Math.max(count, 1));
  const questions: PracticeQuestion[] = usable.slice(0, count).map((q, i) => ({
    id: `q${i + 1}`,
    kind: q.kind,
    skill,
    difficulty: q.diff as PracticeQuestion['difficulty'],
    prompt: q.prompt,
    choices: q.choices,
    answerIndex: q.answer,
    explanation: q.explanation,
    expected: q.expected,
    est_minutes: q.kind === 'coding' ? 12 : q.kind === 'scenario' ? 8 : 3,
  }));
  const setKind: TaskKind = kind === 'mixed' ? (questions[0]?.kind || 'quiz') : kind;
  return { id: uid(), skill, kind: setKind, questions };
}

// AI generation when a key is present — validated, falls back to bank on failure.
export async function generatePracticeSetAI(skill: string, kind: TaskKind | 'mixed', count = 5, difficulty?: string): Promise<PracticeSet | null> {
  if (!aiEnabled()) return null;
  const system = 'You generate high-quality practice questions for learners. Return STRICT JSON only, no commentary.';
  const user = `Generate ${count} ${difficulty || 'mixed'} difficulty practice questions about "${skill}". Kind: ${kind}. JSON schema: {"questions":[{"kind":"quiz|coding|debug|scenario|concept","prompt":"...","choices":["a","b","c","d"] (MCQ only),"answerIndex":0 (MCQ only),"explanation":"why","expected":"expected outcome for open-ended","est_minutes":5}]}. factual accuracy required; never invent library APIs.`;
  return generateStructured<PracticeSet>(
    system, user,
    (data: any) => {
      if (!data || !Array.isArray(data.questions) || data.questions.length === 0) throw new Error('bad questions');
      const questions: PracticeQuestion[] = data.questions.slice(0, count).map((q: any, i: number) => ({
        id: `q${i + 1}`,
        kind: (['quiz', 'coding', 'debug', 'scenario', 'concept'].includes(q.kind) ? q.kind : 'quiz') as TaskKind,
        skill,
        difficulty: (['beginner', 'intermediate', 'advanced'].includes(q.difficulty) ? q.difficulty : 'intermediate') as PracticeQuestion['difficulty'],
        prompt: String(q.prompt || '').slice(0, 600),
        choices: Array.isArray(q.choices) ? q.choices.map(String).slice(0, 6) : undefined,
        answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : undefined,
        explanation: String(q.explanation || '').slice(0, 600),
        expected: q.expected ? String(q.expected).slice(0, 400) : undefined,
        est_minutes: Math.min(30, Math.max(2, Number(q.est_minutes) || 5)),
      }));
      return { id: uid(), skill, kind: (kind === 'mixed' ? questions[0].kind : kind) as TaskKind, questions };
    },
    1400
  );
}

export function evaluateMCQ(q: PracticeQuestion, answerIdx: number): boolean {
  return q.answerIndex !== undefined && answerIdx === q.answerIndex;
}

export function scoreOpenAnswer(q: PracticeQuestion, text: string): { score: number; feedback: string } {
  const t = text.trim().toLowerCase();
  if (t.length < 15) return { score: 25, feedback: 'Answer is too brief to demonstrate the concept. Expand with specifics and an example.' };
  const keywords = q.explanation.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 4);
  const hits = keywords.filter(w => t.includes(w)).length;
  const ratio = keywords.length ? hits / keywords.length : 0;
  const score = Math.min(95, Math.round(40 + ratio * 60));
  const feedback = score >= 75
    ? 'Solid answer — key concepts present. Revisit the model explanation for nuances you missed.'
    : 'Partially there. Compare with the expected outcome and the explanation, then retry a similar question.';
  return { score, feedback };
}

export function savePracticeAttempt(userId: string, skill: string, kind: TaskKind, score: number, mistakes: string[]) {
  const db = getDb();
  // store as an assessment attempt for struggle detection to pick up
  const aid = uid();
  db.prepare('INSERT INTO assessments (id, user_id, skill, title, difficulty, questions_json) VALUES (?,?,?,?,?,?)')
    .run(aid, userId, skill, `${kind} practice`, 'medium', '[]');
  db.prepare('INSERT INTO assessment_attempts (id, assessment_id, user_id, answers_json, score, total, mistakes_json) VALUES (?,?,?,?,?,?,?)')
    .run(uid(), aid, userId, '[]', score, 100, JSON.stringify(mistakes));
  logActivity(userId, 'practice_completed', `Scored ${Math.round(score)}% on ${skill} ${kind} practice.`, { skill, kind, score });
  if (score < 50) {
    bumpLevel(userId, skill, -2);
  } else if (score >= 80) {
    bumpLevel(userId, skill, 2);
  }
}

function bumpLevel(userId: string, skill: string, delta: number) {
  const db = getDb();
  const srow = db.prepare('SELECT id FROM skills WHERE name = ?').get(skill) as any;
  if (!srow) return;
  const ex = db.prepare('SELECT level FROM user_skills WHERE user_id = ? AND skill_id = ?').get(userId, srow.id) as any;
  if (ex) {
    db.prepare('UPDATE user_skills SET level = MIN(100, MAX(0, level + ?)) WHERE user_id = ? AND skill_id = ?').run(delta, userId, srow.id);
  } else {
    db.prepare('INSERT INTO user_skills (user_id, skill_id, level, source) VALUES (?,?,?,?)').run(userId, srow.id, Math.max(0, 20 + delta), 'practice');
  }
}
