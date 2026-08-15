import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import { inviteLink } from '@/constants/invite-link';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const QR_SIZE = 168;

type Props = {
  code: string;
  householdName: string;
};

/**
 * How an invite actually reaches someone: there is no email out, so the owner
 * has to hand this over. The QR only helps if the scanner already has the app,
 * so the typed code and the share sheet sit beside it rather than behind it.
 *
 * Draws no background of its own -- it sits on a card on the invite screen and
 * flush on a sheet from the members list, and a sheet may only use the two
 * sheet tokens.
 */
const InviteCodeCard = ({ code, householdName }: Props) => {
  const styles = useStyles(makeStyles);

  const share = () => {
    void Share.share({
      message: `Join ${householdName} on Crumpet: ${inviteLink(code)}\n\nOr open the app, tap Join a household, and enter ${code}`
    });
  };

  return (
    <View style={styles.card}>
      <AppText size={14} color="textSecondary" align="center">
        Have them scan this, or type the code
      </AppText>

      <View style={styles.qr}>
        {/* The deep link, not the bare code: scanning with the Camera app
            has to offer to open Crumpet, not hand back a meaningless string. */}
        <QRCode value={inviteLink(code)} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
      </View>

      <AppText variant="header" size={30} align="center" style={styles.code}>
        {code}
      </AppText>

      <MainButton text="Share code" variant="secondary" onPress={share} />

      <AppText size={12} color="textSecondary" align="center">
        Expires in 72 hours
      </AppText>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      gap: spacing.three
    },
    // A QR must stay dark-on-light to scan, so it keeps a white plate in both
    // themes rather than inverting with the surface behind it.
    qr: {
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      padding: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous'
    },
    code: {
      letterSpacing: 4
    }
  });

export default InviteCodeCard;
