import PostBody from '@/components/ui/post-body';
import type { Post } from '@/services/post.service';

type Props = {
  post: Post;
  showActions: boolean;
  householdName?: string;
  onToggleLike: () => void;
  onOpenActions: () => void;
  onOpen: () => void;
};

const TITLE_LINES = 2;
const CAPTION_LINES = 2;

/** No frame of its own: a radius drawn around a photo that already left it reads as a mistake. */
const PostCard = ({
  post,
  showActions,
  householdName,
  onToggleLike,
  onOpenActions,
  onOpen
}: Props) => (
  <PostBody
    post={post}
    showActions={showActions}
    householdName={householdName}
    titleLines={TITLE_LINES}
    captionLines={CAPTION_LINES}
    onToggleLike={onToggleLike}
    onOpenActions={onOpenActions}
    onOpen={onOpen}
  />
);

export default PostCard;
