# EduPath — Personalized Learning & Skill Gap Agent

> **Know where you are. Know where to go. Let AI build the path.**
> AI Agent Hackathon 2026 project.

EduPath is an adaptive AI career-learning agent. It analyzes a learner's current
skills (self-reported + resume-extracted), compares them against a structured
knowledge base of 9 target-role templates, identifies prioritized skill gaps,
builds a personalized roadmap, generates practice, tracks progress, detects
struggles — and **re-plans itself** as the learner performs, with every change
explained and versioned.

The loop: `Current State → Gap Analysis → Roadmap → Practice → Assessment →
Progress → Adapted Plan → repeat`.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

Requires Node 18+. On this machine a local Node 22 runtime lives in
`.tools/node2/` (see "Windows notes" below).

**Try the demo:** click **Explore Demo** on the landing page — a realistic
learner profile (2nd-year CS student targeting Software Engineer, 9-day history,
struggle pattern, adapted roadmap, chat history) is seeded instantly.

## Optional live AI

EduPath works fully offline on a deterministic built-in engine. To enable live
LLM generation (coach replies, practice sets, resume summary enhancement,
custom-role frameworks):

```bash
cp .env.example .env   # then set OPENAI_API_KEY
```

All AI outputs are schema-validated before use; malformed responses fall back
gracefully to the local engine.

## What's inside

| Area | Details |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, custom charts (radar/trend/bars), dependency graph, modals, toasts, skeletons, empty/error states |
| Backend | 16 API routes (Pages API), session auth (scrypt-hashed passwords, HttpOnly cookies), rate limiting, input validation |
| Database | SQLite via better-sqlite3, WAL mode, 24 entities: users, profiles, skills, user_skills, resumes, projects, certificates, roadmaps, roadmap_versions, learning_tasks, assessments, assessment_attempts, progress_snapshots, struggle_areas, skill_dependencies, chat_messages, activity_logs, what_if_scenarios, weekly_reports, resources… |
| AI services | ResumeAnalyzer, SkillGapAnalyzer, RoadmapPlanner, AdaptivePlanner, PracticeGenerator, Evaluator, StruggleDetector, ProgressReporter, LearningCoach, SkillTwinEngine, ScenarioSimulator (separate modules under `lib/services/`) |

### Feature map

- **Resume Intelligence** — uploads PDF/DOCX/TXT, extracts text (incl. FlateDecode
  PDF streams + DOCX XML), parses sections, detects skills with word-boundary
  alias matching and evidence strings; low-confidence items are labeled
  *Needs confirmation*. Nothing is invented.
- **Skill-Gap Engine** — per-skill state (Strong / Developing / Needs Work /
  Missing), weighted Learning Readiness %, biggest gaps, critical missing
  skills, unlock-multipliers. Readiness measures learning progress, not
  hiring odds.
- **Skill dependency graph** — interactive layered graph; click a node for why
  it matters, prerequisites, level vs target, resources.
- **Roadmap** — Today / This Week / Next 30 Days / Long-Term Path, every task
  with time, difficulty and a "Why". Versioned (v1, v2, …) with change reasons.
- **Adaptive agent** — completing/skipping tasks and practice/assessment scores
  trigger re-planning: reinforcement for weak areas, acceleration for strong
  ones, rescheduling of dependent topics. Every adaptation is explained and
  logged to the activity timeline.
- **Practice generator** — MCQs, concept questions, debugging tasks, scenarios,
  mini-projects; answers are scored, mistakes stored and fed back into planning.
- **Skill Twin + What-If Simulator** — living model of skills/velocity/focus;
  simulate "2 weeks of DSA only", "drop to 30 min/day" or "switch to Data
  Analyst", compare current vs simulated path, then **Apply This Scenario** to
  replace the active roadmap.
- **Coach** — context-aware chat that reads the learner's real profile, gaps,
  scores, struggle areas and roadmap.
- **Reports** — weekly progress reports (skills acquired/in progress, gaps,
  struggle areas, hours, next steps) with print/share support.

## Project layout

```
app/            # Next.js App Router pages (landing, auth, onboarding, dashboard/*)
pages/api/      # API routes (auth, onboarding, resume, gap, roadmap, tasks,
                #  practice, progress, coach, twin, whatif, reports, roles, …)
lib/            # db, auth, api helpers; domain/ (skills, roles, resources);
                # services/ (the AI agent services)
components/     # UI kit + AuthShell
data/           # SQLite database (edupath.db) — gitignored
```

## Windows notes (this machine)

No global Node.js was available, so a portable Node 22 runtime is vendored in
`.tools/node2/`. To run commands with it:

```bash
export PATH="$PWD/.tools/node2:$PATH"
```

## Security

Passwords are scrypt-hashed with per-user salts; sessions are random 32-byte
tokens stored server-side and sent as HttpOnly SameSite cookies; every API
route is scoped to the signed-in user (no cross-user data access); uploads are
type- and size-limited (4 MB); AI keys stay server-side via environment
variables; generation endpoints are rate-limited.

## Demo script (3–5 min)

1. Landing → **Explore Demo**.
2. Dashboard: readiness, today's mission, streak, biggest gap, AI recommendation.
3. Skill Map: dependency graph + gap states.
4. Roadmap: v2 adapted plan, open History to show versioned changes.
5. Learn: complete a task → watch the plan adapt (activity timeline explains why).
6. Practice: generate a set, submit, see score + plan impact.
7. Skill Twin → What-If: "2 weeks of DSA only" → compare paths → Apply.
8. Coach: "What should I study today?" / "Why did my roadmap change?"
9. Reports: weekly report with struggle areas.
