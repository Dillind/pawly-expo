import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CardPalette } from '@/constants/care-card-palette';

// The corner sweep. A real membership card is printed, and a printed card has
// one shape that is not information -- it is what stops the face reading as a
// coloured rectangle. Drawn in the card's own 350x566 space and stretched with
// it, so the curve keeps its proportion at any size.
const CardSweep = () => (
  <Svg
    viewBox="0 0 350 566"
    preserveAspectRatio="none"
    pointerEvents="none"
    style={StyleSheet.absoluteFill}>
    <Path d="M350 430 C 322 482 296 518 276 566 L 350 566 Z" fill={CardPalette.sweep} />
  </Svg>
);

export default CardSweep;
