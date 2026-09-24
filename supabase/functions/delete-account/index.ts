import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5';

import { APPLE_AUDIENCE, appleSubject, clientSecretClaims, jwtSubject } from './apple.ts';
import { bearerToken, isConfirmed } from './confirmation.ts';

const PET_PHOTO_BUCKET = 'pet-photos';
const POST_PHOTO_BUCKET = 'post-photos';
const AVATAR_BUCKET = 'user-avatars';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const appleClientSecret = async () => {
  const teamId = Deno.env.get('APPLE_TEAM_ID')!;
  const keyId = Deno.env.get('APPLE_KEY_ID')!;
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID')!;
  const key = await importPKCS8(Deno.env.get('APPLE_PRIVATE_KEY')!, 'ES256');
  const claims = clientSecretClaims({ teamId, bundleId, now: Date.now() });

  return {
    bundleId,
    secret: await new SignJWT(claims).setProtectedHeader({ alg: 'ES256', kid: keyId }).sign(key)
  };
};

const applePost = (path: string, fields: Record<string, string>) =>
  fetch(`${APPLE_AUDIENCE}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields)
  });

type AppleTokens = { bundleId: string; secret: string; token: string; hint: string };

// Best effort: a failed exchange or revoke must never keep an account alive (ADR 0045).
const exchangeAppleCode = async (
  authorizationCode: string,
  expectedSubject: string
): Promise<AppleTokens | 'wrong_account' | null> => {
  try {
    const { bundleId, secret } = await appleClientSecret();
    const response = await applePost('token', {
      client_id: bundleId,
      client_secret: secret,
      code: authorizationCode,
      grant_type: 'authorization_code'
    });
    const tokens = await response.json();
    if (!response.ok) {
      console.error('apple token', tokens);
      return null;
    }
    if (jwtSubject(tokens.id_token ?? '') !== expectedSubject) return 'wrong_account';

    return tokens.refresh_token
      ? { bundleId, secret, token: tokens.refresh_token, hint: 'refresh_token' }
      : { bundleId, secret, token: tokens.access_token, hint: 'access_token' };
  } catch (error) {
    console.error('apple token', error);
    return null;
  }
};

const revokeApple = async ({ bundleId, secret, token, hint }: AppleTokens) => {
  const response = await applePost('revoke', {
    client_id: bundleId,
    client_secret: secret,
    token,
    token_type_hint: hint
  }).catch((error) => {
    console.error('apple revoke', error);
    return null;
  });
  if (response && !response.ok) console.error('apple revoke', response.status);
};

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

  const appleSub = appleSubject(user.identities);
  const authorizationCode =
    typeof body?.authorizationCode === 'string' ? body.authorizationCode : null;
  if (appleSub && !authorizationCode) return json({ status: 'reauth_required' });

  const appleTokens =
    appleSub && authorizationCode ? await exchangeAppleCode(authorizationCode, appleSub) : null;
  if (appleTokens === 'wrong_account') return json({ status: 'wrong_account' }, 403);

  const householdsToDelete = Array.isArray(body?.householdsToDelete)
    ? body.householdsToDelete.filter((id: unknown) => typeof id === 'string')
    : [];

  const { data: plan, error: planError } = await admin.rpc('prepare_account_deletion', {
    target_user_id: user.id,
    households_to_delete: householdsToDelete
  });
  if (planError) {
    console.error(planError);
    return json({ error: 'prepare_failed' }, 500);
  }

  if (plan.status === 'last_owner') {
    return json({ status: 'last_owner', households: plan.households ?? [] });
  }

  if (appleTokens) await revokeApple(appleTokens);

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
