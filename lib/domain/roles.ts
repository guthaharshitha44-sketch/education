import { SKILL_NAMES, findSkill } from './skills';

// Canonical EduPath role templates. Requirements are directional guidance for
// learning planning — they do not represent any specific employer's hiring bar.
export interface RoleTemplate {
  name: string;
  slug: string;
  description: string;
  required: Array<[string, number]>; // [skill, targetLevel 0-100]
  preferred: Array<[string, number]>;
  foundational: Array<[string, number]>;
  advanced: Array<[string, number]>;
  recommended_projects: string[];
  practice_areas: string[];
  interview_areas: string[];
  typical_roadmap: string[];
}

const T = (name: string, lvl: number): [string, number] => [name, lvl];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'Software Engineer',
    slug: 'software-engineer',
    description: 'Builds reliable software systems across the stack with strong CS fundamentals.',
    required: [T('Programming Fundamentals', 80), T('Data Structures & Algorithms', 75), T('Git & GitHub', 70), T('SQL', 60)],
    preferred: [T('Testing', 60), T('Docker', 50), T('System Design', 55)],
    foundational: [T('Programming Fundamentals', 50), T('Git & GitHub', 40)],
    advanced: [T('System Design', 70), T('Data Structures & Algorithms', 85)],
    recommended_projects: ['Library management CLI + database', 'REST API with auth and tests', 'Multi-user task tracker with deployment'],
    practice_areas: ['DSA problem solving', 'Code review and refactoring', 'Writing unit tests'],
    interview_areas: ['DSA rounds', 'Language deep-dive', 'Project walkthrough', 'Behavioral basics'],
    typical_roadmap: ['Language fluency', 'DSA core', 'Databases', 'Version control mastery', 'Testing', 'System design basics'],
  },
  {
    name: 'Frontend Developer',
    slug: 'frontend-developer',
    description: 'Crafts accessible, performant user interfaces for the web.',
    required: [T('HTML & CSS', 80), T('JavaScript', 75), T('React', 70), T('Git & GitHub', 60)],
    preferred: [T('TypeScript', 65), T('Next.js', 60), T('Testing', 50), T('REST APIs', 55)],
    foundational: [T('HTML & CSS', 55), T('JavaScript', 50)],
    advanced: [T('TypeScript', 70), T('Next.js', 65), T('Testing', 55)],
    recommended_projects: ['Responsive weather dashboard consuming a public API', 'Component library with docs', 'Full landing page + dashboard clone with routing'],
    practice_areas: ['Flexbox/Grid layouts', 'Async JS & fetch', 'Accessibility checks'],
    interview_areas: ['JS fundamentals', 'React concepts (hooks, state)', 'CSS layout tasks', 'UI build-out exercise'],
    typical_roadmap: ['HTML/CSS mastery', 'JavaScript deep dive', 'React fundamentals', 'State & data fetching', 'TypeScript', 'Next.js'],
  },
  {
    name: 'Backend Developer',
    slug: 'backend-developer',
    description: 'Designs and builds server-side logic, APIs and data layers.',
    required: [T('Programming Fundamentals', 75), T('SQL', 75), T('REST APIs', 75), T('Git & GitHub', 65)],
    preferred: [T('Node.js', 65), T('Docker', 55), T('Testing', 60), T('NoSQL (MongoDB)', 50)],
    foundational: [T('Programming Fundamentals', 55), T('SQL', 50)],
    advanced: [T('System Design', 65), T('Docker', 60)],
    recommended_projects: ['Student Management REST API', 'URL shortener with rate limiting', 'Multi-service app with Docker Compose'],
    practice_areas: ['SQL joins & indexing', 'API design', 'Auth flows'],
    interview_areas: ['Database design', 'API scenarios', 'Concurrency basics', 'System design lite'],
    typical_roadmap: ['Language fluency', 'SQL & schema design', 'REST API framework', 'Auth & security basics', 'Docker', 'Caching & system design'],
  },
  {
    name: 'Full Stack Developer',
    slug: 'full-stack-developer',
    description: 'Ships complete web products across frontend, backend and deployment.',
    required: [T('HTML & CSS', 70), T('JavaScript', 70), T('React', 65), T('SQL', 65), T('REST APIs', 65), T('Git & GitHub', 65)],
    preferred: [T('TypeScript', 60), T('Node.js', 60), T('Docker', 45), T('Testing', 50)],
    foundational: [T('HTML & CSS', 50), T('JavaScript', 50)],
    advanced: [T('System Design', 55), T('TypeScript', 60)],
    recommended_projects: ['Blog platform with auth (React + API + DB)', 'E-commerce cart with payments sandbox', 'Realtime chat app'],
    practice_areas: ['CRUD app end-to-end', 'Auth implementation', 'Deployment'],
    interview_areas: ['JS + React', 'API + DB design', 'Feature build-out', 'Debugging scenarios'],
    typical_roadmap: ['Frontend trio', 'JavaScript deep dive', 'React', 'SQL & APIs', 'Auth', 'Deployment'],
  },
  {
    name: 'Data Scientist',
    slug: 'data-scientist',
    description: 'Extracts insight and builds predictive models from data.',
    required: [T('Python', 80), T('Statistics', 70), T('Pandas', 75), T('SQL', 65)],
    preferred: [T('Machine Learning', 70), T('Data Visualization', 65), T('NumPy', 60), T('Big Data Tools', 45)],
    foundational: [T('Python', 55), T('Statistics', 50)],
    advanced: [T('Machine Learning', 75), T('Deep Learning', 60)],
    recommended_projects: ['Titanic survival prediction', 'Sales forecasting notebook', 'End-to-end ML app with Streamlit'],
    practice_areas: ['EDA on messy datasets', 'Feature engineering', 'Model evaluation'],
    interview_areas: ['Statistics questions', 'SQL for analytics', 'ML theory', 'Case study'],
    typical_roadmap: ['Python fluency', 'Statistics core', 'Pandas/NumPy', 'Visualization', 'ML fundamentals', 'Capstone ML project'],
  },
  {
    name: 'Data Analyst',
    slug: 'data-analyst',
    description: 'Turns raw data into dashboards, reports and decisions.',
    required: [T('SQL', 80), T('Excel & Sheets', 75), T('Data Visualization', 70)],
    preferred: [T('Python', 60), T('Pandas', 55), T('Power BI / Tableau', 65), T('Statistics', 55)],
    foundational: [T('Excel & Sheets', 55), T('SQL', 55)],
    advanced: [T('Power BI / Tableau', 70), T('Python', 65)],
    recommended_projects: ['Sales dashboard in Power BI', 'Cohort analysis with SQL + Sheets', 'KPI report automation with Python'],
    practice_areas: ['SQL aggregations', 'Dashboard storytelling', 'Data cleaning'],
    interview_areas: ['SQL tests', 'Case metrics definition', 'Chart critique'],
    typical_roadmap: ['Excel to SQL', 'SQL analytics', 'Visualization tool', 'Statistics basics', 'Portfolio dashboards'],
  },
  {
    name: 'AI/ML Engineer',
    slug: 'ai-ml-engineer',
    description: 'Builds, trains and deploys machine learning systems in production.',
    required: [T('Python', 85), T('Machine Learning', 75), T('Deep Learning', 60), T('SQL', 55)],
    preferred: [T('Statistics', 65), T('Docker', 55), T('NLP', 55), T('REST APIs', 55)],
    foundational: [T('Python', 60), T('Statistics', 50)],
    advanced: [T('Deep Learning', 70), T('NLP', 60)],
    recommended_projects: ['Image classifier deployed as API', 'RAG chatbot over your notes', 'Recommendation engine demo'],
    practice_areas: ['Model training loops', 'Evaluation metrics', 'Serving & latency'],
    interview_areas: ['ML theory', 'Coding (Python)', 'System design for ML', 'Project deep-dive'],
    typical_roadmap: ['Python fluency', 'Math & statistics', 'ML fundamentals', 'Deep learning', 'MLOps & serving'],
  },
  {
    name: 'Cybersecurity Analyst',
    slug: 'cybersecurity-analyst',
    description: 'Defends systems by monitoring, analyzing and responding to threats.',
    required: [T('Networking Fundamentals', 75), T('Linux & Shell', 65), T('Cybersecurity Fundamentals', 75), T('Web Security (OWASP)', 60)],
    preferred: [T('Python', 55), T('Cryptography', 50), T('Cloud Platforms (AWS/GCP/Azure)', 45)],
    foundational: [T('Networking Fundamentals', 55), T('Linux & Shell', 45)],
    advanced: [T('Web Security (OWASP)', 70), T('Cryptography', 55)],
    recommended_projects: ['Home security lab with VMs', 'Vulnerable web app audit', 'Log analysis + incident report'],
    practice_areas: ['Packet analysis', 'CTF-style challenges', 'Hardening checklists'],
    interview_areas: ['Networking questions', 'Common attacks & defenses', 'Scenario response'],
    typical_roadmap: ['Networking', 'Linux', 'Security fundamentals', 'OWASP & tooling', 'Cloud security basics'],
  },
  {
    name: 'Cloud Engineer',
    slug: 'cloud-engineer',
    description: 'Architects, automates and operates infrastructure on cloud platforms.',
    required: [T('Linux & Shell', 70), T('Cloud Platforms (AWS/GCP/Azure)', 75), T('Docker', 65), T('Networking Fundamentals', 60)],
    preferred: [T('CI/CD', 65), T('REST APIs', 50), T('Python', 55), T('Git & GitHub', 60)],
    foundational: [T('Linux & Shell', 55), T('Networking Fundamentals', 50)],
    advanced: [T('CI/CD', 65), T('Cloud Platforms (AWS/GCP/Azure)', 80)],
    recommended_projects: ['3-tier app on a free-tier cloud', 'IaC-provisioned VPC + services', 'CI/CD pipeline with container deploy'],
    practice_areas: ['CLI practice', 'Networking config', 'Cost-aware architecture'],
    interview_areas: ['Cloud services scenarios', 'Linux troubleshooting', 'Architecture design'],
    typical_roadmap: ['Linux & networking', 'One cloud deeply', 'Docker', 'CI/CD', 'IaC & monitoring'],
  },
];

