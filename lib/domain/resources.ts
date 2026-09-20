// Curated resource database — verified, well-known, stable URLs only.
// No fabricated links. When an AI key is configured, recommendations may
// blend live-suggested topics with these curated entries.
export interface ResourceDef {
  title: string;
  type: 'video' | 'documentation' | 'article' | 'course' | 'practice' | 'project';
  provider: string;
  url: string;
  skill: string;
  est_minutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const r = (
  title: string, type: ResourceDef['type'], provider: string, url: string,
  skill: string, est_minutes: number, difficulty: ResourceDef['difficulty']
): ResourceDef => ({ title, type, provider, url, skill, est_minutes, difficulty });

export const RESOURCES: ResourceDef[] = [
  // Core
  r('MDN Web Docs — Learn Web Development', 'documentation', 'MDN', 'https://developer.mozilla.org/en-US/docs/Learn', 'HTML & CSS', 180, 'beginner'),
  r('freeCodeCamp — Responsive Web Design', 'course', 'freeCodeCamp', 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', 'HTML & CSS', 300, 'beginner'),
  r('JavaScript.info — The Modern JavaScript Tutorial', 'documentation', 'javascript.info', 'https://javascript.info', 'JavaScript', 600, 'beginner'),
  r('Eloquent JavaScript', 'article', 'Marijn Haverbeke', 'https://eloquentjavascript.net', 'JavaScript', 480, 'intermediate'),
  r('React Official Docs — Learn React', 'documentation', 'react.dev', 'https://react.dev/learn', 'React', 420, 'beginner'),
  r('Next.js Official Learn Course', 'course', 'Vercel', 'https://nextjs.org/learn', 'Next.js', 480, 'intermediate'),
  r('TypeScript Handbook', 'documentation', 'Microsoft', 'https://www.typescriptlang.org/docs/handbook/intro.html', 'TypeScript', 300, 'intermediate'),
  // Languages & Core CS
  r('Automate the Boring Stuff with Python', 'course', 'Al Sweigart', 'https://automatetheboringstuff.com', 'Python', 600, 'beginner'),
  r('Python Official Tutorial', 'documentation', 'Python.org', 'https://docs.python.org/3/tutorial/', 'Python', 300, 'beginner'),
  r('CS50x — Introduction to Computer Science', 'course', 'Harvard/edX', 'https://cs50.harvard.edu/x/', 'Programming Fundamentals', 1800, 'beginner'),
  r('Neetcode — DSA Roadmap', 'practice', 'Neetcode', 'https://neetcode.io/roadmap', 'Data Structures & Algorithms', 1200, 'intermediate'),
  r('LeetCode — Top Interview 150', 'practice', 'LeetCode', 'https://leetcode.com/studyplan/top-interview-150/', 'Data Structures & Algorithms', 1500, 'intermediate'),
  r('VisuAlgo — Data Structure Visualizations', 'article', 'NUS', 'https://visualgo.net/en', 'Data Structures & Algorithms', 180, 'beginner'),
  r('Learn Git Branching', 'practice', 'Peter Cottle', 'https://learngitbranching.js.org', 'Git & GitHub', 120, 'beginner'),
  r('Pro Git Book', 'documentation', 'Git-scm', 'https://git-scm.com/book/en/v2', 'Git & GitHub', 300, 'intermediate'),
  r('Java™ Tutorials', 'documentation', 'Oracle', 'https://docs.oracle.com/javase/tutorial/', 'Java', 600, 'beginner'),
  r('MOOC.fi Java Programming I', 'course', 'University of Helsinki', 'https://java-programming.mooc.fi', 'Java', 900, 'beginner'),
  // Backend & Data
  r('SQLBolt — Interactive SQL Lessons', 'practice', 'SQLBolt', 'https://sqlbolt.com', 'SQL', 180, 'beginner'),
  r('Mode SQL Tutorial', 'course', 'Mode Analytics', 'https://mode.com/sql-tutorial/', 'SQL', 240, 'intermediate'),
  r('RESTful API Design — guidelines', 'article', 'restfulapi.net', 'https://restfulapi.net', 'REST APIs', 120, 'beginner'),
  r('Node.js Official Guides', 'documentation', 'OpenJS', 'https://nodejs.org/en/learn', 'Node.js', 300, 'intermediate'),
  r('Express — Getting Started', 'documentation', 'OpenJS', 'https://expressjs.com/en/starter/installing.html', 'Express', 90, 'beginner'),
  r('Django Official Tutorial', 'course', 'Django Project', 'https://docs.djangoproject.com/en/stable/intro/tutorial01/', 'Django', 480, 'intermediate'),
  r('Spring Boot Reference — Getting Started', 'documentation', 'VMware', 'https://docs.spring.io/spring-boot/index.html', 'Spring Boot', 240, 'intermediate'),
  r('MongoDB University — Free Courses', 'course', 'MongoDB', 'https://learn.mongodb.com', 'NoSQL (MongoDB)', 300, 'beginner'),
  // Data Science
  r('Kaggle Learn — Python', 'course', 'Kaggle', 'https://www.kaggle.com/learn/python', 'Python', 300, 'beginner'),
  r('Kaggle Learn — Pandas', 'course', 'Kaggle', 'https://www.kaggle.com/learn/pandas', 'Pandas', 240, 'beginner'),
  r('NumPy — The Absolute Basics', 'documentation', 'NumPy', 'https://numpy.org/doc/stable/user/absolute_beginners.html', 'NumPy', 180, 'beginner'),
  r('Kaggle Learn — Data Visualization', 'course', 'Kaggle', 'https://www.kaggle.com/learn/data-visualization', 'Data Visualization', 240, 'beginner'),
  r('StatQuest — Statistics Fundamentals', 'video', 'StatQuest', 'https://www.youtube.com/@statquest/playlists', 'Statistics', 420, 'beginner'),
  r('Seeing Theory — Visual Probability & Stats', 'article', 'Brown University', 'https://seeing-theory.brown.edu', 'Statistics', 180, 'beginner'),
  r('Kaggle Learn — Intro to Machine Learning', 'course', 'Kaggle', 'https://www.kaggle.com/learn/intro-to-machine-learning', 'Machine Learning', 180, 'beginner'),
  r('Google ML Crash Course', 'course', 'Google', 'https://developers.google.com/machine-learning/crash-course', 'Machine Learning', 480, 'intermediate'),
  r('fast.ai — Practical Deep Learning', 'course', 'fast.ai', 'https://course.fast.ai', 'Deep Learning', 900, 'advanced'),
  r('Hugging Face NLP Course', 'course', 'Hugging Face', 'https://huggingface.co/learn/nlp-course', 'NLP', 600, 'intermediate'),
  r('Google Data Analytics Certificate (audit)', 'course', 'Coursera/Google', 'https://www.coursera.org/professional-certificates/google-data-analytics', 'Excel & Sheets', 600, 'beginner'),
  r('Power BI — Official Guided Learning', 'course', 'Microsoft', 'https://learn.microsoft.com/en-us/training/browse/?products=power-bi', 'Power BI / Tableau', 480, 'beginner'),
  r('Kaggle Learn — Intro to SQL', 'course', 'Kaggle', 'https://www.kaggle.com/learn/intro-to-sql', 'SQL', 180, 'beginner'),
  r('Big Data Fundamentals — Spark docs', 'documentation', 'Apache Spark', 'https://spark.apache.org/docs/latest/quick-start.html', 'Big Data Tools', 240, 'intermediate'),
  // Security & Cloud
  r('TryHackMe — Pre Security Path', 'practice', 'TryHackMe', 'https://tryhackme.com/path/outline/presecurity', 'Cybersecurity Fundamentals', 600, 'beginner'),
  r('OWASP Top 10', 'documentation', 'OWASP', 'https://owasp.org/www-project-top-ten/', 'Web Security (OWASP)', 120, 'intermediate'),
  r('OverTheWire — Bandit (Linux/Security wargames)', 'practice', 'OverTheWire', 'https://overthewire.org/wargames/bandit/', 'Linux & Shell', 300, 'beginner'),
  r('Linux Journey', 'course', 'linuxjourney.com', 'https://linuxjourney.com', 'Linux & Shell', 240, 'beginner'),
  r('Crypto 101 (free book)', 'article', 'crypto101.io', 'https://www.crypto101.io', 'Cryptography', 300, 'intermediate'),
  r('Cloudflare — Learning Center: Networking', 'article', 'Cloudflare', 'https://www.cloudflare.com/learning/', 'Networking Fundamentals', 180, 'beginner'),
  r('AWS Skill Builder — Cloud Practitioner', 'course', 'AWS', 'https://explore.skillbuilder.aws/learn', 'Cloud Platforms (AWS/GCP/Azure)', 600, 'beginner'),
  r('Google Cloud Skills Boost', 'course', 'Google Cloud', 'https://www.cloudskillsboost.google', 'Cloud Platforms (AWS/GCP/Azure)', 480, 'beginner'),
  r('Docker — Get Started Workshop', 'documentation', 'Docker', 'https://docs.docker.com/get-started/', 'Docker', 180, 'beginner'),
  r('GitHub Actions — Quickstart', 'documentation', 'GitHub', 'https://docs.github.com/en/actions/quickstart', 'CI/CD', 90, 'beginner'),
  // Misc
  r('The Testing Trophy & testing practice — Kent C. Dodds', 'article', 'kentcdodds.com', 'https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications', 'Testing', 60, 'intermediate'),
  r('System Design Primer', 'documentation', 'donnemartin (GitHub)', 'https://github.com/donnemartin/system-design-primer', 'System Design', 600, 'advanced'),
  r('Agile Alliance — Scrum Guide', 'article', 'Agile Alliance', 'https://www.agilealliance.org/agile101/', 'Agile & Scrum', 90, 'beginner'),
];

export function resourcesForSkill(skill: string, style?: string): ResourceDef[] {
  const list = RESOURCES.filter(x => x.skill === skill);
  if (!style || style === 'mixed') return list;
  const styleMap: Record<string, ResourceDef['type'][]> = {
    video: ['video', 'course'],
    reading: ['documentation', 'article'],
    'hands-on coding': ['practice', 'documentation'],
    projects: ['project', 'practice'],
  };
  const preferredTypes = styleMap[style] || [];
  return [...list].sort((a, b) =>
    (preferredTypes.includes(b.type) ? 1 : 0) - (preferredTypes.includes(a.type) ? 1 : 0));
}
