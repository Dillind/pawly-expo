import Icon from '@/components/core/icon';
import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
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

const MAX_AVATARS = 3;
const AVATAR = 44;
// Negative, so each avatar tucks behind the one before it.
const OVERLAP = -12;

// Module scope on purpose, matching TileGrid: the avatars slide out once per
// app launch, not every time Home regains focus.
let hasDealt = false;

type AvatarProps = {
  pet: Pet;
  index: number;
  shouldAnimate: boolean;
};

const PetAvatar = ({ pet, index, shouldAnimate }: AvatarProps) => {
  const styles = useStyles(makeStyles);
  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) return;

    progress.value = withDelay(index * 80, withSpring(1, { damping: 14, stiffness: 130 }));
  }, [index, progress, shouldAnimate]);

  // Each avatar slides out from behind the one before it, so the row assembles
  // left to right rather than appearing all at once.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * -14 }, { scale: 0.8 + 0.2 * progress.value }]
  }));

  return (
    <Animated.View style={[styles.avatar, index > 0 && { marginLeft: OVERLAP }, animatedStyle]}>
      {pet.photoUrl ? (
        <Image source={pet.photoUrl} style={styles.photo} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="pawPrint" size={18} color="primary" />
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

  const visible = pets.slice(0, MAX_AVATARS);
  const overflow = pets.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((pet, index) => (
        <PetAvatar key={pet.id} pet={pet} index={index} shouldAnimate={shouldAnimate} />
      ))}

      {overflow > 0 && (
        <View style={[styles.avatar, styles.overflow, { marginLeft: OVERLAP }]}>
          <AppText size={13} color="textSecondary">
            +{overflow}
          </AppText>
        </View>
      )}
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
      width: AVATAR,
      height: AVATAR,
      borderRadius: Radius.full,
      borderWidth: 2,
      borderColor: colors.backgroundElement,
      backgroundColor: colors.backgroundSelected,
      overflow: 'hidden'
    },
    photo: { width: '100%', height: '100%' },
    placeholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryMuted
    },
    overflow: { alignItems: 'center', justifyContent: 'center' }
  });

export default PetStack;
