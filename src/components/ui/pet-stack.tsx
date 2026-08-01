import Icon from '@/components/core/icon';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import type { Pet } from '@/types/core';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring
} from 'react-native-reanimated';

const MAX_CARDS = 3;
const SPREAD_DEGREES = 12;
const SPREAD_X = 42;
// Outer cards ride lower than the middle one. Rotation alone reads as a skewed
// row; the dip is what makes it a hand of cards.
const DIP_Y = 8;

// Module scope on purpose, matching TileGrid: the cards deal out once per app
// launch, not every time Home regains focus.
let hasDealt = false;

type CardProps = {
  pet: Pet;
  index: number;
  count: number;
  shouldAnimate: boolean;
};

const PetCard = ({ pet, index, count, shouldAnimate }: CardProps) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  // Fan outwards from the centre, so an odd count keeps a card upright in the
  // middle and an even one splits evenly either side.
  const offset = index - (count - 1) / 2;
  const rotation = offset * SPREAD_DEGREES;
  const translateX = offset * SPREAD_X;
  const dip = Math.abs(offset) * DIP_Y;

  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) return;

    progress.value = withDelay(index * 90, withSpring(1, { damping: 13, stiffness: 110 }));
  }, [index, progress, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: translateX * progress.value },
      { translateY: dip * progress.value + (1 - progress.value) * 16 },
      { rotate: `${rotation * progress.value}deg` },
      { scale: 0.9 + 0.1 * progress.value }
    ]
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        // The middle card sits on top and the outer ones tuck behind it, which
        // is what makes the fan read as a stack rather than three loose cards.
        { zIndex: count - Math.abs(offset) },
        createShadowMedium(theme.colors),
        animatedStyle
      ]}>
      {pet.photoUrl ? (
        <Image source={pet.photoUrl} style={styles.photo} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="pawPrint" size={20} color="primary" />
        </View>
      )}
    </Animated.View>
  );
};

type Props = {
  pets: Pet[];
};

const PetStack = ({ pets }: Props) => {
  const styles = useStyles(makeStyles);
  const isReduced = useReducedMotion();
  const shouldAnimate = !hasDealt && !isReduced;

  useEffect(() => {
    hasDealt = true;
  }, []);

  const visible = pets.slice(0, MAX_CARDS);

  return (
    <View style={styles.stack}>
      {visible.map((pet, index) => (
        <PetCard
          key={pet.id}
          pet={pet}
          index={index}
          count={visible.length}
          shouldAnimate={shouldAnimate}
        />
      ))}
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    stack: {
      height: 96,
      alignItems: 'center',
      justifyContent: 'center'
    },
    card: {
      position: 'absolute',
      width: 66,
      height: 88,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      borderWidth: 2,
      borderColor: colors.backgroundElement,
      backgroundColor: colors.backgroundSelected,
      overflow: 'hidden'
    },
    photo: {
      width: '100%',
      height: '100%'
    },
    placeholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryMuted
    }
  });

export default PetStack;
