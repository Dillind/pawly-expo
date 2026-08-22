import IconButton from '@/components/core/icon-button';
import BaseModal from '@/components/modals/base-modal';
import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { careCardBlocks } from '@/lib/care-card-view';
import { hapticLight } from '@/lib/haptics';
import { createShadowMedium } from '@/lib/styles/shadows';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import CardBackFace from './card-back-face';
import CardFrontFace from './card-front-face';
import type { TileFrame } from './care-card-tile';
import { CARD_WASH } from './wash';

const MORPH_DURATION_MS = 380;
const FLIP_DURATION_MS = 460;
const CARD_MARGIN = Spacing.four;
const MAX_CARD_HEIGHT = 580;

const countLabel = (count: number, noun: string) => `${count} ${count === 1 ? noun : `${noun}s`}`;

type Props = {
  petName: string;
  petSubtitle: string | null;
  photoUrl: string | null;
  card: CareCard;
  medications: Medication[];
  contacts: CareCardContact[];
  /** Window coordinates of the tile this grows out of. */
  origin: TileFrame;
  isSharing: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onShare: () => void;
  onHelp: () => void;
};

const CareCardOverlay = ({
  petName,
  petSubtitle,
  photoUrl,
  card,
  medications,
  contacts,
  origin,
  isSharing,
  onClose,
  onEdit,
  onShare,
  onHelp
}: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isReducedMotion = useReducedMotion();

  const cardWidth = windowWidth - CARD_MARGIN * 2;
  const cardHeight = Math.min(MAX_CARD_HEIGHT, windowHeight * 0.68);
  const cardTop = (windowHeight - cardHeight) / 2 - Spacing.four;

  const [isFlipped, setIsFlipped] = useState(false);
  const progress = useSharedValue(0);
  const flip = useSharedValue(0);

  const duration = isReducedMotion ? 0 : MORPH_DURATION_MS;

  const close = () => {
    void hapticLight();
    progress.value = withTiming(0, { duration }, (isFinished) => {
      if (isFinished) runOnJS(onClose)();
    });
  };

  // Mirrored in React state because pointerEvents and the accessibility flags
  // are props, not styles, and cannot read a shared value -- without it
  // VoiceOver reads the hidden face.
  const toggleFlip = () => {
    void hapticLight();
    setIsFlipped((current) => !current);
    flip.value = withTiming(flip.value > 0.5 ? 0 : 1, {
      duration: isReducedMotion ? 0 : FLIP_DURATION_MS
    });
  };

  useEffect(() => {
    progress.value = withTiming(1, { duration });
  }, [duration, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    left: interpolate(progress.value, [0, 1], [origin.x, CARD_MARGIN]),
    top: interpolate(progress.value, [0, 1], [origin.y, cardTop]),
    width: interpolate(progress.value, [0, 1], [origin.width, cardWidth]),
    height: interpolate(progress.value, [0, 1], [origin.height, cardHeight]),
    borderRadius: interpolate(progress.value, [0, 1], [Radius.tile, Radius.card])
  }));

  // Held back until the card is nearly full size: text scaled up from tile
  // width reads as a smear.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP)
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value * 180}deg` }]
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 0 : 1,
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value * 180 - 180}deg` }]
  }));

  const dismissStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.7, 1], [0, 1], Extrapolation.CLAMP)
  }));

  const blocks = careCardBlocks(card, medications, contacts);
  // Counted off the blocks, not off the filled field count: a card carrying only
  // medications or contacts has no filled fields but is far from empty, and
  // the medications block is listed on its own rather than as a section.
  const sectionCount = blocks.filter((block) => block.kind !== 'medications').length;
  const summary = blocks.length
    ? [
        sectionCount ? countLabel(sectionCount, 'section') : null,
        medications.length ? countLabel(medications.length, 'medication') : null
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    // Unanimated: the morph below is the animation. The modal still supplies
    // the backdrop, the back button and tap-to-dismiss.
    <BaseModal isVisible variant="bare" hasAnimation={false} onClose={close}>
      <Animated.View style={[styles.card, cardStyle, createShadowMedium(theme.colors)]}>
        <Animated.View
          style={[styles.face, contentStyle, frontStyle]}
          pointerEvents={isFlipped ? 'none' : 'auto'}
          accessibilityElementsHidden={isFlipped}
          importantForAccessibility={isFlipped ? 'no-hide-descendants' : 'auto'}>
          <CardFrontFace
            petName={petName}
            petSubtitle={petSubtitle}
            photoUrl={photoUrl}
            summary={summary}
            isSharing={isSharing}
            isShareDisabled={isSharing || blocks.length === 0}
            onFlip={toggleFlip}
            onEdit={onEdit}
            onShare={onShare}
            onHelp={onHelp}
          />
        </Animated.View>

        <Animated.View
          style={[styles.face, styles.backFace, contentStyle, backStyle]}
          pointerEvents={isFlipped ? 'auto' : 'none'}
          accessibilityElementsHidden={!isFlipped}
          importantForAccessibility={isFlipped ? 'auto' : 'no-hide-descendants'}>
          <CardBackFace petName={petName} blocks={blocks} onFlip={toggleFlip} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[styles.dismiss, { top: cardTop + cardHeight + Spacing.four }, dismissStyle]}>
        <IconButton
          name="close"
          accessibilityLabel="Close the Care Card"
          variant="ghost"
          color="onPrimary"
          containerStyle={styles.dismissButton}
          onPress={close}
        />
      </Animated.View>
    </BaseModal>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    card: {
      position: 'absolute',
      backgroundColor: colors.primary,
      borderCurve: 'continuous',
      overflow: 'hidden'
    },
    face: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      padding: spacing.four,
      gap: spacing.three,
      backfaceVisibility: 'hidden'
    },
    backFace: { gap: spacing.two },
    dismiss: { position: 'absolute', alignSelf: 'center' },
    dismissButton: { backgroundColor: CARD_WASH }
  });

export default CareCardOverlay;
