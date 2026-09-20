import { ok, withUser } from '@/lib/api';
import { getProfileBundle } from '@/lib/services/profile';

export default withUser(async ({ res, user }) => {
  ok(res, { bundle: getProfileBundle(user.id) });
});
