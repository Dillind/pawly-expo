import ThemedRefreshControl from '@/components/core/themed-refresh-control';
import { ScreenGutter } from '@/constants/theme';
import { ScrollView, type ScrollViewProps } from 'react-native';

type Props = ScrollViewProps & {
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

/**
 * A screen's scroller, with the gutter on its content container.
 *
 * This is where the horizontal padding belongs: on the content, not on the
 * frame. The scroll view itself stays edge to edge, so the scroll indicator sits
 * where iOS puts it and a child that wants to be full-bleed only has to opt out
 * of this component rather than fight a parent's padding with negative margins.
 */
const ScreenScrollView = ({ contentContainerStyle, onRefresh, isRefreshing, ...rest }: Props) => (
  <ScrollView
    {...rest}
    refreshControl={
      onRefresh ? (
        <ThemedRefreshControl isRefreshing={isRefreshing ?? false} onRefresh={onRefresh} />
      ) : undefined
    }
    contentContainerStyle={[{ paddingHorizontal: ScreenGutter }, contentContainerStyle]}
  />
);

export default ScreenScrollView;
