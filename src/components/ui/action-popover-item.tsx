import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

const TILE_SIZE = 40;

export type ActionPopoverAction = {
  icon: IconName;
  title: string;
  subtitle?: string;
  href?: Href;
  onPress?: () => void;
  isDisabled?: boolean;
};

/**
 * A secondary row inside an ActionPopover: tinted icon tile, title, subtitle.
 *
 * The tile is `primaryMuted` rather than full `primary` deliberately -- the
 * popover is translucent glass over unpredictable scrolling content, and
 * saturated blocks punch through the material.
 */
const ActionPopoverItem = ({
  icon,
  title,
  subtitle,
  onPress,
  isDisabled = false
}: ActionPopoverAction) => {
  const styles = useStyles(makeStyles);

  const handlePress = () => {
    if (isDisabled) return;
    void hapticLight();
    onPress?.();
  };

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={handlePress}
      style={[styles.row, isDisabled && styles.disabled]}>
      <View style={styles.tile}>
        <Icon name={icon} size={20} color="primary" />
      </View>

      <View style={styles.copy}>
        <AppText size={16} fontWeight="bold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={13} color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two
    },
    disabled: {
      opacity: 0.45
    },
    tile: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: Radius.tile,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryMuted
    },
    copy: {
      flex: 1,
      gap: spacing.half
    }
  });

export default ActionPopoverItem;
