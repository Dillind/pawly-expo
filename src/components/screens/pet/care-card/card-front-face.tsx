import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import CrumpetMark from '@/components/core/crumpet-mark';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PetAvatar from '@/components/core/pet-avatar';
import CardNumber from '@/components/screens/pet/care-card/card-number';
import CardRim from '@/components/screens/pet/care-card/card-rim';
import CardSweep from '@/components/screens/pet/care-card/card-sweep';
import {
  CardFaceRadius,
  CardFlipBottom,
  CardFlipInset,
  CardGradientEnd,
  CardGradientStart,
  CardInset,
  CardPalette,
  CardPhotoSize
} from '@/constants/care-card-palette';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardRow } from '@/lib/care-card-view';

type Props = {
  petName: string;
  petSubtitle: string | null;
  photoUrl: string | null;
  numbers: CareCardRow[];
  isEmpty: boolean;
  isOwner: boolean;
  isSharing: boolean;
  onHelp: () => void;
  onShare: () => void;
  onFlip: () => void;
  onFill: () => void;
  onCall: (number: CareCardRow) => void;
};

// Ink is full-opacity `onGold` throughout. Hierarchy is size and weight only --
// a faded gold label failed contrast at every opacity that read as quiet.
const CardFrontFace = ({
  petName,
  petSubtitle,
  photoUrl,
  numbers,
  isEmpty,
  isOwner,
  isSharing,
  onHelp,
  onShare,
  onFlip,
  onFill,
  onCall
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <CardRim>
      <LinearGradient
        colors={CardPalette.goldStops}
        start={CardGradientStart}
        end={CardGradientEnd}
        style={styles.face}>
        <CardSweep />

        <View style={styles.top}>
          <CrumpetMark size={30} fill={CardPalette.onGold} holeFill={CardPalette.gold} />

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

          {numbers.length > 0 && (
            <View style={styles.numbers}>
              {numbers.map((number) => (
                <CardNumber key={number.id} number={number} onCall={onCall} />
              ))}
            </View>
          )}
        </View>

        {isEmpty && isOwner && (
          <MainButton
            text="Fill in the card"
            variant="secondary"
            containerStyle={styles.fill}
            onPress={onFill}
          />
        )}

        {isEmpty && !isOwner && (
          <AppText size={14} fontWeight="semibold" align="center" style={styles.ink}>
            Not filled in yet
          </AppText>
        )}

        {!isEmpty && (
          <IconButton
            name="turnOver"
            accessibilityLabel="Turn the card over"
            variant="ghost"
            color="onPrimary"
            size={20}
            hapticFeedback={false}
            containerStyle={styles.flip}
            onPress={onFlip}
          />
        )}
      </LinearGradient>
    </CardRim>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    face: {
      flex: 1,
      padding: CardInset,
      borderRadius: CardFaceRadius,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    ink: {
      color: CardPalette.onGold
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
    numbers: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.five,
      marginTop: spacing.four
    },
    flip: {
      position: 'absolute',
      right: CardFlipInset,
      bottom: CardFlipBottom,
      width: 44,
      height: 44,
      minWidth: 44,
      minHeight: 44
    },
    fill: {
      alignSelf: 'stretch'
    }
  });

export default CardFrontFace;
