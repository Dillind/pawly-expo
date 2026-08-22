import { supabase } from '@/lib/supabase/client';

/** Matches the database check in 20260822100000. */
export const COMMENT_MAX_LENGTH = 500;

export type CommentAuthor = {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export type PostComment = {
  id: string;
  postId: string;
  authorId: string | null;
  author: CommentAuthor | null;
  parentCommentId: string | null;
  /**
   * Who the reply answers, which is not always the parent's author -- a reply
   * to a sibling flattens under the same parent but still points at the
   * sibling. Null on a top-level comment, and null once that account is gone.
   */
  replyToUserId: string | null;
  replyToName: string | null;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  /** Empty on a reply -- the thread is two levels deep and no further. */
  replies: PostComment[];
};

const COMMENT_SELECT = `
  id, post_id, author_id, parent_comment_id, reply_to_user_id, body, created_at,
  users!post_comments_author_id_fkey(first_name, last_name, avatar_url),
  reply_to:users!post_comments_reply_to_user_id_fkey(first_name),
  comment_likes(user_id)
`;

type UserEmbed = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string | null;
  parent_comment_id: string | null;
  reply_to_user_id: string | null;
  body: string;
  created_at: string;
  users: UserEmbed | null;
  reply_to: { first_name: string | null } | null;
  comment_likes: { user_id: string }[];
};

function mapCommentRow(row: CommentRow, viewerId: string | null): PostComment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    author: row.users
      ? {
          firstName: row.users.first_name,
          lastName: row.users.last_name,
          avatarUrl: row.users.avatar_url
        }
      : null,
    parentCommentId: row.parent_comment_id,
    replyToUserId: row.reply_to_user_id,
    replyToName: row.reply_to?.first_name ?? null,
    body: row.body,
    createdAt: row.created_at,
    likeCount: row.comment_likes.length,
    likedByMe: viewerId !== null && row.comment_likes.some((like) => like.user_id === viewerId),
    replies: []
  };
}

/**
 * Flat rows in, two levels out. The database already guarantees the depth, so
 * this never has to recurse -- a row is a parent or it is a child of one.
 *
 * A reply whose parent is missing is dropped rather than promoted. The cascade
 * means that cannot happen through a delete, so a reply with no parent in the
 * result is a page boundary or a bug, and silently rendering it as a top-level
 * comment would turn either into a sentence answering nothing.
 */
function buildThread(rows: PostComment[]): PostComment[] {
  const topLevel = rows.filter((row) => row.parentCommentId === null);
  const byId = new Map(topLevel.map((row) => [row.id, row]));

  for (const row of rows) {
    if (row.parentCommentId === null) continue;

    byId.get(row.parentCommentId)?.replies.push(row);
  }

  return topLevel;
}

namespace CommentService {
  /**
   * The whole thread in one request, oldest first at both levels.
   *
   * Unpaginated on purpose. A household is three or four people, and a thread
   * that outgrows one request is a problem worth having before it is worth
   * solving. The ordering is what makes the flat-to-nested pass below stable:
   * replies arrive in the order they were written, so no sort is needed after.
   */
  export async function list(params: {
    postId: string;
    viewerId: string | null;
  }): Promise<PostComment[]> {
    const { data, error } = await supabase
      .from('post_comments')
      .select(COMMENT_SELECT)
      .eq('post_id', params.postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // The client has no generated Database types, so PostgREST's select parser
    // infers the to-one embeds as arrays. They arrive as objects.
    const comments = (data as unknown as CommentRow[]).map((row) =>
      mapCommentRow(row, params.viewerId)
    );

    return buildThread(comments);
  }

  export async function create(params: {
    postId: string;
    userId: string;
    body: string;
    parentCommentId?: string | null;
    replyToUserId?: string | null;
  }): Promise<void> {
    const { error } = await supabase.from('post_comments').insert({
      post_id: params.postId,
      author_id: params.userId,
      body: params.body.trim(),
      parent_comment_id: params.parentCommentId ?? null,
      reply_to_user_id: params.replyToUserId ?? null
    });

    if (error) throw error;
  }

  export async function remove(commentId: string): Promise<void> {
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);

    if (error) throw error;
  }

  export async function like(params: { commentId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: params.commentId, user_id: params.userId });

    // 23505 is the composite primary key doing its job -- already liked, which
    // is the state the caller wanted. Not an error worth surfacing.
    if (error && error.code !== '23505') throw error;
  }

  export async function unlike(params: { commentId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', params.commentId)
      .eq('user_id', params.userId);

    if (error) throw error;
  }
}

export default CommentService;
