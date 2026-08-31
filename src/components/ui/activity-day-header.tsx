import AppText from '@/components/core/app-text';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { formatDayHeading } from '@/lib/dates';
import { StyleSheet, View } from 'react-native';

type Props = {
  day: string;
  timezone: string;
  /** The first band needs no rule above it — the screen title is already there. */
  isFirst?: boolean;
};

/**
 * The band that names a day. It is painted in the page colour and runs the full
 * width, edge to edge, so a card scrolling under it is covered rather than
 * showing through.
 */
const ActivityDayHeader = ({ day, timezone, isFirst = false }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.header, !isFirst && styles.ruled]}>
      <AppText size={13} fontWeight="bold" color="textSecondary">
        {formatDayHeading(day, timezone)}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    header: {
      paddingVertical: spacing.two,
      paddingHorizontal: ScreenGutter,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    },
    ruled: {
      marginTop: spacing.four,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border
    }
  });

export default ActivityDayHeader;
