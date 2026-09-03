import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import DriftingCrumpet, { type CrumpetSpec } from '@/components/screens/auth/drifting-crumpet';

// A fixed band rather than a share of the screen: the buttons below it are a
// fixed height too, so a percentage would collide with them on a short phone.
const BAND_HEIGHT = 44;

const CRUMPETS: CrumpetSpec[] = [
  { left: '14%', top: 6, size: 22, travel: 6, spin: -3, duration: 6100, delay: 360 },
  { left: '73%', top: 14, size: 16, travel: 5, spin: 3, duration: 5400, delay: 450 }
];

const CrumpetBand = () => {
  const isStill = useReducedMotion();

  return (
    // Never tappable: a crumpet must not eat a press meant for the button below.
    <View style={styles.band} pointerEvents="none">
      {CRUMPETS.map((crumpet) => (
        <DriftingCrumpet key={`${crumpet.left}`} {...crumpet} isStill={isStill} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  band: {
    height: BAND_HEIGHT
  }
});

export default CrumpetBand;
