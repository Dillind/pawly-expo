import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PetAvatar from '@/components/core/pet-avatar';
import { CardInset, CardPalette, CardPhotoSize, CardRadius } from '@/constants/care-card-palette';
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
    <View style={styles.face}>
      <View style={styles.top}>
        <AppText size={13} fontWeight="semibold" style={styles.ink}>
          Crumpet care card
        </AppText>

        {!isEmpty && (
          <View style={styles.actions}>
            <IconButton
              name="help"
              accessibilityLabel="What is a Care Card?"
              variant="ghost"
              color="onPrimary"
              size={20}
              containerStyle={styles.action}
              onPress={onHelp}
            />
            <IconButton
              name="share"
              accessibilityLabel="Share the Care Card"
              variant="ghost"
              color="onPrimary"
              size={20}
              isLoading={isSharing}
              containerStyle={styles.action}
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
          size={34}
          fontWeight="bold"
          align="center"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.ink}>
          {petName}
        </AppText>

        {petSubtitle && (
          <AppText size={15} align="center" numberOfLines={2} style={styles.ink}>
            {petSubtitle}
          </AppText>
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
          <>
            <View style={styles.emergency}>
              {emergency ? (
                <>
                  <AppText size={13} fontWeight="semibold" style={styles.ink}>
                    {emergency.label}
                  </AppText>
                  <AppText size={22} fontWeight="bold" style={styles.ink}>
                    {emergency.value}
                  </AppText>
                </>
              ) : (
                <AppText size={13} style={styles.ink}>
                  No emergency number on the card yet
                </AppText>
              )}
            </View>

            <IconButton
              name="flip"
              accessibilityLabel="Turn the card over"
              variant="ghost"
              color="onPrimary"
              size={22}
              hapticFeedback={false}
              containerStyle={styles.action}
              onPress={onFlip}
            />
          </>
        )}
      </View>
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    face: {
      flex: 1,
      padding: CardInset,
      borderRadius: CardRadius,
      borderCurve: 'continuous',
      overflow: 'hidden',
      backgroundColor: CardPalette.gold
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
      alignItems: 'center'
    },
    action: {
      minWidth: 40,
      minHeight: 40
    },
    middle: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two
    },
    ring: {
      borderRadius: Radius.full,
      borderWidth: 4,
      borderColor: CardPalette.ring,
      marginBottom: spacing.two
    },
    bottom: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.two
    },
    emergency: {
      flex: 1,
      gap: 1
    },
    fill: {
      flex: 1
    }
  });

export default CardFrontFace;
