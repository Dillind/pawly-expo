import { ScrollView, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import ThemedRefreshControl from '@/components/core/themed-refresh-control';
import { ScreenGutter } from '@/constants/theme';

type Props = ScrollViewProps & {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /**
   * Lifts the content clear of the keyboard. KeyboardProvider is already at the
   * root, so this is the whole opt-in — a form should never hand-roll a
   * KeyboardAvoidingView beside it.
   */
  isKeyboardAware?: boolean;
};

/**
 * A screen's scroller, with the gutter on its content container.
 *
 * This is where the horizontal padding belongs: on the content, not on the
 * frame. The scroll view itself stays edge to edge, so the scroll indicator sits
 * where iOS puts it and a child that wants to be full-bleed only has to opt out
 * of this component rather than fight a parent's padding with negative margins.
 */
const ScreenScrollView = ({
  contentContainerStyle,
  onRefresh,
  isRefreshing,
  isKeyboardAware = false,
  ...rest
}: Props) => {
  const Scroller = isKeyboardAware ? KeyboardAwareScrollView : ScrollView;

  return (
    <Scroller
      {...rest}
      refreshControl={
        onRefresh ? (
          <ThemedRefreshControl isRefreshing={isRefreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
      contentContainerStyle={[{ paddingHorizontal: ScreenGutter }, contentContainerStyle]}
    />
  );
};

export default ScreenScrollView;
