import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData
} from '@tanstack/react-query';

import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { queryKeys } from '@/lib/query-keys';
import CommentService, { type CommentsCursor, type PostComment } from '@/services/comment.service';
import { useAuthStore } from '@/stores/auth-store';

type CommentPages = InfiniteData<
  { comments: PostComment[]; nextCursor: CommentsCursor | null },
  CommentsCursor | null
>;

export function useComments(postId: string | undefined, viewerId: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: ({ pageParam }) =>
      CommentService.list({
        postId: postId!,
        viewerId: viewerId ?? null,
        cursor: pageParam ?? undefined
      }),
    initialPageParam: null as CommentsCursor | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.comments),
    enabled: Boolean(postId)
  });
}

// No success toast: the comment appearing in the thread is the confirmation.
export function useCreateComment(postId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorMessage: ErrorMessage.CommentPostFailed },
    mutationFn: (input: {
      userId: string;
      body: string;
      parentCommentId?: string | null;
      replyToUserId?: string | null;
    }) => CommentService.create({ postId: postId!, ...input }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      // The count is embedded in the Post's own select, so it rides these.
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.post.detail(postId) });
    }
  });
}

export function useDeleteComment(postId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: {
      successMessage: SuccessMessage.CommentDeleted,
      errorMessage: ErrorMessage.CommentDeleteFailed
    },
    mutationFn: (commentId: string) => CommentService.remove(commentId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.post.detail(postId) });
    }
  });
}

// Optimistic and silent on both sides, matching useToggleLike on a Post.
export function useToggleCommentLike(postId: string | undefined) {
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  return useMutation({
    mutationFn: ({ commentId, liked }: { commentId: string; liked: boolean }) =>
      liked
        ? CommentService.unlike({ commentId, userId: userId! })
        : CommentService.like({ commentId, userId: userId! }),

    onMutate: async ({ commentId, liked }) => {
      const key = queryKeys.comments(postId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<CommentPages>(key);

      // Without an id the write fails RLS, so the heart must not flip.
      if (!userId) return { previous };

      const applyLike = (comment: PostComment): PostComment =>
        comment.id === commentId
          ? {
              ...comment,
              likedByMe: !liked,
              likeCount: comment.likeCount + (liked ? -1 : 1)
            }
          : comment;

      queryClient.setQueryData<CommentPages>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                comments: page.comments.map((comment) => ({
                  ...applyLike(comment),
                  replies: comment.replies.map(applyLike)
                }))
              }))
            }
          : old
      );

      return { previous };
    },

    onError: (error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.comments(postId), context.previous);
      }
    }
  });
}
