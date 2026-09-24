import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

import { toUserFacingError } from '@/lib/auth-errors';
import { UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import PushTokenService from '@/services/push-token.service';
import UserService from '@/services/user.service';
import type { Rpc } from '@/types/database-overrides';

const googleConfig = Constants.expoConfig?.extra?.googleSignIn as
  { iosClientId: string; webClientId: string } | undefined;

if (googleConfig) GoogleSignin.configure(googleConfig);

const saveAppleName = async (
  userId: string | undefined,
  fullName: AppleAuthentication.AppleAuthenticationFullName | null
) => {
  const firstName = fullName?.givenName?.trim();
  const lastName = fullName?.familyName?.trim();

  if (!userId || !firstName) return;

  await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName ?? '' } });
  await UserService.updateName(userId, { firstName, lastName: lastName ?? '' });
};

export type SignInMethod = 'email' | 'apple' | 'google';

type PlanRow = Rpc<'account_deletion_plan'>[number];

export type AccountHousehold = {
  id: string;
  name: string;
  outcome: PlanRow['outcome'];
  members: { userId: string; firstName: string | null; role: PlanRow['members'][number]['role'] }[];
};

export type DeleteAccountResult =
  | { status: 'deleted' }
  | { status: 'cancelled' }
  | { status: 'wrong_password' }
  | { status: 'last_owner'; households: string[] }
  | { status: 'confirmation_mismatch' };

type DeleteAccountResponse = {
  status: 'deleted' | 'last_owner' | 'confirmation_mismatch' | 'reauth_required' | 'wrong_account';
  households?: string[];
};

const isAppleCancel = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED';

// Apple's code is single use and expires in five minutes, so it is fetched only at the delete.
const appleAuthorizationCode = async (): Promise<string | null> => {
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    if (!credential.authorizationCode)
      throw new UserFacingError('Apple did not return a sign-in code.');
    return credential.authorizationCode;
  } catch (error) {
    if (isAppleCancel(error)) return null;
    throw error;
  }
};

namespace AuthService {
  export async function signUp(params: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password
    });

    if (error) throw toUserFacingError(error);
    return data;
  }

  export async function verifySignUpOtp(params: { email: string; token: string }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'signup'
    });

    if (error) throw toUserFacingError(error);
    return data;
  }

  export async function resendSignUpOtp(params: { email: string }) {
    const { error } = await supabase.auth.resend({ type: 'signup', email: params.email });

    if (error) throw toUserFacingError(error);
  }

  export async function resetPasswordForEmail(params: { email: string }) {
    const { error } = await supabase.auth.resetPasswordForEmail(params.email);

    if (error) throw toUserFacingError(error);
  }

  export async function verifyRecoveryOtp(params: { email: string; token: string }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'recovery'
    });

    if (error) throw toUserFacingError(error);
    return data;
  }

  export async function updatePassword(params: { password: string }) {
    const { data, error } = await supabase.auth.updateUser({ password: params.password });

    if (error) throw toUserFacingError(error);
    return data;
  }

  export async function signInWithApple() {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ],
      nonce: hashedNonce
    });

    if (!credential.identityToken)
      throw new UserFacingError('Apple did not return a sign-in token.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce
    });

    if (error) throw toUserFacingError(error);

    await saveAppleName(data.user?.id, credential.fullName);
    return data;
  }

  export async function signInWithGoogle() {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') return null;

    const idToken = response.data?.idToken;

    if (!idToken) throw new UserFacingError('Google did not return a sign-in token.');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error) throw toUserFacingError(error);
    return data;
  }

  export async function signInWithPassword(params: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword(params);

    if (error) throw toUserFacingError(error);
    return data;
  }

  // The email is never duplicated into public.users -- auth.users is the only
  // copy, so every surface that shows it reads the session.
  export async function getSessionEmail(): Promise<string | undefined> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.email;
  }

  export async function getSessionUserId(): Promise<string | undefined> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id;
  }

  export function onAuthStateChange(handler: (userId: string | undefined) => void) {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => handler(session?.user.id));

    return subscription;
  }

  export async function getSignInMethod(): Promise<SignInMethod> {
    const { data } = await supabase.auth.getSession();
    const providers: unknown[] = data.session?.user.app_metadata.providers ?? [];
    if (providers.includes('apple')) return 'apple';
    if (providers.includes('google')) return 'google';
    return 'email';
  }

  export async function verifyPassword(password: string): Promise<boolean> {
    const email = await getSessionEmail();
    if (!email) return false;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.code === 'invalid_credentials') return false;
    if (error) throw toUserFacingError(error);
    return true;
  }

  export async function accountDeletionPlan(): Promise<AccountHousehold[]> {
    const rows = (await unwrap(supabase.rpc('account_deletion_plan'))) ?? [];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      outcome: row.outcome,
      members: row.members.map((member) => ({
        userId: member.user_id,
        firstName: member.first_name,
        role: member.role
      }))
    }));
  }

  export async function handOverHousehold(params: { householdId: string; successorId: string }) {
    const result = await unwrap(
      supabase.rpc('hand_over_household', {
        target_household_id: params.householdId,
        successor_id: params.successorId
      })
    );
    if (result?.status !== 'handed_over')
      throw new UserFacingError('Could not make them the Owner. Try again.');
  }

  export async function deleteAccount(params: {
    confirmation: string;
    method: SignInMethod;
    password?: string;
    householdsToDelete: string[];
  }): Promise<DeleteAccountResult> {
    let authorizationCode: string | undefined;

    if (params.method === 'email') {
      if (!(await verifyPassword(params.password ?? ''))) return { status: 'wrong_password' };
    }

    if (params.method === 'apple') {
      const code = await appleAuthorizationCode();
      if (!code) return { status: 'cancelled' };
      authorizationCode = code;
    }

    if (params.method === 'google') {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return { status: 'cancelled' };
    }

    const result = await unwrap(
      supabase.functions.invoke<DeleteAccountResponse>('delete-account', {
        body: {
          confirmation: params.confirmation,
          authorizationCode,
          householdsToDelete: params.householdsToDelete
        }
      })
    );

    if (!result) throw new Error('delete-account returned no body');

    switch (result.status) {
      case 'deleted':
        return { status: 'deleted' };
      case 'last_owner':
        return { status: 'last_owner', households: result.households ?? [] };
      case 'confirmation_mismatch':
        return { status: 'confirmation_mismatch' };
      default:
        throw new UserFacingError('Sign in with the account you want to delete.');
    }
  }

  // Local only: the server session died with the user, so a global sign-out has nothing to revoke.
  export async function endDeletedSession(method: SignInMethod) {
    if (method === 'google') await GoogleSignin.revokeAccess().catch(() => undefined);
    await supabase.auth.signOut({ scope: 'local' });
  }

  export async function signOut() {
    // Before signOut, not after: deleting the row is an RLS-gated write that
    // needs auth.uid(), and once the session is gone there is nothing to
    // authorise it.
    await PushTokenService.remove();

    const { error } = await supabase.auth.signOut();

    if (error) throw toUserFacingError(error);
  }
}

export default AuthService;
