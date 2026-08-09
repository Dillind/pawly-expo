import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PostService, { type Post, type PostsCursor } from '@/services/post.service';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const postsKey = (householdId: string) => ['posts', householdId];

/** The Household stream. Cursor on `(occurred_at, id) desc`. */
export function usePosts(householdId: string | undefined) {
  return useInfiniteQuery({
    queryKey: postsKey(householdId ?? ''),
    queryFn: ({ pageParam }) =>
      PostService.list({ householdId: householdId!, cursor: pageParam ?? undefined }),
    initialPageParam: null as PostsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.posts),
    enabled: Boolean(householdId)
  });
}

export function useCreatePost(householdId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      userId: string;
      localUri: string;
      caption?: string | null;
      occurredAt?: string | null;
      petIds?: string[];
    }) => PostService.create({ householdId, ...input }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: postsKey(householdId) }),
    onSuccess: () => showSuccessToast(SuccessMessage.PostShared),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.PostShareFailed);
    }
  });
}

export function useDeletePost(householdId: string) {
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
 * A Like is not an event worth confirming with a toast -- the filled thumb is
 * the confirmation, and a toast per tap in a household of four would be
 * unbearable. A failure rolls the thumb back, which reads as "it didn't
 * happen" without interrupting anyone; the real error still reaches the
 * console.
 */
export function useToggleLike(householdId: string, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      liked
        ? PostService.unlike({ postId, userId: userId! })
        : PostService.like({ postId, userId: userId! }),

    onMutate: async ({ postId, liked }) => {
      const key = postsKey(householdId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<PostsData>(key);

      queryClient.setQueryData<PostsData>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                posts: page.posts.map((post) =>
                  post.id === postId
                    ? {
                        ...post,
                        likedByMe: !liked,
                        likeCount: post.likeCount + (liked ? -1 : 1)
                      }
                    : post
                )
              }))
            }
          : old
      );

      return { previous };
    },

    onError: (error, _input, context) => {
      console.error(error);
      if (context?.previous) {
        queryClient.setQueryData(postsKey(householdId), context.previous);
      }
    },

    // Not onSettled: refetching after every tap would undo the point of the
    // optimistic update. The rollback above is what keeps a failure honest.
    onSuccess: () => {}
  });
}

/**
 * Drives the dot on the Household tab.
 *
 * Polls rather than subscribes: a dot that is a few seconds stale costs
 * nothing, and the push notification is what actually tells someone a post
 * arrived. Realtime here would be a socket per member for a red circle.
 */
export function useHasUnseenPosts(householdId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['posts-unseen', householdId, userId],
    queryFn: () => PostService.hasUnseen({ householdId: householdId!, userId: userId! }),
    enabled: Boolean(householdId && userId),
    refetchInterval: 60_000
  });
}

export function useMarkPostsSeen(householdId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PostService.markSeen({ householdId: householdId!, userId: userId! }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['posts-unseen', householdId, userId] }),
    // Silent by design. Nobody asked for this write; it is a side effect of
    // opening a tab, and a failed one just means the dot lingers.
    onError: (error) => console.error(error)
  });
}
