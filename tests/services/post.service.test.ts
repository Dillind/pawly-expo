import PostService from '@/services/post.service';

const mockRpc = jest.fn();
const mockSingle = jest.fn();
const mockRemoveObjects = jest.fn();
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
        }),
        remove: (...args: unknown[]) => mockRemoveObjects(...(args as []))
      }))
    }
  }
}));

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  household_id: 'house-1',
  author_id: 'user-1',
  title: 'Park day',
  caption: 'Bailey at the park',
  occurred_at: '2026-08-09T02:00:00Z',
  edited_at: null,
  users: { first_name: 'Dylan', last_name: 'Lindsay' },
  post_photos: [{ id: 'photo-1', storage_path: 'user-1/house-1/b.jpg', sort_order: 0 }],
  post_pets: [{ pets: { id: 'pet-1', name: 'Bailey', photo_url: null } }],
  post_likes: [],
  ...overrides
});

/** The one already on the post in `row()`, as the composer would hand it back. */
const KEPT_PHOTO = { kind: 'existing' as const, storagePath: 'user-1/house-1/b.jpg' };

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
  mockSingle.mockResolvedValue({ data: row(), error: null });
  mockRemoveObjects.mockResolvedValue({ error: null });
});

describe('PostService.update', () => {
  const update = (overrides: Partial<Parameters<typeof PostService.update>[0]> = {}) =>
    PostService.update({
      postId: 'post-1',
      userId: 'user-1',
      title: 'Park day',
      caption: 'A better caption',
      petIds: ['pet-1', 'pet-2'],
      photos: [KEPT_PHOTO],
      ...overrides
    });

  it('translates the domain shape into the RPC argument names', async () => {
    await update();

    expect(mockRpc).toHaveBeenCalledWith('update_post', {
      target_post_id: 'post-1',
      photo_storage_paths: ['user-1/house-1/b.jpg'],
      post_title: 'Park day',
      post_caption: 'A better caption',
      tagged_pet_ids: ['pet-1', 'pet-2']
    });
  });

  it('passes an empty tag array straight through, which is how every tag is cleared', async () => {
    await update({ caption: 'Kept', petIds: [] });

    expect(mockRpc).toHaveBeenCalledWith('update_post', {
      target_post_id: 'post-1',
      photo_storage_paths: ['user-1/house-1/b.jpg'],
      post_title: 'Park day',
      post_caption: 'Kept',
      tagged_pet_ids: []
    });
  });

  it('sends a null caption only when the caller asked to clear it', async () => {
    await update({ caption: null, petIds: ['pet-1'] });

    expect(mockRpc).toHaveBeenCalledWith('update_post', {
      target_post_id: 'post-1',
      photo_storage_paths: ['user-1/house-1/b.jpg'],
      post_title: 'Park day',
      post_caption: null,
      tagged_pet_ids: ['pet-1']
    });
  });

  it('sends the photo paths in the order the composer left them', async () => {
    mockSingle.mockResolvedValue({
      data: row({
        post_photos: [
          { id: 'photo-1', storage_path: 'user-1/house-1/b.jpg', sort_order: 0 },
          { id: 'photo-2', storage_path: 'user-1/house-1/c.jpg', sort_order: 1 }
        ]
      }),
      error: null
    });

    await update({
      photos: [{ kind: 'existing', storagePath: 'user-1/house-1/c.jpg' }, KEPT_PHOTO]
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'update_post',
      expect.objectContaining({
        photo_storage_paths: ['user-1/house-1/c.jpg', 'user-1/house-1/b.jpg']
      })
    );
  });

  it('deletes the objects for photos dropped from the post', async () => {
    mockSingle.mockResolvedValue({
      data: row({
        post_photos: [
          { id: 'photo-1', storage_path: 'user-1/house-1/b.jpg', sort_order: 0 },
          { id: 'photo-2', storage_path: 'user-1/house-1/c.jpg', sort_order: 1 }
        ]
      }),
      error: null
    });

    await update({ photos: [KEPT_PHOTO] });

    expect(mockRemoveObjects).toHaveBeenCalledWith(['user-1/house-1/c.jpg']);
  });

  it('leaves every object alone when nothing was dropped', async () => {
    await update();

    expect(mockRemoveObjects).not.toHaveBeenCalled();
  });

  it('throws when the write is rejected', async () => {
    mockRpc.mockResolvedValue({ error: new Error('That post is not yours to edit') });

    await expect(update({ caption: 'x', petIds: [] })).rejects.toThrow(
      'That post is not yours to edit'
    );
  });

  it('does not delete the dropped photo when the RPC failed', async () => {
    mockSingle.mockResolvedValue({
      data: row({
        post_photos: [
          { id: 'photo-1', storage_path: 'user-1/house-1/b.jpg', sort_order: 0 },
          { id: 'photo-2', storage_path: 'user-1/house-1/c.jpg', sort_order: 1 }
        ]
      }),
      error: null
    });
    mockRpc.mockResolvedValue({ error: new Error('nope') });

    await expect(update({ photos: [KEPT_PHOTO] })).rejects.toThrow('nope');

    // The row still references it. Deleting the object here is what would leave
    // a Post pointing at a file that no longer exists.
    expect(mockRemoveObjects).not.toHaveBeenCalled();
  });
});

describe('PostService.get', () => {
  it('maps column names back into the domain shape', async () => {
    await expect(PostService.get({ postId: 'post-1', viewerId: 'user-1' })).resolves.toEqual({
      id: 'post-1',
      householdId: 'house-1',
      authorId: 'user-1',
      author: { firstName: 'Dylan', lastName: 'Lindsay' },
      title: 'Park day',
      caption: 'Bailey at the park',
      occurredAt: '2026-08-09T02:00:00Z',
      editedAt: null,
      photos: [
        {
          id: 'photo-1',
          url: 'https://cdn.test/post-photos/user-1/house-1/b.jpg',
          storagePath: 'user-1/house-1/b.jpg'
        }
      ],
      pets: [{ id: 'pet-1', name: 'Bailey', photoUrl: null }],
      likeCount: 0,
      likedByMe: false,
      likers: []
    });
  });

  it('carries a null title through, which is every Post made before titles existed', async () => {
    mockSingle.mockResolvedValue({ data: row({ title: null }), error: null });

    const post = await PostService.get({ postId: 'post-1', viewerId: null });

    expect(post.title).toBeNull();
  });

  it('orders photos by sort_order, not by the order PostgREST returned them', async () => {
    mockSingle.mockResolvedValue({
      data: row({
        post_photos: [
          { id: 'photo-2', storage_path: 'user-1/house-1/second.jpg', sort_order: 1 },
          { id: 'photo-1', storage_path: 'user-1/house-1/first.jpg', sort_order: 0 }
        ]
      }),
      error: null
    });

    const post = await PostService.get({ postId: 'post-1', viewerId: null });

    expect(post.photos.map((photo) => photo.id)).toEqual(['photo-1', 'photo-2']);
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
