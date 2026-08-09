import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { StyleSheet, View } from 'react-native';

const ROW_HEIGHT = 44;

type Props = {
  icon: IconName;
  label: string;
  /** Right-hand value, e.g. the current appearance or an email address. */
  value?: string;
  /** Renders a Soon pill instead of a chevron, and makes the row inert. */
  isSoon?: boolean;
  isDestructive?: boolean;
  onPress?: () => void;
};

const SettingsRow = ({ icon, label, value, isSoon, isDestructive, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  const isPressable = Boolean(onPress) && !isSoon;
  const tone = isSoon ? 'textSecondary' : isDestructive ? 'error' : 'text';

  const body = (
    <View style={styles.row}>
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
          {value !== undefined && (
            <AppText size={14} color="textSecondary" numberOfLines={1} style={styles.value}>
              {value}
            </AppText>
          )}
          {isPressable && !isDestructive && (
            <Icon name="caretRight" size={16} color="textSecondary" />
          )}
        </>
      )}
    </View>
  );

  if (!isPressable) return body;

  return (
    <PressableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
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
