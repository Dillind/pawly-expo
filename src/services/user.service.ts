import { supabase } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/core';

namespace UserService {
  export async function getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar_url')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url
    };
  }

  export async function updateName(
    userId: string,
    params: { firstName: string; lastName: string }
  ) {
    const { error } = await supabase
      .from('users')
      .update({ first_name: params.firstName, last_name: params.lastName })
      .eq('id', userId);

    if (error) throw error;
  }
}

export default UserService;
