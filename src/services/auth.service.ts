import { supabase } from '@/lib/supabase/client';
import PushTokenService from '@/services/push-token.service';

namespace AuthService {
  export async function signUp(params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          first_name: params.firstName,
          last_name: params.lastName
        }
      }
    });

    if (error) throw error;
    return data;
  }

  export async function verifySignUpOtp(params: { email: string; token: string }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: params.token,
      type: 'signup'
    });

    if (error) throw error;
    return data;
  }

  export async function signInWithPassword(params: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword(params);

    if (error) throw error;
    return data;
  }

  export async function signOut() {
    // Before signOut, not after: deleting the row is an RLS-gated write that
    // needs auth.uid(), and once the session is gone there is nothing to
    // authorise it.
    await PushTokenService.remove();

    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  }
}

export default AuthService;
