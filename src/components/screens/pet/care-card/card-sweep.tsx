import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CardPalette } from '@/constants/care-card-palette';

const PATHS = {
  front: 'M350 406 C 350 494 282 566 200 566 L 350 566 Z',
  back: 'M0 406 C 0 494 68 566 150 566 L 0 566 Z'
} as const;

type Props = {
  face?: keyof typeof PATHS;
  fill?: string;
};

const CardSweep = ({ face = 'front', fill = CardPalette.sweep }: Props) => (
  <Svg
    viewBox="0 0 350 566"
    preserveAspectRatio="none"
    pointerEvents="none"
    style={StyleSheet.absoluteFill}>
    <Path d={PATHS[face]} fill={fill} />
  </Svg>
);

export default CardSweep;
