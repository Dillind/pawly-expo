import { StyleSheet } from 'react-native';

import CrumpetField, { type CrumpetSpec } from '@/components/screens/auth/crumpet-field';

// Fixed, not a percentage: the fixed-height buttons below would collide on a short phone.
const BAND_HEIGHT = 44;

const CRUMPETS: CrumpetSpec[] = [
  { left: '14%', top: 6, size: 22, travelPt: 6, spinDeg: -3, durationMs: 6100, delayMs: 360 },
  { left: '73%', top: 14, size: 16, travelPt: 5, spinDeg: 3, durationMs: 5400, delayMs: 450 }
];

const CrumpetBand = () => <CrumpetField crumpets={CRUMPETS} style={styles.band} />;

const styles = StyleSheet.create({
  band: {
    height: BAND_HEIGHT
  }
});

export default CrumpetBand;
