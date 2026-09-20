import { ok, withUser } from '@/lib/api';
import { computeProgress } from '@/lib/services/progress';

export default withUser(async ({ res, user }) => {
  ok(res, { progress: computeProgress(user.id) });
});
