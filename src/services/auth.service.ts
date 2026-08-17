import { UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import PushTokenService from '@/services/push-token.service';

namespace AuthService {
  export async function signUp(params: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password
    });

    if (error) throw new UserFacingError(error.message);
    return data;
  }

  export async function verifySignUpOtp(params: { email: string; token: string }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'signup'
    });

    if (error) throw new UserFacingError(error.message);
    return data;
  }

  // Supabase does not say whether the address has an account, and neither must
  // the caller -- that would tell a stranger which emails are registered.
  export async function resetPasswordForEmail(params: { email: string }) {
    const { error } = await supabase.auth.resetPasswordForEmail(params.email);

    if (error) throw new UserFacingError(error.message);
  }

  export async function verifyRecoveryOtp(params: { email: string; token: string }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'recovery'
    });

    if (error) throw new UserFacingError(error.message);
    return data;
  }

  export async function updatePassword(params: { password: string }) {
    const { data, error } = await supabase.auth.updateUser({ password: params.password });

    if (error) throw new UserFacingError(error.message);
    return data;
  }

  export async function signInWithPassword(params: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword(params);

    if (error) throw new UserFacingError(error.message);
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

    if (error) throw new UserFacingError(error.message);
  }
}

export default AuthService;
