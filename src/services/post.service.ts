import { resizeForUpload } from '@/lib/photo';
import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';

export const POSTS_PAGE_SIZE = 20;

const BUCKET = 'post-photos';

export type PostAuthor = { firstName: string | null; lastName: string | null };

export type PostPetTag = { id: string; name: string; photoUrl: string | null };

export type Post = {
  id: string;
  householdId: string;
  authorId: string | null;
  author: PostAuthor | null;
  caption: string | null;
  occurredAt: string;
  photoUrls: string[];
  pets: PostPetTag[];
  likeCount: number;
  likedByMe: boolean;
};

/** Keyset rather than offset: a post inserted mid-scroll must not shift a page. */
export type PostsCursor = { occurredAt: string; id: string };

// posts.author_id references public.users, so PostgREST embeds the author
// directly. Null once the account itself is deleted -- not merely when the
// member leaves the household, which only costs them access.
const POST_SELECT = `
  id, household_id, author_id, caption, occurred_at,
  users(first_name, last_name),
  post_photos(storage_path, sort_order),
  post_pets(pets(id, name, photo_url)),
  post_likes(user_id)
`;

type PostRow = {
  id: string;
  household_id: string;
  author_id: string | null;
  caption: string | null;
  occurred_at: string;
  users: { first_name: string | null; last_name: string | null } | null;
  post_photos: { storage_path: string; sort_order: number }[];
  post_pets: { pets: { id: string; name: string; photo_url: string | null } | null }[];
  post_likes: { user_id: string }[];
};

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

function mapPostRow(row: PostRow, viewerId: string | null): Post {
  return {
    id: row.id,
    householdId: row.household_id,
    authorId: row.author_id,
    author: row.users
      ? { firstName: row.users.first_name, lastName: row.users.last_name }
      : null,
    caption: row.caption,
    occurredAt: row.occurred_at,
    photoUrls: [...row.post_photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => publicUrl(photo.storage_path)),
    pets: row.post_pets
      .map((tag) => tag.pets)
      .filter((pet): pet is NonNullable<typeof pet> => pet !== null)
      .map((pet) => ({ id: pet.id, name: pet.name, photoUrl: pet.photo_url })),
    likeCount: row.post_likes.length,
    likedByMe: viewerId !== null && row.post_likes.some((like) => like.user_id === viewerId)
  };
}

namespace PostService {
  export async function list(params: {
    householdId: string;
    cursor?: PostsCursor;
  }): Promise<{ posts: Post[]; nextCursor: PostsCursor | null }> {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('household_id', params.householdId)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(POSTS_PAGE_SIZE);

    // Ties on occurred_at are real -- two posts a second apart round to the
    // same instant far less often than two backdated to the same day do. id
    // breaks the tie in both the order and the cursor so a page boundary
    // landing mid-tie neither skips nor repeats a row.
    if (params.cursor) {
      query = query.or(
        `occurred_at.lt.${params.cursor.occurredAt},` +
          `and(occurred_at.eq.${params.cursor.occurredAt},id.lt.${params.cursor.id})`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const posts = (data as unknown as PostRow[]).map((row) => mapPostRow(row, user?.id ?? null));
    const last = posts.at(-1);

    return {
      posts,
      nextCursor:
        posts.length === POSTS_PAGE_SIZE && last
          ? { occurredAt: last.occurredAt, id: last.id }
          : null
    };
  }

  export async function create(params: {
    householdId: string;
    userId: string;
    localUri: string;
    caption?: string | null;
    occurredAt?: string | null;
    petIds?: string[];
  }): Promise<void> {
    const resizedUri = await resizeForUpload(params.localUri);

    const response = await fetch(resizedUri);
    const arrayBuffer = await response.arrayBuffer();

    const path = `${params.userId}/${params.householdId}/${Crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    // One RPC, one transaction: a post without a photo must never exist, and
    // two client-side inserts cannot promise that across a dropped connection.
    const { error: rpcError } = await supabase.rpc('create_post', {
      target_household_id: params.householdId,
      photo_storage_path: path,
      post_caption: params.caption ?? null,
      post_occurred_at: params.occurredAt ?? null,
      tagged_pet_ids: params.petIds ?? []
    });

    if (rpcError) {
      // The row never landed, so the object is unreachable. Leaving it would
      // be a paid-for orphan nothing can ever find.
      await supabase.storage.from(BUCKET).remove([path]);
      throw rpcError;
    }
  }

  export async function remove(postId: string): Promise<void> {
    // Read the paths before the delete: the cascade takes post_photos with it.
    const { data: photos } = await supabase
      .from('post_photos')
      .select('storage_path')
      .eq('post_id', postId);

    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;

    // Best effort, deliberately. An Owner deleting someone else's post cannot
    // delete their objects under the storage policy, and failing the whole
    // delete over a leftover file would be worse than the leftover.
    const paths = (photos ?? []).map((photo) => photo.storage_path);
    if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
  }

  export async function like(params: { postId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: params.postId, user_id: params.userId });

    // 23505 is the composite primary key doing its job -- already liked, which
    // is the state the caller wanted. Not an error worth surfacing.
    if (error && error.code !== '23505') throw error;
  }

  export async function unlike(params: { postId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', params.postId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }

  export async function markSeen(params: { householdId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('household_members')
      .update({ posts_last_seen_at: new Date().toISOString() })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }

  /** Drives the tab dot. Null `posts_last_seen_at` means never opened. */
  export async function hasUnseen(params: {
    householdId: string;
    userId: string;
  }): Promise<boolean> {
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('posts_last_seen_at')
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    const { data: newest, error: newestError } = await supabase
      .from('posts')
      .select('occurred_at')
      .eq('household_id', params.householdId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (newestError) throw newestError;
    if (!newest) return false;

    const lastSeen = membership?.posts_last_seen_at;
    return !lastSeen || newest.occurred_at > lastSeen;
  }
}

export default PostService;
