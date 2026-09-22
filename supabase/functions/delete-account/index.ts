import { createClient } from 'npm:@supabase/supabase-js@2';

import { bearerToken, isConfirmed } from './confirmation.ts';

const PET_PHOTO_BUCKET = 'pet-photos';
const POST_PHOTO_BUCKET = 'post-photos';
const AVATAR_BUCKET = 'user-avatars';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = bearerToken(request.headers.get('Authorization'));
  if (!token) return json({ error: 'unauthorised' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const {
    data: { user },
    error: userError
  } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: 'unauthorised' }, 401);

  const body = await request.json().catch(() => ({}));
  if (!isConfirmed(body?.confirmation)) return json({ status: 'confirmation_mismatch' });

  const { data: plan, error: planError } = await admin.rpc('prepare_account_deletion', {
    target_user_id: user.id
  });
  if (planError) {
    console.error(planError);
    return json({ error: 'prepare_failed' }, 500);
  }

  if (plan.status === 'last_owner') {
    return json({ status: 'last_owner', households: plan.households ?? [] });
  }

  // A failed file removal orphans an object; it must not keep the account alive.
  const removeObjects = async (bucket: string, paths: string[]) => {
    if (paths.length === 0) return;
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (error) console.error(bucket, error);
  };

  await removeObjects(PET_PHOTO_BUCKET, plan.pet_photos ?? []);
  await removeObjects(POST_PHOTO_BUCKET, plan.post_photos ?? []);

  const { data: avatars } = await admin.storage.from(AVATAR_BUCKET).list(user.id);
  await removeObjects(
    AVATAR_BUCKET,
    (avatars ?? []).map((object) => `${user.id}/${object.name}`)
  );

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error(deleteError);
    return json({ error: 'delete_failed' }, 500);
  }

  return json({ status: 'deleted' });
});
