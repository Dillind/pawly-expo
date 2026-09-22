import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import PostService, {
  type Post,
  type PostLiker,
  type PostPhotoInput,
  type PostsCursor
} from '@/services/post.service';
import { useAuthStore } from '@/stores/auth-store';

// Sorted: the same households in another order must not fetch twice.

export function usePosts(householdIds: string[], viewerId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed(householdIds),
    queryFn: ({ pageParam }) =>
      PostService.list({
        householdIds,
        viewerId: viewerId ?? null,
        cursor: pageParam ?? undefined
      }),
    initialPageParam: null as PostsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.posts),
    enabled: householdIds.length > 0
  });
}

// `['posts', ...]` so a like or delete reaches this list through the same
// prefix as the stream -- writeToEveryList walks both.
export function useAuthorPosts(authorId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.byAuthor(authorId),
    queryFn: ({ pageParam }) =>
      PostService.list({
        authorId: authorId!,
        viewerId: authorId ?? null,
        cursor: pageParam ?? undefined
      }),
    initialPageParam: null as PostsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.posts),
    enabled: Boolean(authorId)
  });
}

// Its own query so the edit route survives a cold start.
export function usePost(postId: string | undefined, viewerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.post.detail(postId),
    queryFn: () => PostService.get({ postId: postId!, viewerId: viewerId ?? null }),
    enabled: Boolean(postId)
  });
}

export function useCreatePost(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: SuccessMessage.PostShared, errorMessage: ErrorMessage.PostShareFailed },
    mutationFn: (input: {
      userId: string;
      localUris: string[];
      title: string;
      caption?: string | null;
      petIds?: string[];
      occasionId?: string | null;
    }) => PostService.create({ householdId: householdId!, ...input }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats.all });
    }
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.PostUpdated,
      errorMessage: ErrorMessage.PostUpdateFailed
    },
    mutationFn: (input: {
      postId: string;
      userId: string;
      title: string;
      caption: string | null;
      petIds: string[];
      occasionId: string | null;
      photos: PostPhotoInput[];
    }) => PostService.update(input),
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.post.detail(input.postId) });
    }
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.PostDeleted,
      errorMessage: ErrorMessage.PostDeleteFailed
    },
    mutationFn: (postId: string) => PostService.remove(postId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats.all });
    }
  });
}

type PostsPage = { posts: Post[]; nextCursor: PostsCursor | null };
type PostsData = { pages: PostsPage[]; pageParams: unknown[] };

type Client = ReturnType<typeof useQueryClient>;

function writeToEveryList(client: Client, postId: string, apply: (post: Post) => Post) {
  client.setQueriesData<PostsData>({ queryKey: queryKeys.posts.all }, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => (post.id === postId ? apply(post) : post))
          }))
        }
      : old
  );
}

function findCachedPost(client: Client, postId: string): Post | undefined {
  for (const [, data] of client.getQueriesData<PostsData>({ queryKey: queryKeys.posts.all })) {
    for (const page of data?.pages ?? []) {
      const found = page.posts.find((post) => post.id === postId);
      if (found) return found;
    }
  }

  return undefined;
}

// Silent on success and failure: the filled heart is the confirmation, and a
// rollback reads as "it didn't happen" without interrupting anyone.
export function useToggleLike() {
  const queryClient = useQueryClient();
  const { userId, profile } = useAuthStore();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked
        ? PostService.unlike({ postId, userId: userId! })
        : PostService.like({ postId, userId: userId! }),

    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      const detailKey = queryKeys.post.detail(postId);
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<Post>(detailKey);
      const previousPost = findCachedPost(queryClient, postId) ?? previousDetail;

      // An optimistic liker with a placeholder id could never be filtered out.
      if (!userId) return { previousDetail, previousPost };

      const me: PostLiker = {
        userId,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        avatarUrl: profile?.avatarUrl ?? null
      };

      const applyLike = (post: Post): Post => ({
        ...post,
        likedByMe: !liked,
        likeCount: post.likeCount + (liked ? -1 : 1),
        // The count and the "Liked by" line read different fields; moving one
        // alone leaves the card contradicting itself until the next refetch.
        likers: liked
          ? post.likers.filter((liker) => liker.userId !== userId)
          : [...post.likers, me]
      });

      writeToEveryList(queryClient, postId, applyLike);

      // Post Detail reads its own query, so its heart is dead without this.
      queryClient.setQueryData<Post>(detailKey, (old) => (old ? applyLike(old) : old));

      return { previousDetail, previousPost };
    },

    // One post, never a snapshot: a snapshot predates any like still in flight
    // beside this one and would empty a heart that had succeeded.
    onError: (error, input, context) => {
      const restored = context?.previousPost;
      if (restored) writeToEveryList(queryClient, input.postId, () => restored);

      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.post.detail(input.postId), context.previousDetail);
      }
    }
  });
}

// Polls rather than subscribes: Realtime holds a socket against the project's
// connection limit for the life of the session, where one `exists` query a
// minute holds nothing open and stops when the app is backgrounded.
export function useHasUnseenPosts(householdId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.unseenPosts.of(householdId),
    queryFn: () => PostService.hasUnseen(householdId!),
    enabled: Boolean(householdId),
    refetchInterval: 60_000
  });
}

// The tab badge means "any household", not the active one, or posts elsewhere
// stay invisible until you switch. `useQueries` so each household keeps its own
// cache entry and shares it with `useHasUnseenPosts`.
export function useUnseenByHousehold(householdIds: string[]) {
  return useQueries({
    queries: householdIds.map((householdId) => ({
      queryKey: queryKeys.unseenPosts.of(householdId),
      queryFn: () => PostService.hasUnseen(householdId),
      refetchInterval: 60_000
    })),
    combine: (results) => ({
      byHousehold: Object.fromEntries(
        householdIds.map((householdId, index) => [householdId, results[index]?.data ?? false])
      ) as Record<string, boolean>,
      hasAny: results.some((result) => result.data)
    })
  });
}

export function useMarkPostsSeen(householdIds: string[], userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    // One rejected household must not discard the dots that cleared.
    mutationFn: () =>
      Promise.allSettled(
        householdIds.map((householdId) => PostService.markSeen({ householdId, userId: userId! }))
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.unseenPosts.all })
  });
}
