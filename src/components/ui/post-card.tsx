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

/**
 * A post in the feed. Flat on the page background with no frame of its own:
 * the photo runs to both screen edges, so a card with padding and a radius
 * would be a border drawn around a picture that has already left it.
 */
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
