import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { CardPalette, CardRadius, CardRimWidth } from '@/constants/care-card-palette';

const CardRim = ({ children }: { children: ReactNode }) => (
  <LinearGradient
    colors={CardPalette.rimStops}
    start={{ x: 0.15, y: 0 }}
    end={{ x: 0.85, y: 1 }}
    style={styles.rim}>
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  rim: {
    flex: 1,
    padding: CardRimWidth,
    borderRadius: CardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden'
  }
});

export default CardRim;
