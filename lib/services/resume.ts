import { SKILL_NAMES, findSkill } from '@/lib/domain/skills';
import { aiEnabled, generateStructured } from './llm';

// Skill aliases to canonical catalog names. Detection is evidence-based: a skill
// is only reported when its alias appears in the resume text.
const ALIASES: Record<string, string[]> = {
  'Programming Fundamentals': ['programming', 'problem solving', 'c programming', 'c++', 'oop', 'data structures', 'algorithms', 'dsa', 'coding'],
  'Data Structures & Algorithms': ['data structures', 'algorithms', 'dsa', 'leetcode', 'problem solving'],
  'Git & GitHub': ['git', 'github', 'version control', 'gitlab', 'bitbucket'],
  'HTML & CSS': ['html', 'css', 'html5', 'css3', 'tailwind', 'bootstrap', 'responsive design', 'sass', 'scss'],
  JavaScript: ['javascript', 'js', 'es6', 'jquery', 'typescript'], // typescript implies js comfort
  TypeScript: ['typescript', 'ts'],
  React: ['react', 'reactjs', 'react.js', 'redux', 'next.js', 'nextjs'],
  'Next.js': ['next.js', 'nextjs'],
  Python: ['python', 'pandas', 'numpy', 'django', 'flask', 'pytorch', 'tensorflow'],
  Java: ['java', 'spring', 'jsp', 'servlet'],
  SQL: ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'database', 'dbms', 'oracle db'],
  'NoSQL (MongoDB)': ['mongodb', 'mongo', 'nosql', 'mongoose'],
  'REST APIs': ['rest', 'api', 'restful', 'endpoint', 'postman'],
  'Node.js': ['node', 'nodejs', 'node.js', 'express', 'npm'],
  Express: ['express', 'expressjs'],
  Django: ['django', 'flask'],
  'Spring Boot': ['spring', 'springboot', 'spring boot'],
  'Linux & Shell': ['linux', 'ubuntu', 'bash', 'shell', 'command line', 'kali'],
  'Networking Fundamentals': ['networking', 'tcp/ip', 'dns', 'http', 'osi', 'subnet'],
  Docker: ['docker', 'container', 'kubernetes', 'k8s', 'containerization'],
  'CI/CD': ['ci/cd', 'jenkins', 'github actions', 'continuous integration', 'devops pipeline'],
  'Cloud Platforms (AWS/GCP/Azure)': ['aws', 'azure', 'gcp', 'google cloud', 'cloud', 'ec2', 's3', 'lambda'],
  'Cybersecurity Fundamentals': ['cybersecurity', 'cyber security', 'information security', 'infosec', 'nmap', 'wireshark', 'burp'],
  'Web Security (OWASP)': ['owasp', 'web security', 'xss', 'sql injection', 'penetration testing', 'vapt'],
  Cryptography: ['cryptography', 'encryption', 'aes', 'rsa', 'hashing'],
  Pandas: ['pandas', 'dataframe'],
  NumPy: ['numpy'],
  'Data Visualization': ['data visualization', 'matplotlib', 'seaborn', 'charts', 'plotly', 'dashboard'],
  Statistics: ['statistics', 'statistical', 'probability', 'hypothesis', 'regression', 'anova'],
  'Machine Learning': ['machine learning', 'scikit', 'sklearn', 'ml model', 'random forest', 'xgboost'],
  'Deep Learning': ['deep learning', 'neural network', 'cnn', 'rnn', 'lstm', 'transformer', 'pytorch', 'tensorflow', 'keras'],
  NLP: ['nlp', 'natural language', 'text classification', 'spacy', 'nltk', 'llm', 'langchain'],
  'Big Data Tools': ['hadoop', 'spark', 'big data', 'kafka', 'airflow'],
  'Excel & Sheets': ['excel', 'spreadsheet', 'google sheets', 'vlookup', 'pivot table', 'advanced excel'],
  'Power BI / Tableau': ['power bi', 'tableau', 'powerbi', 'bi tool'],
  'System Design': ['system design', 'scalability', 'microservices', 'architecture', 'distributed'],
  Testing: ['testing', 'jest', 'pytest', 'unit test', 'selenium', 'cypress', 'junit'],
  'Agile & Scrum': ['agile', 'scrum', 'kanban', 'jira'],
  Communication: ['communication', 'presentation', 'teamwork', 'collaboration'],
};

const SECTION_PATTERNS: Array<{ key: string; label: string; re: RegExp }> = [
  { key: 'skills', label: 'Skills', re: /(?:technical\s+)?skills?/i },
  { key: 'experience', label: 'Experience', re: /(?:work\s+)?experience|employment|internship/i },
  { key: 'projects', label: 'Projects', re: /projects?/i },
  { name: 'education', key: 'education', label: 'Education', re: /education|academics/i } as any,
  { key: 'certifications', label: 'Certifications', re: /certifications?|licenses/i },
  { key: 'achievements', label: 'Achievements', re: /achievements?|awards?|honors?/i },
];

