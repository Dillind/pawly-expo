import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';

type Props = {
  caption: string | null;
  numberOfLines?: number;
  onPress?: () => void;
};

const PostCaption = ({ caption, numberOfLines, onPress }: Props) => {
  if (!caption) return null;

  const text = (
    <AppText size={15} numberOfLines={numberOfLines}>
      {caption}
    </AppText>
  );

  if (!onPress) return text;

  return (
    <PressableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Open post">
      {text}
    </PressableOpacity>
  );
};

export default PostCaption;
