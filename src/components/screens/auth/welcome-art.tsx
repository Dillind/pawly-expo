import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import CrumpetField, { type CrumpetSpec } from '@/components/screens/auth/crumpet-field';

// TODO(CRU-030): placeholder stock art, Lottie Simple License -- replace with a commissioned hero.
// https://lottiefiles.com/free-animation/camping-with-my-best-friend-VM4yBTHTr1

const ART_HEIGHT = 320;

const SCENE_SIZE = '88%';

// Tuned to this exact Lottie: over the scene's gold the disc vanishes. Re-check if art changes.
const CRUMPETS: CrumpetSpec[] = [
  { left: '3%', top: '5%', size: 30, travelPt: 7, spinDeg: 3, durationMs: 5200, delayMs: 0 },
  { left: '85%', top: '2%', size: 20, travelPt: 5, spinDeg: -3, durationMs: 6400, delayMs: 90 },
  { left: '2%', top: '83%', size: 18, travelPt: 6, spinDeg: -2, durationMs: 5800, delayMs: 180 },
  { left: '88%', top: '77%', size: 25, travelPt: 8, spinDeg: 2, durationMs: 7000, delayMs: 270 }
];

const WelcomeArt = () => {
  const isReducedMotion = useReducedMotion();

  return (
    <View style={styles.art}>
      <LottieView
        source={require('@/assets/animations/welcome.json')}
        autoPlay={!isReducedMotion}
        loop={!isReducedMotion}
        // Mid-loop, not frame 0 -- a loop often starts from nothing.
        {...(isReducedMotion && { progress: 0.5 })}
        resizeMode="contain"
        style={styles.lottie}
      />

      <CrumpetField crumpets={CRUMPETS} style={StyleSheet.absoluteFill} />
    </View>
  );
};

const styles = StyleSheet.create({
  art: {
    height: ART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lottie: {
    width: SCENE_SIZE,
    height: SCENE_SIZE
  }
});

export default WelcomeArt;
