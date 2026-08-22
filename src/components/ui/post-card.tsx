import PostBody from '@/components/ui/post-body';
import type { Post } from '@/services/post.service';

type Props = {
  post: Post;
  showActions: boolean;
  householdName?: string;
  commentCount: number;
  onToggleLike: () => void;
  onOpenActions: () => void;
  onOpen: () => void;
  onOpenComments: () => void;
};

const TITLE_LINES = 2;
const CAPTION_LINES = 2;

const PostCard = ({
  post,
  showActions,
  householdName,
  commentCount,
  onToggleLike,
  onOpenActions,
  onOpen,
  onOpenComments
}: Props) => (
  <PostBody
    post={post}
    showActions={showActions}
    householdName={householdName}
    titleLines={TITLE_LINES}
    captionLines={CAPTION_LINES}
    commentCount={commentCount}
    onToggleLike={onToggleLike}
    onOpenActions={onOpenActions}
    onOpen={onOpen}
    onOpenComments={onOpenComments}
  />
);

export default PostCard;