function splitSections(text: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const sections: Record<string, string> = {};
  let current = 'header';
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const match = SECTION_PATTERNS.find(p => p.re.test(t) && t.length < 72);
    if (match) {
      current = match.key;
      // "Projects: Student Record Analyzer" style lines carry content after the label
      const rest = t.replace(/^[^:]{0,48}:\s*/, '');
      if (rest.length > 3 && rest !== t) sections[current] = (sections[current] ? sections[current] + '\n' : '') + rest;
      continue;
    }
    sections[current] = (sections[current] ? sections[current] + '\n' : '') + t;
  }
  return sections;
}

// Word-boundary alias matching so short tokens ("ts", "js", "git") never fire
// inside unrelated words ("Projec*ts*", "resu*me*", "dig*it*").
function hasAlias(lowerText: string, alias: string): boolean {
  if (!/^[a-z0-9+#/.& -]+$/.test(alias)) return lowerText.includes(alias);
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(lowerText);
}

export interface DetectedSkill { skill: string; level: number; confidence: number; evidence: string[] }
export interface ResumeAnalysis {
  detectedSkills: DetectedSkill[];
  projects: string[];
  certificates: string[];
  experience: string[];
  education: string[];
  achievements: string[];
  summary: string;
  needsConfirmation: string[];
}

function detectSkills(text: string, sections: Record<string, string>): DetectedSkill[] {
  const lowerAll = text.toLowerCase();
  const skillZone = `${sections['skills'] || ''}\n${sections['projects'] || ''}`.toLowerCase();
  const results: DetectedSkill[] = [];
  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const evidence: string[] = [];
    let strength = 0;
    for (const a of aliases) {
      if (hasAlias(lowerAll, a)) {
        evidence.push(a);
        // A skill listed in the skills/projects zone counts stronger
        strength += hasAlias(skillZone, a) ? 2 : 1;
        if (strength >= 6) break;
      }
    }
    if (evidence.length === 0) continue;
    let level = 20 + Math.min(strength, 8) * 6; // 26..68
    // tenure hints: "2 years of Python" style phrases raise the estimate
    const m = text.match(/\b(\d+)\+?\s*years?\b[^\n]{0,24}?\b(javascript|python|java|react|sql)\b/i);
    if (m && evidence.some(e => m[2].toLowerCase().includes(e) || e.includes(m[2].toLowerCase()))) {
      level = Math.min(85, level + Number(m[1]) * 8 + 10);
    }
    // multiple project mentions raise confidence
    const conf = Math.min(0.95, 0.45 + evidence.length * 0.14);
    results.push({ skill: canonical, level, confidence: Math.round(conf * 100) / 100, evidence });
  }
  return results.sort((a, b) => b.level - a.level);
}

function extractListItems(section: string | undefined, max = 8): string[] {
  if (!section) return [];
  return section.split(/\r?\n/)
    .map(l => l.replace(/^[-•*\u2022\d.)\s]+/, '').trim())
    .filter(l => l.length > 8 && l.length < 140)
    .slice(0, max);
}

function detectCertificates(text: string, sections: Record<string, string>): string[] {
  const zone = sections['certifications'] || '';
  if (zone) return extractListItems(zone, 8);
  const re = /((?:certified|certificate(?:\s+of)?|credential)\s+[^\n.,;]{6,90})/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < 6) out.push(m[1].trim());
  return out;
}

export function analyzeResumeText(text: string): ResumeAnalysis {
  const sections = splitSections(text);
  const detectedSkills = detectSkills(text, sections);
  const needsConfirmation = detectedSkills.filter(s => s.confidence < 0.6).map(s => s.skill);
  return {
    detectedSkills,
    projects: extractListItems(sections['projects'], 8),
    certificates: detectCertificates(text, sections),
    experience: extractListItems(sections['experience'], 8),
    education: extractListItems(sections['education'], 5),
    achievements: extractListItems(sections['achievements'], 6),
    summary: '', // filled by ResumeAnalyzer with optional AI summary
    needsConfirmation,
  };
}

// Optional AI enhancement: skills/summary suggestions, merged conservatively.
export async function aiResumeEnhance(text: string): Promise<{ summary?: string; extraSkills?: string[] } | null> {
  if (!aiEnabled()) return null;
  const system = 'You are a precise resume parser. Only report what is literally present. Return JSON only.';
  const user = `From this resume text, return JSON: {"summary": one-sentence profile summary, "extraSkills": up to 8 canonical skill names from this list ONLY: [${SKILL_NAMES.join(', ')}] that appear in the text. If unsure, return empty arrays.\n\nRESUME:\n${text.slice(0, 6000)}`;
  return generateStructured<{ summary?: string; extraSkills?: string[] }>(
    system, user,
    (data: any) => {
      if (!data || typeof data !== 'object') throw new Error('bad shape');
      return {
        summary: typeof data.summary === 'string' ? data.summary.slice(0, 240) : '',
        extraSkills: Array.isArray(data.extraSkills)
          ? data.extraSkills.filter((s: unknown) => typeof s === 'string' && findSkill(s as string)).slice(0, 8)
          : [],
      };
    },
    700
  );
}
