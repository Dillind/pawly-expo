import { RefreshControl } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

// The default spinner has no tint and is near-invisible in dark mode, and a
// native control cannot read the theme from a StyleSheet. Lists built on
// MainLegendList never need this: LegendList draws its own.
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
