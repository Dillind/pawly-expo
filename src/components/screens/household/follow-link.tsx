import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import ListCard from '@/components/core/list-card';
import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { followLink } from '@/constants/follow-link';
import { BottomTabInset, Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useStyles } from '@/hooks/use-styles';

const QR_SIZE = 168;

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

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <ListCard style={styles.card}>
          <AppText size={14} color="textSecondary" align="center">
            Have them scan this, or send the link
          </AppText>

          {/* A QR must stay dark on light to scan, so it keeps a white plate in
              both themes rather than inverting with the surface behind it. */}
          <View style={styles.qr}>
            <QRCode value={link} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
          </View>

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

const makeStyles = ({ spacing }: AppTheme) =>
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
      backgroundColor: '#FFFFFF',
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous'
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
