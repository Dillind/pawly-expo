import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
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
 * The fallback path, for anyone the email cannot reach — most often someone
 * who signed in with Apple's Hide My Email, where the address on the account
 * is a relay and will never match an invite.
 *
 * The QR only helps when the scanner already has the app, so the typed code
 * and the share sheet sit alongside it rather than behind it.
 */
const InviteCodeCard = ({ code, householdName }: Props) => {
  const styles = useStyles(makeStyles);

  const share = () => {
    void Share.share({
      message: `Join ${householdName} on Crumpet. Open the app, tap Join a household, and enter ${code}`
    });
  };

  return (
    <View style={styles.card}>
      <AppText size={14} color="textSecondary" align="center">
        Or have them scan this, or type the code
      </AppText>

      <View style={styles.qr}>
        <QRCode value={code} size={QR_SIZE} backgroundColor="#FFFFFF" color="#000000" />
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

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      padding: spacing.four,
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
