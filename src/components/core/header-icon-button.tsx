import IconButton from '@/components/core/icon-button';
import type { IconName } from '@/constants/icon-map';
import type { ThemeColor } from '@/constants/theme';
import { StyleSheet } from 'react-native';

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

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 40,
    minWidth: 36,
    minHeight: 40
  }
});

export default HeaderIconButton;
