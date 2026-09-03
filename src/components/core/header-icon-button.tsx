import { StyleSheet } from 'react-native';

import IconButton from '@/components/core/icon-button';
import type { IconName } from '@/constants/icon-map';
import type { ThemeColor } from '@/constants/theme';

const HEADER_GLYPH_SIZE = 28;
const HEADER_GLYPH_STROKE = 1.8;

type Props = {
  name: IconName;
  accessibilityLabel: string;
  color?: ThemeColor;
  size?: number;
  strokeWidth?: number;
  onPress?: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
};

const HeaderIconButton = ({
  name,
  accessibilityLabel,
  color,
  size = HEADER_GLYPH_SIZE,
  strokeWidth = HEADER_GLYPH_STROKE,
  onPress,
  ...state
}: Props) => (
  <IconButton
    name={name}
    accessibilityLabel={accessibilityLabel}
    variant="ghost"
    color={color}
    size={size}
    strokeWidth={strokeWidth}
    containerStyle={styles.container}
    onPress={onPress}
    {...state}
  />
);

// Matched to the native back button, measured on the simulator. iOS fits its
// glass circle to the view it is given and the bar adds ~4pt horizontally, so
// 36 wide comes out 40 round. The minimums are restated or IconButton's 44pt
// square wins and the circle becomes a capsule.
const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 40,
    minWidth: 36,
    minHeight: 40
  }
});

export default HeaderIconButton;
