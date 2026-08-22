import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import CommentService, { type PostComment } from '@/services/comment.service';
import { useAuthStore } from '@/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const commentsKey = (postId: string | undefined) => ['comments', postId];

/** Sorted, for the same reason postsKey is: order must not fetch a second time. */
const countsKey = (postIds: string[]) => ['comment-counts', [...postIds].sort()];

export function useComments(postId: string | undefined, viewerId: string | undefined) {
  return useQuery({
    queryKey: commentsKey(postId),
    queryFn: () => CommentService.list({ postId: postId!, viewerId: viewerId ?? null }),
    enabled: Boolean(postId)
  });
}

/**
 * One request for every card on screen rather than one per card. The stream is
 * already paginated, so the id list is bounded by the page size.
 */
export function useCommentCounts(postIds: string[]) {
  return useQuery({
    queryKey: countsKey(postIds),
    queryFn: () => CommentService.countsByPost(postIds),
    enabled: postIds.length > 0,
    // A stale count reads as a wrong number beside the icon, and the query is
    // one cheap select -- but it must not refetch on every scroll frame.
    staleTime: 30_000
  });
}

/**
 * No success toast, deliberately.
 *
 * The comment appearing at the bottom of the thread IS the confirmation, and a
 * toast on top of that is the app congratulating itself for doing the one thing
 * the button said it would do. The same reasoning keeps useToggleLike silent.
 */
export function useCreateComment(postId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      userId: string;
      body: string;
      parentCommentId?: string | null;
      replyToUserId?: string | null;
    }) => CommentService.create({ postId: postId!, ...input }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(postId) });
      void queryClient.invalidateQueries({ queryKey: ['comment-counts'] });
    },
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.CommentPostFailed);
    }
  });
}

export function useDeleteComment(postId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => CommentService.remove(commentId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: commentsKey(postId) });
      void queryClient.invalidateQueries({ queryKey: ['comment-counts'] });
    },
    onSuccess: () => showSuccessToast(SuccessMessage.CommentDeleted),
    onError: (error) => {
      console.error(error);
      showErrorToast(ErrorMessage.CommentDeleteFailed);
    }
  });
}

/**
 * Optimistic and silent on both sides, matching useToggleLike on a Post: the
 * filled thumb is the confirmation, and a rollback reads as "it didn't happen"
 * without interrupting anyone. The real error still reaches the console.
 */
export function useToggleCommentLike(postId: string | undefined) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: string; liked: boolean }) =>
      liked
        ? CommentService.unlike({ commentId, userId: userId! })
        : CommentService.like({ commentId, userId: userId! }),

    onMutate: async ({ commentId, liked }) => {
      const key = commentsKey(postId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<PostComment[]>(key);

      const applyLike = (comment: PostComment): PostComment =>
        comment.id === commentId
          ? {
              ...comment,
              likedByMe: !liked,
              likeCount: comment.likeCount + (liked ? -1 : 1)
            }
          : comment;

      // Both levels: the tapped thumb may be on a reply, and the tree is only
      // ever two deep so this needs no recursion.
      queryClient.setQueryData<PostComment[]>(key, (old) =>
        old?.map((comment) => ({
          ...applyLike(comment),
          replies: comment.replies.map(applyLike)
        }))
      );

      return { previous };
    },

    onError: (error, _input, context) => {
      console.error(error);

      if (context?.previous) {
        queryClient.setQueryData(commentsKey(postId), context.previous);
      }
    }
  });
}
