import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

type SqliteDatabase = any;

let DatabaseConstructor: any = null;
try {
  DatabaseConstructor = require('better-sqlite3');
} catch (err) {
  console.warn('[db] Note: better-sqlite3 dynamic load deferred');
}

let dbInstance: SqliteDatabase | null = null;
let migrated = false;

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    const customDir = path.dirname(process.env.DATABASE_PATH);
    if (!fs.existsSync(customDir)) {
      try {
        fs.mkdirSync(customDir, { recursive: true });
      } catch (err) {
        console.warn('[db] Failed to create custom DATABASE_PATH dir, falling back to tmp:', err);
        return path.join(os.tmpdir(), 'edupath.db');
      }
    }
    return process.env.DATABASE_PATH;
  }

  // Detect serverless environment (Vercel, AWS Lambda, or read-only cwd)
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    return path.join(os.tmpdir(), 'edupath.db');
  }

  // Local environment: attempt data/ directory first
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return path.join(localDir, 'edupath.db');
  } catch {
    // If local directory is not writable (e.g. read-only container), fall back to OS temp dir
    return path.join(os.tmpdir(), 'edupath.db');
  }
}

export function migrate(targetDb?: SqliteDatabase) {
  const instance = targetDb || dbInstance;
  if (!instance) return;
  instance.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'student',
    is_demo INTEGER NOT NULL DEFAULT 0,
    onboarded INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    education TEXT NOT NULL DEFAULT '',
    current_status TEXT NOT NULL DEFAULT '',
    target_role TEXT NOT NULL DEFAULT '',
    target_role_id TEXT,
    career_goal TEXT NOT NULL DEFAULT '',
    weekly_hours INTEGER NOT NULL DEFAULT 7,
    daily_minutes INTEGER NOT NULL DEFAULT 60,
    learning_style TEXT NOT NULL DEFAULT 'mixed',
    resume_text TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'General'
  );

  CREATE TABLE IF NOT EXISTS user_skills (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'self_reported',
    confidence REAL NOT NULL DEFAULT 1.0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, skill_id)
  );

  CREATE TABLE IF NOT EXISTS target_roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_custom INTEGER NOT NULL DEFAULT 0,
    owner_user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS role_skills (
    role_id TEXT NOT NULL REFERENCES target_roles(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    importance TEXT NOT NULL DEFAULT 'preferred',
    target_level INTEGER NOT NULL DEFAULT 70,
    PRIMARY KEY (role_id, skill_id)
  );

  CREATE TABLE IF NOT EXISTS role_meta (
    role_id TEXT PRIMARY KEY REFERENCES target_roles(id) ON DELETE CASCADE,
    recommended_projects TEXT NOT NULL DEFAULT '[]',
    practice_areas TEXT NOT NULL DEFAULT '[]',
    interview_areas TEXT NOT NULL DEFAULT '[]',
    typical_roadmap TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS skill_dependencies (
    id TEXT PRIMARY KEY,
    from_skill TEXT NOT NULL,
    to_skill TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    UNIQUE(from_skill, to_skill)
  );

  CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    skill TEXT NOT NULL,
    est_minutes INTEGER NOT NULL DEFAULT 60,
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    is_curated INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL DEFAULT '',
    mime TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    parsed_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    skills TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'user_added',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    issuer TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS roadmaps (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    plan_json TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS learning_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roadmap_id TEXT REFERENCES roadmaps(id) ON DELETE SET NULL,
    skill TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'learn',
    description TEXT NOT NULL DEFAULT '',
    day_offset INTEGER NOT NULL DEFAULT 0,
    est_minutes INTEGER NOT NULL DEFAULT 30,
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    why TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',
    score REAL,
    completed_at TEXT,
    skipped_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    questions_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assessment_attempts (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers_json TEXT NOT NULL,
    score REAL NOT NULL,
    total REAL NOT NULL,
    mistakes_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS struggle_areas (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    evidence_json TEXT NOT NULL DEFAULT '[]',
    severity INTEGER NOT NULL DEFAULT 1,
    detected_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, skill)
  );

  CREATE TABLE IF NOT EXISTS progress_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    readiness REAL NOT NULL DEFAULT 0,
    UNIQUE(user_id, day)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS what_if_scenarios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    result_json TEXT NOT NULL,
    applied INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekly_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start TEXT NOT NULL,
    report_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
}

export function getDb(): SqliteDatabase {
  if (!dbInstance) {
    const dbPath = resolveDbPath();
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
      } catch (err) {
        console.warn('[db] Error creating db directory:', err);
      }
    }

    // If using /tmp and a local seeded database exists in project, copy it over
    const localDbPath = path.join(process.cwd(), 'data', 'edupath.db');
    if (dbPath !== localDbPath && !fs.existsSync(dbPath) && fs.existsSync(localDbPath)) {
      try {
        fs.copyFileSync(localDbPath, dbPath);
      } catch {
        // Continue to fresh initialization if copy fails
      }
    }

    if (!DatabaseConstructor) {
      try {
        DatabaseConstructor = require('better-sqlite3');
      } catch (err) {
        console.error('[db] Error loading better-sqlite3:', err);
        throw new Error('Database driver unavailable. Please verify serverless deployment configuration.');
      }
    }
    dbInstance = new DatabaseConstructor(dbPath);
    try {
      dbInstance.pragma('journal_mode = WAL');
    } catch {
      try {
        dbInstance.pragma('journal_mode = DELETE');
      } catch {
        // Fallback for restricted storage
      }
    }
    dbInstance.pragma('foreign_keys = ON');
  }

  if (!migrated) {
    migrate(dbInstance);
    migrated = true;
  }
  return dbInstance;
}

export function uid(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
