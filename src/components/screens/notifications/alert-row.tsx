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
import { StyleSheet, Text, View } from 'react-native';

const AVATAR = 40;

type Props = {
  alert: Alert;
  onPress: () => void;
};

/**
 * A missed feed has no actor, so it leads with the pet it concerns rather than
 * an empty circle. Everything else leads with whoever did it.
 */
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
  const { lead, rest } = alertSentence(alert);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${lead ?? ''}${rest}`}
      style={[styles.row, !alert.isRead && styles.unread]}
      onPress={onPress}>
      <View>
        <Leading alert={alert} />

        {/* Overhanging badge, the same trick photo-tile.tsx uses for its
            remove button -- the border in the page colour is what makes it
            read as sitting on top of the avatar rather than inside it. */}
        <View style={styles.badge}>
          <Icon name={alertGlyph(alert.kind)} size={10} color="onPrimary" />
        </View>
      </View>

      <View style={styles.body}>
        <AppText size={15} numberOfLines={3}>
          {lead && <Text style={styles.lead}>{lead}</Text>}
          {rest}
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
    // Full-bleed rather than an inset card: the fill is the divider for an
    // unread row, which is why unread rows draw no hairline.
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
    },
    lead: {
      fontWeight: '600'
    }
  });

export default AlertRow;
