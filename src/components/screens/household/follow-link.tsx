import * as Clipboard from 'expo-clipboard';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { SuccessMessage } from '@/constants/enums';
import { followLink } from '@/constants/follow-link';
import { BottomTabInset, Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useStyles } from '@/hooks/use-styles';
import { hapticLight } from '@/lib/haptics';
import { showSuccessToast } from '@/lib/toast';

const QR_SIZE = 168;

// A QR must stay dark on light to scan, so the plate is a fixed white in both
// themes rather than a theme token that inverts with the surface behind it.
const QR_PLATE = '#FFFFFF';
const QR_INK = '#000000';

type Props = {
  householdId: string;
};

/**
 * The only way anyone finds a household. There is no search: a search over
 * household names would leak the existence of private households.
 */
const FollowLink = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);

  const { data: household } = useHouseholdById(householdId);
  const link = followLink(householdId);
  const name = household?.name ?? 'our household';

  const share = () => {
    void Share.share({
      message: `Follow ${name} on Crumpet: ${link}`
    });
  };

  // The link is read as well as scanned -- someone sending it in a message
  // needs the string itself, and the share sheet is a longer way round.
  const copy = () => {
    hapticLight();
    void Clipboard.setStringAsync(link);
    showSuccessToast(SuccessMessage.FollowLinkCopied);
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <ListCard style={styles.card}>
          <AppText size={14} color="textSecondary" align="center">
            Have them scan this, or send the link
          </AppText>

          <View style={styles.qr}>
            <QRCode value={link} size={QR_SIZE} backgroundColor={QR_PLATE} color={QR_INK} />
          </View>

          <PressableOpacity
            accessibilityRole="button"
            accessibilityLabel="Copy the follow link"
            onPress={copy}>
            <View style={styles.linkRow}>
              <AppText size={14} numberOfLines={1} ellipsizeMode="middle" style={styles.linkText}>
                {link}
              </AppText>
              <Icon name="copy" size={18} color="primary" />
            </View>
          </PressableOpacity>

          <MainButton
            text="Share link"
            variant="secondary"
            leftIcon={<Icon name="share" size={18} color="text" />}
            onPress={share}
          />
        </ListCard>

        <View style={styles.notes}>
          <View style={styles.note}>
            <Icon name="lock" size={16} color="textSecondary" />
            <AppText size={13} color="textSecondary" style={styles.noteText}>
              Anyone with the link can ask to follow. You accept each request yourself, so the link
              gives nothing away on its own.
            </AppText>
          </View>
          <View style={styles.note}>
            <Icon name="hourglass" size={16} color="textSecondary" />
            <AppText size={13} color="textSecondary" style={styles.noteText}>
              It does not expire. An invite code does, because it hands over a seat.
            </AppText>
          </View>
        </View>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: ScreenGutter,
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    },
    card: {
      padding: spacing.four,
      gap: spacing.three
    },
    qr: {
      alignSelf: 'center',
      backgroundColor: QR_PLATE,
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous'
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      minHeight: 44,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    linkText: {
      flex: 1
    },
    notes: {
      gap: spacing.three
    },
    note: {
      flexDirection: 'row',
      gap: spacing.two,
      paddingHorizontal: spacing.one
    },
    noteText: {
      flex: 1
    }
  });

export default FollowLink;
