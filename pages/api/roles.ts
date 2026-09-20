import { ok, withUser } from '@/lib/api';
import { ROLE_TEMPLATES } from '@/lib/domain/roles';
import { userSkillsMap } from '@/lib/services/gap';

export default withUser(async ({ res, user }) => {
  const current = userSkillsMap(user.id);
  const roles = ROLE_TEMPLATES.map(r => {
    const reqs = [...r.foundational, ...r.required, ...r.preferred, ...r.advanced];
    let earned = 0, possible = 0;
    const match: Array<{ skill: string; current: number; target: number }> = [];
    for (const [skill, target] of reqs) {
      const cur = Math.min(current[skill] ?? 0, target);
      earned += cur; possible += target;
      match.push({ skill, current: current[skill] ?? 0, target });
    }
    return {
      name: r.name, slug: r.slug, description: r.description,
      matchPct: possible ? Math.round((earned / possible) * 100) : 0,
      requirements: match.sort((a, b) => (b.target - b.current) - (a.target - a.current)).slice(0, 6),
      recommendedProjects: r.recommended_projects,
      interviewAreas: r.interview_areas,
    };
  });
  ok(res, { roles: roles.sort((a, b) => b.matchPct - a.matchPct) });
});
