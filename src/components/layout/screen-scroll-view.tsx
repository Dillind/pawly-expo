import { ScreenGutter } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RefreshControl, ScrollView, type ScrollViewProps } from 'react-native';

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
 *
 * The refresh control is built here rather than by the call site because its
 * tint has to be themed -- the default spinner is near-invisible in dark mode.
 */
const ScreenScrollView = ({ contentContainerStyle, onRefresh, isRefreshing, ...rest }: Props) => {
  const { colors } = useTheme();

  return (
    <ScrollView
      {...rest}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
          />
        ) : undefined
      }
      contentContainerStyle={[{ paddingHorizontal: ScreenGutter }, contentContainerStyle]}
    />
  );
};

export default ScreenScrollView;
