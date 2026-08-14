import AppText from '@/components/core/app-text';
import AvatarInitials from '@/components/core/avatar-initials';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import PetAvatar from '@/components/core/pet-avatar';
import { type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { alertGlyph, alertSentence } from '@/lib/alert-copy';
import { formatRelativeTime } from '@/lib/dates';
import type { Alert } from '@/services/alert.service';
import { StyleSheet, View } from 'react-native';

const AVATAR = 40;

type Props = {
  alert: Alert;
  onPress: () => void;
};

/** A missed feed has no actor, so it shows the pet rather than an empty circle. */
const Leading = ({ alert }: { alert: Alert }) => {
  const [firstName, ...rest] = (alert.actorName ?? '').split(' ');

  if (alert.kind === 'missed_feed') {
    return <PetAvatar photoUrl={null} size={AVATAR} />;
  }

  return (
    <AvatarInitials firstName={firstName || null} lastName={rest.join(' ') || null} size={AVATAR} />
  );
};

const AlertRow = ({ alert, onPress }: Props) => {
  const styles = useStyles(makeStyles);
  const sentence = alertSentence(alert);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={sentence}
      style={[styles.row, !alert.isRead && styles.unread]}
      onPress={onPress}>
      <View>
        <Leading alert={alert} />

        {/* The border in the page colour is what lifts it off the avatar. */}
        <View style={styles.badge}>
          <Icon name={alertGlyph(alert.kind)} size={10} color="onPrimary" />
        </View>
      </View>

      <View style={styles.body}>
        <AppText size={15} numberOfLines={3}>
          {sentence}
        </AppText>

        <AppText size={13} color="textSecondary">
          {formatRelativeTime(alert.createdAt)}
        </AppText>
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.three,
      paddingHorizontal: spacing.four,
      paddingVertical: spacing.three
    },
    // The fill is an unread row's divider, which is why it draws no hairline.
    unread: {
      backgroundColor: colors.primaryMuted
    },
    badge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.background
    },
    body: {
      flex: 1,
      gap: 2
    }
  });

export default AlertRow;
