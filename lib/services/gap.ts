import { DEPENDENCIES, SKILLS as SKILLS_SEED, findSkill, gapState } from '@/lib/domain/skills';
import { getRoleTemplate, roleRequirements, heuristicCustomRole } from '@/lib/domain/roles';
import { getDb } from '@/lib/db';

export interface GapItem {
  skill: string;
  category: string;
  current: number;
  target: number;
  state: 'strong' | 'developing' | 'needs-work' | 'missing';
  importance: string;
  unlocks: string[]; // downstream skills that depend on this one
}

export interface GapAnalysis {
  role: string;
  readiness: number;
  items: GapItem[];
  strongest: GapItem[];
  biggestGaps: GapItem[];
  criticalMissing: GapItem[];
  unlockers: GapItem[];
  summary: string;
}

export function userSkillsMap(userId: string): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.name, us.level FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE user_id = ?`).all(userId) as Array<{ name: string; level: number }>;
  const map: Record<string, number> = {};
  for (const row of rows) map[row.name] = row.level;
  return map;
}

export function computeGapAnalysis(userId: string, targetRole: string): GapAnalysis {
  const db = getDb();
  const current = userSkillsMap(userId);
  const template = getRoleTemplate(targetRole) || heuristicCustomRole(targetRole);

  // ensure skills table has all catalog entries for FK-safe inserts
  for (const def of SKILLS_SEED) {
    db.prepare('INSERT OR IGNORE INTO skills (id, name, category) VALUES (?,?,?)')
      .run(def.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), def.name, def.category);
  }

  const reqs = roleRequirements(template);
  const items: GapItem[] = reqs.map(({ skill, target, importance }) => {
    const cur = current[skill] ?? 0;
    return {
      skill,
      category: findSkill(skill)?.category || 'General',
      current: cur,
      target,
      state: gapState(cur, target),
      importance,
      unlocks: DEPENDENCIES.filter(d => d.from === skill).map(d => d.to),
    };
  });

  const weight: Record<string, number> = { foundational: 1.0, required: 1.0, preferred: 0.5, advanced: 0.4 };
  let earned = 0, possible = 0;
  for (const it of items) {
    const w = weight[it.importance] ?? 0.5;
    possible += w * it.target;
    earned += w * Math.min(it.current, it.target);
  }
  const readiness = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  const strongest = [...items].filter(i => i.state === 'strong').sort((a, b) => b.current - a.current);
  const gapItems = items.filter(i => i.state !== 'strong');
  const biggestGaps = [...gapItems].sort((a, b) =>
    (b.target - b.current) * (weight[b.importance] ?? .5) - (a.target - a.current) * (weight[a.importance] ?? .5));
  const criticalMissing = items.filter(i => i.state === 'missing' && (i.importance === 'required' || i.importance === 'foundational'));
  const unlockers = [...gapItems].sort((a, b) => b.unlocks.length - a.unlocks.length)
    .filter(i => i.unlocks.length > 0).slice(0, 4);

  const topGap = biggestGaps[0];
  const summary = topGap
    ? `Your biggest gap for ${targetRole} is ${topGap.skill} (${topGap.current}% vs ${topGap.target}% expected). Improving it unlocks ${topGap.unlocks.length} related skills.`
    : `You meet or exceed all tracked requirements for ${targetRole}. Time to deepen advanced skills.`;

  return { role: targetRole, readiness, items, strongest, biggestGaps: biggestGaps.slice(0, 6), criticalMissing, unlockers, summary };
}


