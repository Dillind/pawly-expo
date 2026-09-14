import * as Crypto from 'expo-crypto';

import { resizeForUpload } from '@/lib/photo';
import { supabase } from '@/lib/supabase/client';

export const POSTS_PAGE_SIZE = 20;

const BUCKET = 'post-photos';

export type PostAuthor = {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type PostPetTag = { id: string; name: string; photoUrl: string | null };

// Soft-deleted rows embed like any other: a Post keeps the Occasion it was
// given after the household drops it from the picker.
export type PostOccasion = { id: string; emoji: string | null; label: string | null };

export type PostLiker = PostAuthor & { userId: string };

// `storagePath` is the identity an edit works in -- see `update`.
export type PostPhoto = { id: string; url: string; storagePath: string };

export type PostPhotoInput =
  { kind: 'existing'; storagePath: string } | { kind: 'new'; localUri: string };

export type Post = {
  id: string;
  householdId: string;
  authorId: string | null;
  author: PostAuthor | null;
  title: string | null;
  caption: string | null;
  occurredAt: string;
  editedAt: string | null;
  photos: PostPhoto[];
  pets: PostPetTag[];
  occasion: PostOccasion | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  // Oldest like first, so the row's lead name is stable between renders.
  likers: PostLiker[];
};

// Keyset rather than offset: a post inserted mid-scroll must not shift a page.
export type PostsCursor = { occurredAt: string; id: string };

// Null once the account is deleted, not merely when the member leaves the
// household, which only costs them access.
const POST_SELECT = `
  id, household_id, author_id, title, caption, occurred_at, edited_at,
  users!posts_author_id_fkey(first_name, last_name, avatar_url),
  post_photos(id, storage_path, sort_order),
  post_pets(pets(id, name, photo_url)),
  occasions(id, emoji, label),
  post_likes(user_id, created_at, users(first_name, last_name, avatar_url)),
  post_comments(count)
`;

type PostRow = {
  id: string;
  household_id: string;
  author_id: string | null;
  title: string | null;
  caption: string | null;
  occurred_at: string;
  edited_at: string | null;
  users: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  post_photos: { id: string; storage_path: string; sort_order: number }[];
  post_pets: { pets: { id: string; name: string; photo_url: string | null } | null }[];
  occasions: { id: string; emoji: string | null; label: string | null } | null;
  post_likes: {
    user_id: string;
    created_at: string;
    users: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
  // An aggregate embed arrives as a one-row array, and is absent when zero.
  post_comments: { count: number }[];
};

const publicUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

function mapPostRow(row: PostRow, viewerId: string | null): Post {
  return {
    id: row.id,
    householdId: row.household_id,
    authorId: row.author_id,
    author: row.users
      ? {
          firstName: row.users.first_name,
          lastName: row.users.last_name,
          avatarUrl: row.users.avatar_url
        }
      : null,
    title: row.title,
    caption: row.caption,
    occurredAt: row.occurred_at,
    editedAt: row.edited_at,
    photos: [...row.post_photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => ({
        id: photo.id,
        url: publicUrl(photo.storage_path),
        storagePath: photo.storage_path
      })),
    pets: row.post_pets
      .map((tag) => tag.pets)
      .filter((pet): pet is NonNullable<typeof pet> => pet !== null)
      .map((pet) => ({ id: pet.id, name: pet.name, photoUrl: pet.photo_url })),
    occasion: row.occasions
      ? { id: row.occasions.id, emoji: row.occasions.emoji, label: row.occasions.label }
      : null,
    commentCount: row.post_comments[0]?.count ?? 0,
    likeCount: row.post_likes.length,
    likedByMe: viewerId !== null && row.post_likes.some((like) => like.user_id === viewerId),
    likers: row.post_likes.map((like) => ({
      userId: like.user_id,
      firstName: like.users?.first_name ?? null,
      lastName: like.users?.last_name ?? null,
      avatarUrl: like.users?.avatar_url ?? null
    }))
  };
}

namespace PostService {
  // One of household or author is required: with neither this lists every post
  // RLS allows, which is every household the viewer is in. An author scope names
  // no household because a Member's posts span all of theirs.
  export async function list(params: {
    householdIds?: string[];
    authorId?: string;
    viewerId: string | null;
    cursor?: PostsCursor;
  }): Promise<{ posts: Post[]; nextCursor: PostsCursor | null }> {
    if (!params.householdIds && !params.authorId) {
      throw new Error('PostService.list needs a household or an author to scope by');
    }

    let query = supabase
      .from('posts')
      .select(POST_SELECT)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .order('created_at', { referencedTable: 'post_likes', ascending: true })
      .limit(POSTS_PAGE_SIZE);

    if (params.householdIds) query = query.in('household_id', params.householdIds);
    if (params.authorId) query = query.eq('author_id', params.authorId);

    // Ties on occurred_at are real, so id breaks them in both the order and the
    // cursor: a page boundary mid-tie must neither skip nor repeat a row.
    if (params.cursor) {
      query = query.or(
        `occurred_at.lt.${params.cursor.occurredAt},` +
          `and(occurred_at.eq.${params.cursor.occurredAt},id.lt.${params.cursor.id})`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    // With no generated Database types, PostgREST's select parser infers these
    // to-one embeds as arrays. They arrive as objects, so `unknown` bridges it.
    const posts = (data as unknown as PostRow[]).map((row) => mapPostRow(row, params.viewerId));
    const last = posts.at(-1);

    return {
      posts,
      nextCursor:
        posts.length === POSTS_PAGE_SIZE && last
          ? { occurredAt: last.occurredAt, id: last.id }
          : null
    };
  }

  export async function get(params: { postId: string; viewerId: string | null }): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', params.postId)
      .single();

    if (error) throw error;

    return mapPostRow(data as unknown as PostRow, params.viewerId);
  }

  // Sequential, not `Promise.all`: each resize holds native memory, and ten at
  // once gets an older device killed rather than merely made to wait.
  async function uploadPhotos(params: {
    userId: string;
    householdId: string;
    localUris: string[];
  }): Promise<string[]> {
    const paths: string[] = [];

    for (const localUri of params.localUris) {
      const resizedUri = await resizeForUpload(localUri);

      const response = await fetch(resizedUri);
      const arrayBuffer = await response.arrayBuffer();

      const path = `${params.userId}/${params.householdId}/${Crypto.randomUUID()}.jpg`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

      if (error) {
        await removeObjects(paths);
        throw error;
      }

      paths.push(path);
    }

    return paths;
  }

  // Best effort: failing the caller over an orphaned object would undo work
  // that actually landed.
  async function removeObjects(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.error(error);
  }

  export async function create(params: {
    householdId: string;
    userId: string;
    localUris: string[];
    title: string;
    caption?: string | null;
    petIds?: string[];
    occasionId?: string | null;
  }): Promise<void> {
    const paths = await uploadPhotos({
      userId: params.userId,
      householdId: params.householdId,
      localUris: params.localUris
    });

    // One transaction: two client-side inserts cannot promise a post never
    // exists without its photo across a dropped connection.
    const { error: rpcError } = await supabase.rpc('create_post', {
      target_household_id: params.householdId,
      photo_storage_paths: paths,
      post_title: params.title,
      post_caption: params.caption ?? null,
      tagged_pet_ids: params.petIds ?? [],
      post_occasion_id: params.occasionId ?? null
    });

    if (rpcError) {
      // The row never landed, so the objects are unreachable.
      await removeObjects(paths);
      throw rpcError;
    }
  }

  // `photos` is the whole desired set, not a list of changes. Upload, then RPC,
  // then delete: a failure mid-way costs an unreferenced object, where the
  // reverse order costs a Post pointing at a file that is gone.
  export async function update(params: {
    postId: string;
    userId: string;
    // All required: the RPC overwrites what it is given, so an omitted caption
    // clears one rather than leaving it alone.
    title: string;
    caption: string | null;
    petIds: string[];
    occasionId: string | null;
    photos: PostPhotoInput[];
  }): Promise<void> {
    const { data: post, error: readError } = await supabase
      .from('posts')
      .select('household_id, post_photos(storage_path)')
      .eq('id', params.postId)
      .single<{ household_id: string; post_photos: { storage_path: string }[] }>();

    if (readError) throw readError;

    const uploadedPaths = await uploadPhotos({
      userId: params.userId,
      householdId: post.household_id,
      localUris: params.photos.flatMap((photo) => (photo.kind === 'new' ? [photo.localUri] : []))
    });

    // The uploads come back in the order they were handed over, so they slot
    // back into the gaps they came from.
    const queue = [...uploadedPaths];
    const finalPaths = params.photos.map((photo) =>
      photo.kind === 'existing' ? photo.storagePath : queue.shift()!
    );

    const { error: rpcError } = await supabase.rpc('update_post', {
      target_post_id: params.postId,
      photo_storage_paths: finalPaths,
      post_title: params.title,
      post_caption: params.caption,
      tagged_pet_ids: params.petIds,
      post_occasion_id: params.occasionId
    });

    if (rpcError) {
      await removeObjects(uploadedPaths);
      throw rpcError;
    }

    await removeObjects(
      post.post_photos
        .map((photo) => photo.storage_path)
        .filter((path) => !finalPaths.includes(path))
    );
  }

  export async function remove(postId: string): Promise<void> {
    // Read the paths before the delete: the cascade takes post_photos with it.
    const { data: photos } = await supabase
      .from('post_photos')
      .select('storage_path')
      .eq('post_id', postId);

    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;

    // An Owner cannot delete another member's objects under the storage policy,
    // which is why this stays best effort.
    await removeObjects((photos ?? []).map((photo) => photo.storage_path));
  }

  export async function like(params: { postId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: params.postId, user_id: params.userId });

    // 23505 means already liked, which is the state the caller wanted.
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

  // No `.select()` confirmation: this is the member's own row, runs on a timer,
  // and a throw would surface as a toast nobody asked for.
  export async function markSeen(params: { householdId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('household_members')
      .update({ posts_last_seen_at: new Date().toISOString() })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }

  // One RPC, not two selects and a JS comparison: it runs on a minute's
  // interval and the comparison is a `where` clause.
  export async function hasUnseen(householdId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_unseen_posts', {
      target_household_id: householdId
    });

    if (error) throw error;

    return data ?? false;
  }
}

export default PostService;
