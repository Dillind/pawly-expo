import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import PostService, { type Post, type PostsCursor } from '@/services/post.service';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const postsKey = (householdId: string | undefined) => ['posts', householdId];

/** The Household stream. Cursor on `(occurred_at, id) desc`. */
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

export function useCreatePost(householdId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      userId: string;
      localUri: string;
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
 * A Like is not an event worth confirming with a toast -- the filled thumb is
 * the confirmation, and a toast per tap in a household of four would be
 * unbearable. A failure rolls the thumb back, which reads as "it didn't
 * happen" without interrupting anyone; the real error still reaches the
 * console.
 */
export function useToggleLike(householdId: string | undefined, userId: string | undefined) {
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
    }
    // Deliberately no onSettled: refetching after every tap would undo the
    // point of the optimistic update. The rollback above keeps a failure honest.
  });
}

/**
 * Drives the dot on the Household tab.
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

export function useMarkPostsSeen(householdId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PostService.markSeen({ householdId: householdId!, userId: userId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts-unseen', householdId] }),
    // Silent by design. Nobody asked for this write; it is a side effect of
    // opening a tab, and a failed one just means the dot lingers.
    onError: (error) => console.error(error)
  });
}
