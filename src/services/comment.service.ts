import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';

// Matches the database check in 20260822100000.
export const COMMENT_MAX_LENGTH = 500;

type CommentAuthor = {
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
  // Who the reply answers, which is not always the parent's author.
  replyToUserId: string | null;
  replyToName: string | null;
  body: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  // Always empty on a reply: the thread is two levels deep.
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

// A reply whose parent is absent is dropped, not promoted: top-level turns an
// answer into a statement to nobody.
function buildThread(rows: PostComment[]): PostComment[] {
  const topLevel = rows.filter((row) => row.parentCommentId === null);
  const byId = new Map(topLevel.map((row) => [row.id, row]));

  for (const row of rows) {
    if (row.parentCommentId === null) continue;

    byId.get(row.parentCommentId)?.replies.push(row);
  }

  return topLevel;
}

export const COMMENTS_PAGE_SIZE = 30;

export type CommentsCursor = { createdAt: string; id: string };

namespace CommentService {
  // Pages the top-level comments only, then fetches every reply to that page,
  // so a parent never arrives without its replies.
  export async function list(params: {
    postId: string;
    viewerId: string | null;
    cursor?: CommentsCursor;
  }): Promise<{ comments: PostComment[]; nextCursor: CommentsCursor | null }> {
    let query = supabase
      .from('post_comments')
      .select(COMMENT_SELECT)
      .eq('post_id', params.postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(COMMENTS_PAGE_SIZE + 1);

    if (params.cursor) {
      query = query.or(
        `created_at.gt.${params.cursor.createdAt},` +
          `and(created_at.eq.${params.cursor.createdAt},id.gt.${params.cursor.id})`
      );
    }

    // One extra row says whether another page exists without a second request.
    const rows = await unwrap(query);
    const hasMore = rows.length > COMMENTS_PAGE_SIZE;
    const parents = rows
      .slice(0, COMMENTS_PAGE_SIZE)
      .map((row) => mapCommentRow(row, params.viewerId));

    let replies: PostComment[] = [];
    if (parents.length > 0) {
      const replyRows = await unwrap(
        supabase
          .from('post_comments')
          .select(COMMENT_SELECT)
          .in(
            'parent_comment_id',
            parents.map((parent) => parent.id)
          )
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
      );

      replies = replyRows.map((row) => mapCommentRow(row, params.viewerId));
    }

    const last = parents.at(-1);

    return {
      comments: buildThread([...parents, ...replies]),
      nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null
    };
  }

  export async function create(params: {
    postId: string;
    userId: string;
    body: string;
    parentCommentId?: string | null;
    replyToUserId?: string | null;
  }): Promise<void> {
    await unwrap(
      supabase.from('post_comments').insert({
        post_id: params.postId,
        author_id: params.userId,
        body: params.body.trim(),
        parent_comment_id: params.parentCommentId ?? null,
        reply_to_user_id: params.replyToUserId ?? null
      })
    );
  }

  export async function remove(commentId: string): Promise<void> {
    await unwrap(supabase.from('post_comments').delete().eq('id', commentId));
  }

  export async function like(params: { commentId: string; userId: string }): Promise<void> {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: params.commentId, user_id: params.userId });

    // 23505 means already liked, which is what was wanted.
    if (error && error.code !== '23505') throw error;
  }

  export async function unlike(params: { commentId: string; userId: string }): Promise<void> {
    await unwrap(
      supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', params.commentId)
        .eq('user_id', params.userId)
    );
  }
}

export default CommentService;
