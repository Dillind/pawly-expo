import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

import { toUserFacingError } from '@/lib/auth-errors';
import { UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import PushTokenService from '@/services/push-token.service';
import UserService from '@/services/user.service';

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
