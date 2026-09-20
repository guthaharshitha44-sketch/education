import { ok, fail, withUser } from '@/lib/api';
import { buildSkillTwin } from '@/lib/services/twin';

export default withUser(async ({ res, user }) => {
  ok(res, { twin: buildSkillTwin(user.id) });
});
