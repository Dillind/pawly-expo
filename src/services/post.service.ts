import { resizeForUpload } from '@/lib/photo';
import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';

export const POSTS_PAGE_SIZE = 20;

const BUCKET = 'post-photos';

export type PostAuthor = {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type PostPetTag = { id: string; name: string; photoUrl: string | null };

export type PostLiker = PostAuthor & { userId: string };

/** `storagePath` is the identity an edit works in -- see `update`. */
export type PostPhoto = { id: string; url: string; storagePath: string };

/**
 * A photo on its way into a Post: either one already in the bucket, or one the
 * author just picked and which has not been uploaded yet.
 */
export type PostPhotoInput =
  { kind: 'existing'; storagePath: string } | { kind: 'new'; localUri: string };

export type Post = {
  id: string;
  householdId: string;
  authorId: string | null;
  author: PostAuthor | null;
  /** Null on every Post made before titles existed. */
  title: string | null;
  caption: string | null;
  occurredAt: string;
  editedAt: string | null;
  photos: PostPhoto[];
  pets: PostPetTag[];
  likeCount: number;
  likedByMe: boolean;
  /** The whole thread, replies included. */
  commentCount: number;
  /** Ordered oldest like first, so the row's lead name is stable between renders. */
  likers: PostLiker[];
};

/** Keyset rather than offset: a post inserted mid-scroll must not shift a page. */
export type PostsCursor = { occurredAt: string; id: string };

// posts.author_id references public.users, so PostgREST embeds the author
// directly. Null once the account itself is deleted -- not merely when the
// member leaves the household, which only costs them access.
const POST_SELECT = `
  id, household_id, author_id, title, caption, occurred_at, edited_at,
  users!posts_author_id_fkey(first_name, last_name, avatar_url),
  post_photos(id, storage_path, sort_order),
  post_pets(pets(id, name, photo_url)),
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
  users: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
  post_photos: { id: string; storage_path: string; sort_order: number }[];
  post_pets: { pets: { id: string; name: string; photo_url: string | null } | null }[];
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
  /**
   * The keyset below still holds across several households: the order is over
   * the whole result rather than per household.
   *
   * Scoped by household for the stream, or by author for a Member's own posts.
   * One of the two is required -- with neither, this would list every post RLS
   * allows, which is every household the viewer is in and not what any caller
   * means. An author scope deliberately names no household: the posts a Member
   * wrote span all of theirs, and RLS still hides any they have left.
   */
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

    // The client has no generated Database types, so PostgREST's select parser
    // cannot tell a to-one embed from a to-many and infers `users` and `pets`
    // as arrays. They arrive as objects. Only `unknown` bridges that.
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

  /**
   * Sequential, not `Promise.all`. Each resize renders the image through native
   * memory before releasing it, and ten of those at once on an older device is
   * how you get killed for the memory rather than merely made to wait.
   */
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
        // Everything uploaded so far belongs to a post that will never exist.
        await removeObjects(paths);
        throw error;
      }

      paths.push(path);
    }

    return paths;
  }

  /**
   * Best effort by design. A failed cleanup leaves an object nothing references
   * -- wasteful, but invisible. Failing the caller over it would undo work that
   * actually landed.
   */
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
  }): Promise<void> {
    const paths = await uploadPhotos({
      userId: params.userId,
      householdId: params.householdId,
      localUris: params.localUris
    });

    // One RPC, one transaction: a post without a photo must never exist, and
    // two client-side inserts cannot promise that across a dropped connection.
    const { error: rpcError } = await supabase.rpc('create_post', {
      target_household_id: params.householdId,
      photo_storage_paths: paths,
      post_title: params.title,
      post_caption: params.caption ?? null,
      tagged_pet_ids: params.petIds ?? []
    });

    if (rpcError) {
      // The row never landed, so the objects are unreachable. Leaving them
      // would be paid-for orphans nothing can ever find.
      await removeObjects(paths);
      throw rpcError;
    }
  }

  /**
   * `photos` is the whole desired set, in order -- not a list of changes. The
   * caller says what the Post should look like and this works out the rest, so
   * a caller that miscounts what it added cannot leave the two halves disagreeing.
   *
   * Upload first, RPC second, delete last. A failure between the upload and the
   * RPC costs an unreferenced object; the reverse order would cost a Post
   * pointing at a file that no longer exists.
   */
  export async function update(params: {
    postId: string;
    userId: string;
    // All required. The RPC overwrites what it is given, so an omitted caption
    // would silently clear one rather than leave it alone.
    title: string;
    caption: string | null;
    petIds: string[];
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

    // Rebuilt in the caller's order: the uploads come back in the order they
    // were handed over, so they slot back into the gaps they came from.
    const queue = [...uploadedPaths];
    const finalPaths = params.photos.map((photo) =>
      photo.kind === 'existing' ? photo.storagePath : queue.shift()!
    );

    const { error: rpcError } = await supabase.rpc('update_post', {
      target_post_id: params.postId,
      photo_storage_paths: finalPaths,
      post_title: params.title,
      post_caption: params.caption,
      tagged_pet_ids: params.petIds
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

    // An Owner deleting someone else's post cannot delete their objects under
    // the storage policy, which is the main reason this stays best effort.
    await removeObjects((photos ?? []).map((photo) => photo.storage_path));
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

  // Deliberately does not confirm the write with `.select()` as the role-gated
  // updates do: this is the member's own row, it runs on a timer, and a throw
  // here would surface as a toast nobody asked for.
  export async function markSeen(params: { householdId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('household_members')
      .update({ posts_last_seen_at: new Date().toISOString() })
      .eq('household_id', params.householdId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }

  /**
   * Drives the tab dot. One RPC, not two selects and a comparison in JS -- the
   * comparison is a `where` clause, and this runs on a minute's interval.
   */
  export async function hasUnseen(householdId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_unseen_posts', {
      target_household_id: householdId
    });

    if (error) throw error;

    return data ?? false;
  }
}

export default PostService;
