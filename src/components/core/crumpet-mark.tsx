import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

// Redrawn from assets/images/icon.png. Holes are hand-placed: random reads as noise at 20pt.
const HOLES = [
  { cx: 36, cy: 32, r: 7 },
  { cx: 60, cy: 26, r: 5 },
  { cx: 72, cy: 44, r: 8 },
  { cx: 30, cy: 54, r: 6 },
  { cx: 50, cy: 50, r: 5.5 },
  { cx: 44, cy: 72, r: 7 },
  { cx: 66, cy: 68, r: 6 },
  { cx: 24, cy: 42, r: 3.5 },
  { cx: 56, cy: 84, r: 4 }
] as const;

type Props = {
  size?: number;
};

const CrumpetMark = ({ size = 24 }: Props) => {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={46} fill={colors.primary} />
      {HOLES.map((hole) => (
        <Circle key={`${hole.cx}-${hole.cy}`} {...hole} fill={colors.background} />
      ))}
    </Svg>
  );
};

export default CrumpetMark;
