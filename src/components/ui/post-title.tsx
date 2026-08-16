import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';

type Props = {
  /** Null on Posts made before titles existed, which render without one. */
  title: string | null;
  numberOfLines?: number;
  onPress?: () => void;
};

const PostTitle = ({ title, numberOfLines, onPress }: Props) => {
  if (!title) return null;

  const text = (
    <AppText size={17} fontWeight="bold" numberOfLines={numberOfLines}>
      {title}
    </AppText>
  );

  if (!onPress) return text;

  return (
    <PressableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Open post">
      {text}
    </PressableOpacity>
  );
};

export default PostTitle;
