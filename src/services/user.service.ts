import { UserFacingError } from '@/lib/errors';
import { assertWrote } from '@/lib/supabase/assert-wrote';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile, UserStats } from '@/types/core';
import * as Crypto from 'expo-crypto';

const BUCKET = 'user-avatars';

/**
 * A public URL is `.../object/public/user-avatars/<path>`. Returns null for
 * anything that is not one of ours, so a hand-set or external URL is left alone.
 */
const storagePathFromPublicUrl = (url: string | null): string | null => {
  const marker = `/object/public/${BUCKET}/`;
  const index = url?.indexOf(marker) ?? -1;
  if (!url || index === -1) return null;

  const path = url.slice(index + marker.length).split('?')[0];
  return path.length > 0 ? decodeURIComponent(path) : null;
};

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
    const { data, error } = await supabase
      .from('users')
      .update({ first_name: params.firstName, last_name: params.lastName })
      .eq('id', userId)
      .select('id');

    if (error) throw error;

    assertWrote(data, 'Your name could not be updated');
  }

  /**
   * All-time, across every household the Member is in. RLS is what scopes it:
   * both select policies are household-membership based, so a household they
   * have left is already excluded and no filter here has to say so.
   *
   * Counts surviving rows. `feed_logs.logged_by` is `on delete set null`, so
   * this is not a lifetime tally -- it is what is still there.
   */
  export async function getStats(userId: string): Promise<UserStats> {
    const [feeds, posts] = await Promise.all([
      supabase
        .from('feed_logs')
        .select('id', { count: 'exact', head: true })
        .eq('logged_by', userId),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId)
    ]);

    if (feeds.error) throw feeds.error;
    if (posts.error) throw posts.error;

    return { feedsLogged: feeds.count ?? 0, postsCreated: posts.count ?? 0 };
  }

  export async function uploadAvatar(params: {
    userId: string;
    localUri: string;
  }): Promise<string> {
    const response = await fetch(params.localUri);
    if (!response.ok) throw new UserFacingError('Could not read the selected photo');

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new UserFacingError('The selected photo is empty');

    const path = `${params.userId}/${Crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  export async function setAvatarUrl(userId: string, avatarUrl: string | null) {
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select('id');

    if (error) throw error;

    assertWrote(data, 'Your photo could not be saved');
  }

  /**
   * Best effort by design: failing the whole photo change over a leftover
   * object would be worse than the leftover.
   */
  export async function removeAvatarByPublicUrl(url: string | null): Promise<void> {
    const path = storagePathFromPublicUrl(url);
    if (!path) return;

    await supabase.storage.from(BUCKET).remove([path]);
  }
}

export default UserService;
