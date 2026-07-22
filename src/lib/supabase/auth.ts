import { supabase } from '@/lib/supabase/client';

async function signUp(params: {
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

async function verifySignUpOtp(params: { email: string; token: string }) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: params.email,
    token: params.token,
    type: 'signup'
  });

  if (error) throw error;
  return data;
}

async function signInWithPassword(params: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword(params);

  if (error) throw error;
  return data;
}

export const AuthService = {
  signUp,
  verifySignUpOtp,
  signInWithPassword
};
