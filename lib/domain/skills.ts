// Master skill catalog — canonical names used everywhere (profile, resume, roles, roadmap).
export interface SkillDef { name: string; category: string }

export const SKILLS: SkillDef[] = [
  { name: 'Programming Fundamentals', category: 'Core' },
  { name: 'Data Structures & Algorithms', category: 'Core' },
  { name: 'Git & GitHub', category: 'Core' },
  { name: 'HTML & CSS', category: 'Frontend' },
  { name: 'JavaScript', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'Next.js', category: 'Frontend' },
  { name: 'Python', category: 'Languages' },
  { name: 'Java', category: 'Languages' },
  { name: 'SQL', category: 'Data' },
  { name: 'NoSQL (MongoDB)', category: 'Data' },
  { name: 'REST APIs', category: 'Backend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'Express', category: 'Backend' },
  { name: 'Django', category: 'Backend' },
  { name: 'Spring Boot', category: 'Backend' },
  { name: 'Linux & Shell', category: 'Systems' },
  { name: 'Networking Fundamentals', category: 'Systems' },
  { name: 'Docker', category: 'Cloud & DevOps' },
  { name: 'CI/CD', category: 'Cloud & DevOps' },
  { name: 'Cloud Platforms (AWS/GCP/Azure)', category: 'Cloud & DevOps' },
  { name: 'Cybersecurity Fundamentals', category: 'Security' },
  { name: 'Web Security (OWASP)', category: 'Security' },
  { name: 'Cryptography', category: 'Security' },
  { name: 'Pandas', category: 'Data Science' },
  { name: 'NumPy', category: 'Data Science' },
  { name: 'Data Visualization', category: 'Data Science' },
  { name: 'Statistics', category: 'Data Science' },
  { name: 'Machine Learning', category: 'Data Science' },
  { name: 'Deep Learning', category: 'Data Science' },
  { name: 'NLP', category: 'Data Science' },
  { name: 'Big Data Tools', category: 'Data Science' },
  { name: 'Excel & Sheets', category: 'Data' },
  { name: 'Power BI / Tableau', category: 'Data' },
  { name: 'System Design', category: 'Advanced' },
  { name: 'Testing', category: 'Quality' },
  { name: 'Agile & Scrum', category: 'Professional' },
  { name: 'Communication', category: 'Professional' },
];

export const SKILL_NAMES = SKILLS.map(s => s.name);

export function findSkill(name: string): SkillDef | undefined {
  const lower = name.trim().toLowerCase();
  return SKILLS.find(s => s.name.toLowerCase() === lower);
}

// Dependency graph: learning paths where mastering one skill unlocks the next.
export const DEPENDENCIES: Array<{ from: string; to: string; weight?: number }> = [
  { from: 'Programming Fundamentals', to: 'Data Structures & Algorithms' },
  { from: 'Programming Fundamentals', to: 'Git & GitHub' },
  { from: 'Programming Fundamentals', to: 'JavaScript' },
  { from: 'Programming Fundamentals', to: 'Python' },
  { from: 'Programming Fundamentals', to: 'Java' },
  { from: 'HTML & CSS', to: 'JavaScript', weight: 0.6 },
  { from: 'JavaScript', to: 'TypeScript', weight: 0.7 },
  { from: 'JavaScript', to: 'React', weight: 0.9 },
  { from: 'TypeScript', to: 'Next.js', weight: 0.7 },
  { from: 'React', to: 'Next.js', weight: 0.9 },
  { from: 'Programming Fundamentals', to: 'REST APIs' },
  { from: 'REST APIs', to: 'Node.js', weight: 0.8 },
  { from: 'REST APIs', to: 'Django', weight: 0.8 },
  { from: 'Java', to: 'Spring Boot' },
  { from: 'Python', to: 'Django' },
  { from: 'Python', to: 'Pandas', weight: 0.9 },
  { from: 'Python', to: 'Machine Learning' },
  { from: 'Pandas', to: 'Machine Learning', weight: 0.7 },
  { from: 'NumPy', to: 'Machine Learning', weight: 0.7 },
  { from: 'Pandas', to: 'Data Visualization', weight: 0.8 },
  { from: 'Statistics', to: 'Machine Learning', weight: 0.8 },
  { from: 'Machine Learning', to: 'Deep Learning' },
  { from: 'Machine Learning', to: 'NLP', weight: 0.8 },
  { from: 'REST APIs', to: 'Web Security (OWASP)', weight: 0.6 },
  { from: 'Networking Fundamentals', to: 'Cybersecurity Fundamentals' },
  { from: 'Cybersecurity Fundamentals', to: 'Web Security (OWASP)' },
  { from: 'Cybersecurity Fundamentals', to: 'Cryptography' },
  { from: 'Linux & Shell', to: 'Docker', weight: 0.7 },
  { from: 'Linux & Shell', to: 'Cloud Platforms (AWS/GCP/Azure)', weight: 0.7 },
  { from: 'Docker', to: 'CI/CD', weight: 0.8 },
  { from: 'Docker', to: 'Cloud Platforms (AWS/GCP/Azure)', weight: 0.8 },
  { from: 'SQL', to: 'REST APIs', weight: 0.6 },
  { from: 'SQL', to: 'Big Data Tools', weight: 0.7 },
  { from: 'Excel & Sheets', to: 'Power BI / Tableau', weight: 0.7 },
  { from: 'REST APIs', to: 'System Design', weight: 0.6 },
  { from: 'Data Structures & Algorithms', to: 'System Design', weight: 0.6 },
  { from: 'Testing', to: 'CI/CD', weight: 0.5 },
];

export const LEVEL_LABELS = ['Missing', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

export function gapState(level: number, target: number): 'strong' | 'developing' | 'needs-work' | 'missing' {
  if (level <= 5) return 'missing';
  const ratio = level / target;
  if (ratio >= 0.9) return 'strong';
  if (ratio >= 0.6) return 'developing';
  if (ratio >= 0.35) return 'needs-work';
  return 'missing';
}
