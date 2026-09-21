import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PetAvatar from '@/components/core/pet-avatar';
import {
  CardGradientEnd,
  CardGradientStart,
  CardInset,
  CardPalette,
  CardPhotoSize,
  CardRadius
} from '@/constants/care-card-palette';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  petName: string;
  petSubtitle: string | null;
  photoUrl: string | null;
  emergency: { label: string; value: string } | null;
  isEmpty: boolean;
  isSharing: boolean;
  onHelp: () => void;
  onShare: () => void;
  onFlip: () => void;
  onFill: () => void;
};

// Ink is full-opacity `onGold` throughout. Hierarchy is size and weight only --
// a faded gold label failed contrast at every opacity that read as quiet.
const CardFrontFace = ({
  petName,
  petSubtitle,
  photoUrl,
  emergency,
  isEmpty,
  isSharing,
  onHelp,
  onShare,
  onFlip,
  onFill
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <LinearGradient
      colors={CardPalette.goldStops}
      start={CardGradientStart}
      end={CardGradientEnd}
      style={styles.face}>
      <View style={styles.top}>
        <AppText size={13} fontWeight="semibold" style={styles.ink}>
          Care card
        </AppText>

        {!isEmpty && (
          <View style={styles.actions}>
            <IconButton
              name="help"
              accessibilityLabel="What is a Care Card?"
              variant="ghost"
              color="onPrimary"
              size={19}
              containerStyle={styles.pill}
              onPress={onHelp}
            />
            <IconButton
              name="share"
              accessibilityLabel="Share the Care Card"
              variant="ghost"
              color="onPrimary"
              size={19}
              isLoading={isSharing}
              containerStyle={styles.pill}
              onPress={onShare}
            />
          </View>
        )}
      </View>

      <View style={styles.middle}>
        <View style={styles.ring}>
          <PetAvatar photoUrl={photoUrl} size={CardPhotoSize} />
        </View>

        <AppText
          variant="header"
          size={36}
          fontWeight="bold"
          align="center"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.ink}>
          {petName}
        </AppText>

        {petSubtitle && (
          <AppText
            size={14}
            fontWeight="semibold"
            align="center"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.ink}>
            {petSubtitle}
          </AppText>
        )}

        {!isEmpty && emergency && (
          <View style={styles.emergency}>
            <AppText size={11} fontWeight="bold" align="center" style={[styles.ink, styles.label]}>
              {emergency.label}
            </AppText>
            <View style={styles.number}>
              <Icon name="phone" size={17} color="onPrimary" />
              <AppText size={21} fontWeight="bold" style={styles.ink}>
                {emergency.value}
              </AppText>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        {isEmpty ? (
          <MainButton
            text="Fill in the card"
            variant="secondary"
            containerStyle={styles.fill}
            onPress={onFill}
          />
        ) : (
          <IconButton
            name="turnOver"
            accessibilityLabel="Turn the card over"
            variant="ghost"
            color="onPrimary"
            size={20}
            hapticFeedback={false}
            containerStyle={styles.pill}
            onPress={onFlip}
          />
        )}
      </View>
    </LinearGradient>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    face: {
      flex: 1,
      padding: CardInset,
      borderRadius: CardRadius,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    ink: {
      color: CardPalette.onGold
    },
    // The one place the card shouts. Letter-spaced small caps, the way a
    // membership number is set on a real card.
    label: {
      letterSpacing: 1.1,
      textTransform: 'uppercase'
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.two
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    // Bare glyphs on gold read as printing rather than as controls.
    pill: {
      width: 38,
      height: 38,
      minWidth: 38,
      minHeight: 38,
      borderRadius: Radius.full,
      backgroundColor: CardPalette.pill
    },
    middle: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one
    },
    ring: {
      borderRadius: Radius.full,
      borderWidth: 4,
      borderColor: CardPalette.ring,
      marginBottom: spacing.three
    },
    emergency: {
      alignItems: 'center',
      gap: spacing.half,
      marginTop: spacing.four
    },
    number: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    bottom: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'flex-end'
    },
    fill: {
      flex: 1
    }
  });

export default CardFrontFace;