export function getRoleTemplate(name: string): RoleTemplate | undefined {
  const lower = name.trim().toLowerCase();
  return ROLE_TEMPLATES.find(r => r.name.toLowerCase() === lower || r.slug === lower);
}

export function allRoleNames(): string[] {
  return ROLE_TEMPLATES.map(r => r.name);
}

// Generate a skill framework for a custom role using keyword heuristics + AI.
export function heuristicCustomRole(name: string): RoleTemplate {
  const n = name.toLowerCase();
  const pick = (keys: string[], pool: Array<[string, number]>): Array<[string, number]> =>
    pool.filter(([s]) => keys.some(k => s.toLowerCase().includes(k)));
  const generic: Array<[string, number]> = [
    T('Programming Fundamentals', 75), T('Git & GitHub', 65), T('SQL', 60),
    T('Python', 70), T('JavaScript', 60), T('REST APIs', 60), T('Testing', 50),
  ];
  const matched = pick(
    ['data', 'mobile', 'devops', 'security', 'game', 'qa', 'product', 'ai', 'ml', 'cloud', 'blockchain', 'iot', 'embedded'],
    [...ROLE_TEMPLATES.flatMap(r => r.required), ...ROLE_TEMPLATES.flatMap(r => r.preferred)]
  );
  const required = (matched.length >= 3 ? matched : generic).slice(0, 6);
  return {
    name,
    slug: n.replace(/[^a-z0-9]+/g, '-'),
    description: `Learner-defined target role. Requirements below are an AI-generated learning framework for planning purposes only — not any specific employer's criteria.`,
    required,
    preferred: [T('Testing', 50), T('Docker', 45), T('Communication', 55)],
    foundational: [T('Programming Fundamentals', 55), T('Git & GitHub', 45)],
    advanced: [T('System Design', 55)],
    recommended_projects: [`Portfolio project demonstrating ${name} fundamentals`, `End-to-end ${name} mini-project`, `Collaborative ${name} group build`],
    practice_areas: [`${name} core concepts`, `Tooling for ${name}`, `Interview-style practice`],
    interview_areas: [`${name} fundamentals`, `Problem solving`, `Project discussion`],
    typical_roadmap: [`Foundations for ${name}`, `Core ${name} skills`, `Build projects`, `Interview prep`],
  };
}

// All unique [skill, level] pairs for a role, importance tagged.
export function roleRequirements(role: RoleTemplate): Array<{ skill: string; target: number; importance: string }> {
  const out: Array<{ skill: string; target: number; importance: string }> = [];
  for (const [skill, target] of role.foundational) out.push({ skill, target, importance: 'foundational' });
  for (const [skill, target] of role.required) out.push({ skill, target, importance: 'required' });
  for (const [skill, target] of role.preferred) out.push({ skill, target, importance: 'preferred' });
  for (const [skill, target] of role.advanced) out.push({ skill, target, importance: 'advanced' });
  // dedupe, keep max target and highest importance tier
  const tier: Record<string, number> = { foundational: 0, preferred: 1, required: 2, advanced: 3 };
  const map = new Map<string, { target: number; importance: string }>();
  for (const r of out) {
    const prev = map.get(r.skill);
    if (!prev || tier[r.importance] > tier[prev.importance] || (tier[r.importance] === tier[prev.importance] && r.target > prev.target)) {
      map.set(r.skill, { target: Math.max(r.target, prev?.target ?? 0), importance: r.importance });
    }
  }
  return Array.from(map.entries()).map(([skill, v]) => ({ skill, target: v.target, importance: v.importance }));
}
