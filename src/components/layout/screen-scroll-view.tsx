import { ScrollView, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import ThemedRefreshControl from '@/components/core/themed-refresh-control';
import { ScreenGutter } from '@/constants/theme';

type Props = ScrollViewProps & {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // KeyboardProvider is already at the root, so this is the whole opt-in.
  isKeyboardAware?: boolean;
};

// The gutter belongs on the content, not the frame: the scroll view stays edge
// to edge, so the indicator sits where iOS puts it.
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
