import CommentService, { COMMENTS_PAGE_SIZE } from '@/services/comment.service';

type Result = { data: unknown; error: Error | null };

let parentResult: Result = { data: [], error: null };
let replyResult: Result = { data: [], error: null };

const calls: { method: string; args: unknown[] }[] = [];

// Thenable chain: a query with `.in` is the replies fetch, anything else the parent page.
function makeChain() {
  let isReplies = false;
  const chain: Record<string, unknown> = {};
  for (const method of ['eq', 'is', 'order', 'limit', 'or', 'in']) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      if (method === 'in') isReplies = true;
      return chain;
    };
  }
  chain.then = (resolve: (value: Result) => unknown) =>
    Promise.resolve(isReplies ? replyResult : parentResult).then(resolve);
  return chain;
}

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn(() => makeChain());

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: (...args: unknown[]) => mockInsert(...(args as [])),
      delete: jest.fn(() => ({
        eq: () =>
          Object.assign(Promise.resolve({ error: null }), {
            eq: () => Promise.resolve({ error: null })
          })
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
  calls.length = 0;
  parentResult = { data: [], error: null };
  replyResult = { data: [], error: null };
});

describe('CommentService.list', () => {
  it('nests replies under their parent and leaves top-level comments flat', async () => {
    parentResult = { data: [row({ id: 'top-1' }), row({ id: 'top-2' })], error: null };
    replyResult = {
      data: [
        row({ id: 'reply-1', parent_comment_id: 'top-1' }),
        row({ id: 'reply-2', parent_comment_id: 'top-1' })
      ],
      error: null
    };

    const { comments } = await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(comments.map((comment) => comment.id)).toEqual(['top-1', 'top-2']);
    expect(comments[0].replies.map((reply) => reply.id)).toEqual(['reply-1', 'reply-2']);
    expect(comments[1].replies).toEqual([]);
  });

  it('pages only top-level comments and fetches replies for that page', async () => {
    parentResult = { data: [row({ id: 'top-1' }), row({ id: 'top-2' })], error: null };

    await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(calls).toContainEqual({ method: 'is', args: ['parent_comment_id', null] });
    expect(calls).toContainEqual({ method: 'limit', args: [COMMENTS_PAGE_SIZE] });
    expect(calls).toContainEqual({ method: 'in', args: ['parent_comment_id', ['top-1', 'top-2']] });
  });

  it('skips the reply query when the page is empty', async () => {
    const result = await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(result).toEqual({ comments: [], nextCursor: null });
    expect(calls.some((call) => call.method === 'in')).toBe(false);
  });

  it('returns a cursor only for a full page', async () => {
    parentResult = {
      data: Array.from({ length: COMMENTS_PAGE_SIZE }, (_, index) =>
        row({
          id: `top-${index}`,
          created_at: `2026-08-22T01:00:${String(index).padStart(2, '0')}.000Z`
        })
      ),
      error: null
    };

    const { nextCursor } = await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(nextCursor).toEqual({
      createdAt: `2026-08-22T01:00:${COMMENTS_PAGE_SIZE - 1}.000Z`,
      id: `top-${COMMENTS_PAGE_SIZE - 1}`
    });
  });

  it('breaks created_at ties by id after the cursor', async () => {
    await CommentService.list({
      postId: 'p1',
      viewerId: 'u1',
      cursor: { createdAt: '2026-08-22T01:00:00.000Z', id: 'c9' }
    });

    expect(calls).toContainEqual({
      method: 'or',
      args: [
        'created_at.gt.2026-08-22T01:00:00.000Z,' +
          'and(created_at.eq.2026-08-22T01:00:00.000Z,id.gt.c9)'
      ]
    });
  });

  it('maps snake_case columns onto the domain shape', async () => {
    parentResult = {
      data: [
        row({
          reply_to_user_id: 'u2',
          reply_to: { first_name: 'Bob' },
          comment_likes: [{ user_id: 'u1' }, { user_id: 'u2' }]
        })
      ],
      error: null
    };

    const {
      comments: [comment]
    } = await CommentService.list({ postId: 'p1', viewerId: 'u1' });

    expect(comment.replyToUserId).toBe('u2');
    expect(comment.replyToName).toBe('Bob');
    expect(comment.likeCount).toBe(2);
    expect(comment.likedByMe).toBe(true);
    expect(comment.author).toEqual({ firstName: 'Sarah', lastName: 'Smith', avatarUrl: null });
  });

  it('does not mark a comment as liked by a signed-out viewer', async () => {
    parentResult = { data: [row({ comment_likes: [{ user_id: 'u1' }] })], error: null };

    const {
      comments: [comment]
    } = await CommentService.list({ postId: 'p1', viewerId: null });

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
