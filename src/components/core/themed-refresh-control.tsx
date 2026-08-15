import { useTheme } from '@/hooks/use-theme';
import { RefreshControl } from 'react-native';

type Props = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

/**
 * The pull control, tinted. It exists because the default spinner has no tint
 * and is near-invisible in dark mode, and a native control cannot read the
 * theme from a StyleSheet.
 *
 * Lists built on MainLegendList never need this -- LegendList takes
 * `onRefresh`/`refreshing` as plain props and draws its own.
 */
const ThemedRefreshControl = ({ isRefreshing, onRefresh }: Props) => {
  const { colors } = useTheme();

  return (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={colors.textSecondary}
    />
  );
};

export default ThemedRefreshControl;
