import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { SplashPalette } from '@/constants/theme';

export type PetKind = 'dog' | 'cat';

type Props = {
  kind: PetKind;
  size: number;
  fur: string;
};

/**
 * A placeholder head, not a breed. Two silhouettes carry "dog" and "cat" at
 * 30pt; anything finer than an ear shape is lost at this size and wants real
 * art. See the TODO in animated-splash.tsx.
 */
const PetHead = ({ kind, size, fur }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    {kind === 'cat' ? (
      <>
        <Path d="M22 52 L20 20 L48 38 Z" fill={fur} />
        <Path d="M78 52 L80 20 L52 38 Z" fill={fur} />
      </>
    ) : (
      <>
        <Ellipse cx={13} cy={52} rx={13} ry={26} fill={fur} />
        <Ellipse cx={87} cy={52} rx={13} ry={26} fill={fur} />
      </>
    )}

    <Circle cx={50} cy={62} r={34} fill={fur} />
    <Circle cx={38} cy={56} r={5} fill={SplashPalette.furInk} />
    <Circle cx={62} cy={56} r={5} fill={SplashPalette.furInk} />
    <Ellipse cx={50} cy={74} rx={7} ry={5} fill={SplashPalette.furInk} />
  </Svg>
);

export default PetHead;
