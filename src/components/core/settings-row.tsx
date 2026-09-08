import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const ROW_HEIGHT = 44;

export type SettingsRowVariant = 'default' | 'destructive';

type Props = {
  icon: IconName;
  label: string;
  /** Right-hand value, e.g. the current appearance or an email address. */
  value?: string | null;
  /** What the row is. Orthogonal to `isSoon`, which is whether it works yet. */
  variant?: SettingsRowVariant;
  isSoon?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
};

const SettingsRow = ({
  icon,
  label,
  value,
  variant = 'default',
  isSoon,
  isDisabled,
  onPress
}: Props) => {
  const styles = useStyles(makeStyles);

  const isDestructive = variant === 'destructive';
  const isPressable = Boolean(onPress) && !isSoon && !isDisabled;
  const tone = isDestructive ? 'error' : isSoon ? 'textSecondary' : 'text';

  const readingLabel = [label, isSoon ? 'coming soon' : value].filter(Boolean).join(', ');

  const body = (
    <View style={[styles.row, isDisabled && styles.disabled]}>
      <Icon name={icon} size={18} color={isDestructive ? 'error' : 'textSecondary'} />
      <AppText size={16} color={tone} style={styles.label} numberOfLines={1}>
        {label}
      </AppText>

      {isSoon ? (
        <View style={styles.soon}>
          <AppText size={11} color="textSecondary">
            Soon
          </AppText>
        </View>
      ) : (
        <>
          {value && (
            <AppText size={14} color="textSecondary" numberOfLines={1} style={styles.value}>
              {value}
            </AppText>
          )}
          {/* A destructive row acts in place, so a chevron would promise a screen. */}
          {isPressable && !isDestructive && (
            <Icon name="caretRight" size={16} color="textSecondary" />
          )}
        </>
      )}
    </View>
  );

  // Not a button, so it needs its own grouping: without this VoiceOver reads
  // the label and the value as two unrelated stops, and a Contributor is never
  // told the row is a value rather than a control.
  if (!isPressable) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={readingLabel}>
        {body}
      </View>
    );
  }

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={readingLabel}
      onPress={onPress}>
      {body}
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      minHeight: ROW_HEIGHT,
      paddingHorizontal: spacing.three
    },
    disabled: {
      opacity: 0.5
    },
    label: {
      flex: 1
    },
    value: {
      flexShrink: 1,
      maxWidth: '55%'
    },
    soon: {
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.half,
      borderRadius: Radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.textSecondary
    }
  });

export default SettingsRow;
