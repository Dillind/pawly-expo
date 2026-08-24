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
  /** Who the reply answers -- NOT always the parent's author. */
  replyToUserId: string | null;
  replyToName: string | null;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  /** Always empty on a reply: the thread is two levels deep. */
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
 * Flat rows in, two levels out. A reply whose parent is absent is dropped, not
 * promoted -- rendering it top-level turns an answer into a statement to nobody.
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
  /** The whole thread in one request, oldest first. Unpaginated on purpose. */
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

    // No generated Database types, so PostgREST infers the to-one embeds as
    // arrays. They arrive as objects.
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

    // 23505 is the composite primary key: already liked, which is what was wanted.
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
