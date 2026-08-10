import PostService from '@/services/post.service';

const mockRpc = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({ select: mockSelect })),
    rpc: (...args: unknown[]) => mockRpc(...(args as [])),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/post-photos/${path}` }
        })
      }))
    }
  }
}));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  household_id: 'house-1',
  author_id: 'user-1',
  caption: 'Bailey at the park',
  occurred_at: '2026-08-09T02:00:00Z',
  edited_at: null,
  users: { first_name: 'Dylan', last_name: 'Lindsay' },
  post_photos: [{ storage_path: 'user-1/house-1/b.jpg', sort_order: 0 }],
  post_pets: [{ pets: { id: 'pet-1', name: 'Bailey', photo_url: null } }],
  post_likes: [],
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
  mockSingle.mockResolvedValue({ data: row(), error: null });
});

describe('PostService.update', () => {
  it('translates the domain shape into the RPC argument names', async () => {
    await PostService.update({
      postId: 'post-1',
      caption: 'A better caption',
      petIds: ['pet-1', 'pet-2']
    });

    expect(mockRpc).toHaveBeenCalledWith('update_post', {
      target_post_id: 'post-1',
      post_caption: 'A better caption',
      tagged_pet_ids: ['pet-1', 'pet-2']
    });
  });

  it('sends an empty tag array rather than undefined, so clearing every tag clears them', async () => {
    await PostService.update({ postId: 'post-1', caption: null });

    expect(mockRpc).toHaveBeenCalledWith('update_post', {
      target_post_id: 'post-1',
      post_caption: null,
      tagged_pet_ids: []
    });
  });

  it('throws when the write is rejected', async () => {
    mockRpc.mockResolvedValue({ error: new Error('That post is not yours to edit') });

    await expect(PostService.update({ postId: 'post-1' })).rejects.toThrow(
      'That post is not yours to edit'
    );
  });
});

describe('PostService.get', () => {
  it('maps column names back into the domain shape', async () => {
    await expect(PostService.get({ postId: 'post-1', viewerId: 'user-1' })).resolves.toEqual({
      id: 'post-1',
      householdId: 'house-1',
      authorId: 'user-1',
      author: { firstName: 'Dylan', lastName: 'Lindsay' },
      caption: 'Bailey at the park',
      occurredAt: '2026-08-09T02:00:00Z',
      editedAt: null,
      photoUrls: ['https://cdn.test/post-photos/user-1/house-1/b.jpg'],
      pets: [{ id: 'pet-1', name: 'Bailey', photoUrl: null }],
      likeCount: 0,
      likedByMe: false,
      likers: []
    });
  });

  it('reads likedByMe from the viewer, not from the row', async () => {
    mockSingle.mockResolvedValue({
      data: row({
        post_likes: [
          { user_id: 'user-2', users: { first_name: 'Sarah', last_name: 'Chen' } },
          { user_id: 'user-1', users: { first_name: 'Dylan', last_name: 'Lindsay' } }
        ]
      }),
      error: null
    });

    const asAuthor = await PostService.get({ postId: 'post-1', viewerId: 'user-1' });
    expect(asAuthor.likedByMe).toBe(true);
    expect(asAuthor.likeCount).toBe(2);

    const asStranger = await PostService.get({ postId: 'post-1', viewerId: 'user-3' });
    expect(asStranger.likedByMe).toBe(false);
  });

  it('keeps the order the query returned, so the lead liker is the earliest', async () => {
    mockSingle.mockResolvedValue({
      data: row({
        post_likes: [
          { user_id: 'user-2', users: { first_name: 'Sarah', last_name: 'Chen' } },
          { user_id: 'user-1', users: { first_name: 'Dylan', last_name: 'Lindsay' } }
        ]
      }),
      error: null
    });

    const post = await PostService.get({ postId: 'post-1', viewerId: null });

    expect(post.likers).toEqual([
      { userId: 'user-2', firstName: 'Sarah', lastName: 'Chen' },
      { userId: 'user-1', firstName: 'Dylan', lastName: 'Lindsay' }
    ]);
  });

  it('survives a liker whose account has gone', async () => {
    mockSingle.mockResolvedValue({
      data: row({ post_likes: [{ user_id: 'user-9', users: null }] }),
      error: null
    });

    const post = await PostService.get({ postId: 'post-1', viewerId: null });

    expect(post.likers).toEqual([{ userId: 'user-9', firstName: null, lastName: null }]);
  });
});
