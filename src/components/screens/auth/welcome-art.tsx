import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import DriftingCrumpet, { type CrumpetSpec } from '@/components/screens/auth/drifting-crumpet';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

// TODO(CRU-030): stock art under the Lottie Simple License, not Crumpet's own.
// It is a placeholder for a commissioned hero and must not outlive one. The
// crumpets around it are ours.
// https://lottiefiles.com/free-animation/camping-with-my-best-friend-VM4yBTHTr1

const ART_HEIGHT = 320;

// Leaves the corners free for the crumpets.
const SCENE_INSET = '88%';

// Corners only, and clear of the scene. The mark is `primary`, so a crumpet
// over the scene's gold blob loses its disc and shows nothing but holes.
const CRUMPETS: CrumpetSpec[] = [
  { left: '3%', top: '5%', size: 30, travel: 7, spin: 3, duration: 5200, delay: 0 },
  { left: '85%', top: '2%', size: 20, travel: 5, spin: -3, duration: 6400, delay: 90 },
  { left: '2%', top: '83%', size: 18, travel: 6, spin: -2, duration: 5800, delay: 180 },
  { left: '88%', top: '77%', size: 25, travel: 8, spin: 2, duration: 7000, delay: 270 }
];

const WelcomeArt = () => {
  const styles = useStyles(makeStyles);
  const isReducedMotion = useReducedMotion();

  return (
    <View style={styles.art}>
      <LottieView
        source={require('@/assets/animations/welcome.json')}
        autoPlay={!isReducedMotion}
        progress={isReducedMotion ? 0.5 : undefined}
        loop={!isReducedMotion}
        resizeMode="contain"
        style={styles.lottie}
      />

      {CRUMPETS.map((crumpet) => (
        <DriftingCrumpet
          key={`${crumpet.left}-${crumpet.top}`}
          {...crumpet}
          isStill={isReducedMotion}
        />
      ))}
    </View>
  );
};

const makeStyles = (_theme: AppTheme) =>
  StyleSheet.create({
    art: {
      height: ART_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center'
    },
    lottie: {
      width: SCENE_INSET,
      height: SCENE_INSET
    }
  });

export default WelcomeArt;
