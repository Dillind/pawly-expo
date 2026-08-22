import CommentService from '@/services/comment.service';

let listResult: { data: unknown; error: Error | null } = { data: [], error: null };

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockOrder = jest.fn(() => Promise.resolve(listResult));
const mockEqDelete = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn(() => ({
  eq: jest.fn(() => ({ order: mockOrder }))
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: (...args: unknown[]) => mockInsert(...(args as [])),
      delete: jest.fn(() => ({
        eq: (...args: unknown[]) => {
          const chain = mockEqDelete(...(args as []));
          return Object.assign(Promise.resolve({ error: null }), {
            eq: () => Promise.resolve({ error: null })
          }) as unknown as typeof chain;
        }
      }))
    }))
  }
}));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  post_id: 'p1',
  author_id: 'u1',
  parent_comment_id: null,
  reply_to_user_id: null,
  body: 'good dog',
  created_at: '2026-08-22T01:00:00.000Z',
  users: { first_name: 'Sarah', last_name: 'Smith', avatar_url: null },
  reply_to: null,
  comment_likes: [],
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  listResult = { data: [], error: null };
});

describe('CommentService.list', () => {
  it('nests replies under their parent and leaves top-level comments flat', async () => {
    listResult = {
      data: [
        row({ id: 'top-1' }),
        row({ id: 'reply-1', parent_comment_id: 'top-1' }),
        row({ id: 'top-2' }),
        row({ id: 'reply-2', parent_comment_id: 'top-1' })
      ],
      error: null
    };

    const thread = await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(thread.map((comment) => comment.id)).toEqual(['top-1', 'top-2']);
    expect(thread[0].replies.map((reply) => reply.id)).toEqual(['reply-1', 'reply-2']);
    expect(thread[1].replies).toEqual([]);
  });

  it('drops a reply whose parent is not in the result', async () => {
    listResult = {
      data: [row({ id: 'orphan', parent_comment_id: 'missing' })],
      error: null
    };

    await expect(CommentService.list({ postId: 'p1', viewerId: 'u1' })).resolves.toEqual([]);
  });

  it('maps snake_case columns onto the domain shape', async () => {
    listResult = {
      data: [
        row({
          reply_to_user_id: 'u2',
          reply_to: { first_name: 'Bob' },
          comment_likes: [{ user_id: 'u1' }, { user_id: 'u2' }]
        })
      ],
      error: null
    };

    const [comment] = await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(comment.replyToUserId).toBe('u2');
    expect(comment.replyToName).toBe('Bob');
    expect(comment.likeCount).toBe(2);
    expect(comment.likedByMe).toBe(true);
    expect(comment.author).toEqual({
      firstName: 'Sarah',
      lastName: 'Smith',
      avatarUrl: null
    });
  });

  it('does not mark a comment as liked by a signed-out viewer', async () => {
    listResult = { data: [row({ comment_likes: [{ user_id: 'u1' }] })], error: null };

    const [comment] = await CommentService.list({ postId: 'p1', viewerId: null });

    expect(comment.likedByMe).toBe(false);
  });
});

describe('CommentService.create', () => {
  it('writes column names, not the domain shape, and trims the body', async () => {
    await CommentService.create({
      postId: 'p1',
      userId: 'u1',
      body: '  good dog  ',
      parentCommentId: 'top-1',
      replyToUserId: 'u2'
    });

    expect(mockInsert).toHaveBeenCalledWith({
      post_id: 'p1',
      author_id: 'u1',
      body: 'good dog',
      parent_comment_id: 'top-1',
      reply_to_user_id: 'u2'
    });
  });

  it('sends nulls rather than undefined for a top-level comment', async () => {
    await CommentService.create({ postId: 'p1', userId: 'u1', body: 'hello' });

    expect(mockInsert).toHaveBeenCalledWith({
      post_id: 'p1',
      author_id: 'u1',
      body: 'hello',
      parent_comment_id: null,
      reply_to_user_id: null
    });
  });
});
