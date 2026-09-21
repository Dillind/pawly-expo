import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CardPalette } from '@/constants/care-card-palette';

// The corner sweep. A real membership card is printed, and a printed card has
// one shape that is not information -- it is what stops the face reading as a
// coloured rectangle. One arc of a single radius, so the curve stays even from
// the right edge to the bottom edge. Drawn in the card's own 350x566 space and
// stretched with it, so the proportion holds at any size.
const CardSweep = () => (
  <Svg
    viewBox="0 0 350 566"
    preserveAspectRatio="none"
    pointerEvents="none"
    style={StyleSheet.absoluteFill}>
    <Path d="M350 372 C 350 479 279 566 172 566 L 350 566 Z" fill={CardPalette.sweep} />
  </Svg>
);

export default CardSweep;
