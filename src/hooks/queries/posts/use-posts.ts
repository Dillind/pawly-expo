import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PostService, {
  type Post,
  type PostLiker,
  type PostPhotoInput,
  type PostsCursor
} from '@/services/post.service';
import { useAuthStore } from '@/stores/auth-store';
import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

const postsKey = (householdId: string | undefined) => ['posts', householdId];

export function usePosts(householdId: string | undefined, viewerId: string | undefined) {
  return useInfiniteQuery({
    queryKey: postsKey(householdId),
    queryFn: ({ pageParam }) =>
      PostService.list({
        householdId: householdId!,
        viewerId: viewerId ?? null,
        cursor: pageParam ?? undefined
      }),
    initialPageParam: null as PostsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.posts),
    enabled: Boolean(householdId)
  });
}

/** One post, for the edit screen. Its own query so the route survives a cold start. */
export function usePost(postId: string | undefined, viewerId: string | undefined) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => PostService.get({ postId: postId!, viewerId: viewerId ?? null }),
    enabled: Boolean(postId)
  });
}

export function useCreatePost(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      userId: string;
      localUris: string[];
      title: string;
      caption?: string | null;
      petIds?: string[];
    }) => PostService.create({ householdId: householdId!, ...input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: postsKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.PostShared),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PostShareFailed);
    }
  });
}

export function useUpdatePost(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      postId: string;
      userId: string;
      title: string;
      caption: string | null;
      petIds: string[];
      photos: PostPhotoInput[];
    }) => PostService.update(input),
    onSettled: (_data, _error, input) => {
      void queryClient.invalidateQueries({ queryKey: postsKey(householdId) });
      void queryClient.invalidateQueries({ queryKey: ['post', input.postId] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.PostUpdated),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PostUpdateFailed);
    }
  });
}

export function useDeletePost(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => PostService.remove(postId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: postsKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.PostDeleted),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PostDeleteFailed);
    }
  });
}

type PostsPage = { posts: Post[]; nextCursor: PostsCursor | null };
type PostsData = { pages: PostsPage[]; pageParams: unknown[] };

/**
 * Optimistic, and deliberately silent on both success and failure.
 *
 * A Like is not an event worth confirming with a toast -- the filled heart is
 * the confirmation, and a toast per tap in a household of four would be
 * unbearable. A failure rolls the heart back, which reads as "it didn't
 * happen" without interrupting anyone; the real error still reaches the
 * console.
 */
export function useToggleLike(householdId: string | undefined) {
  const queryClient = useQueryClient();
  const { userId, profile } = useAuthStore();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked
        ? PostService.unlike({ postId, userId: userId! })
        : PostService.like({ postId, userId: userId! }),

    onMutate: async ({ postId, liked }) => {
      const key = postsKey(householdId);
      await queryClient.cancelQueries({ queryKey: key });

      const detailKey = ['post', postId];
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previous = queryClient.getQueryData<PostsData>(key);
      const previousDetail = queryClient.getQueryData<Post>(detailKey);

      // The mutation itself cannot run without an id, and an optimistic liker
      // carrying a placeholder one could never be filtered back out.
      if (!userId) return { previous, previousDetail };

      const me: PostLiker = {
        userId,
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null
      };

      const applyLike = (post: Post): Post => ({
        ...post,
        likedByMe: !liked,
        likeCount: post.likeCount + (liked ? -1 : 1),
        // The count and the "Liked by" line read from different fields; moving
        // one without the other leaves the card contradicting itself until the
        // next refetch.
        likers: liked
          ? post.likers.filter((liker) => liker.userId !== userId)
          : [...post.likers, me]
      });

      queryClient.setQueryData<PostsData>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                posts: page.posts.map((post) => (post.id === postId ? applyLike(post) : post))
              }))
            }
          : old
      );

      // Post Detail reads its own query, so the heart there is dead without this.
      queryClient.setQueryData<Post>(detailKey, (old) => (old ? applyLike(old) : old));

      return { previous, previousDetail };
    },

    onError: (error, input, context) => {
      console.error(error);
      if (context?.previous) {
        queryClient.setQueryData(postsKey(householdId), context.previous);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(['post', input.postId], context.previousDetail);
      }
    }
  });
}

/**
 * Drives the dot on the Posts tab.
 *
 * Polls rather than subscribes, and that is the cheaper option on the client,
 * not the lazier one. Supabase Realtime is a WebSocket held open for the life
 * of the session with periodic heartbeats, and it counts against the project's
 * concurrent-connection limit. One `exists` query a minute costs a request that
 * returns a boolean, holds nothing open, and stops dead when the app is
 * backgrounded. A socket kept alive to deliver a red circle is the more
 * expensive of the two.
 *
 * The push notification is what actually tells someone a post arrived. This
 * only decides whether a dot is showing when they happen to be looking.
 */
export function useHasUnseenPosts(householdId: string | undefined) {
  return useQuery({
    queryKey: ['posts-unseen', householdId],
    queryFn: () => PostService.hasUnseen(householdId!),
    enabled: Boolean(householdId),
    refetchInterval: 60_000
  });
}

/**
 * The same yes/no for several households at once, keyed by household id.
 *
 * Feeds two surfaces from one set of queries: the dot on each switcher row, and
 * the tab badge, which means "any household" rather than the active one --
 * otherwise posts in the other households are invisible until you happen to
 * switch. `useQueries` rather than one call so each household keeps its own
 * cache entry and shares it with `useHasUnseenPosts`.
 */
export function useUnseenByHousehold(householdIds: string[]) {
  return useQueries({
    queries: householdIds.map((householdId) => ({
      queryKey: ['posts-unseen', householdId],
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

export function useMarkPostsSeen(householdId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PostService.markSeen({ householdId: householdId!, userId: userId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts-unseen', householdId] }),
    onError: (error) => console.error(error)
  });
}
