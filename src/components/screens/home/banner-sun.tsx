import type { DayPart } from '@/constants/theme';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Stop
} from 'react-native-svg';

type Props = {
  part: DayPart;
  size?: number;
};

/**
 * Four small skies, not four icons.
 *
 * One horizon runs through the three lit states and the light sits at a
 * different height against it, so the mark tells the hour by position rather
 * than by colour alone. Night drops the horizon: at night the ground is gone
 * and the moon carries the frame on its own.
 *
 * The values are tuned per state rather than themed. The mark belongs to the
 * gradient behind it, so it does not follow light or dark mode.
 */
const MARKS = {
  dawn: { bloom: '#F0A81C', rim: '#FFE3B0', core: '#F7B646', land: '#E5A86A' },
  day: { bloom: '#F0A81C', rim: '#FFF0BE', core: '#EFA219', land: '#E9BC8A' },
  dusk: { bloom: '#E8763C', rim: '#FFC489', core: '#E4632C', land: '#B85B47' },
  night: { bloom: '#B9AEE8', rim: '#FFFFFF', core: '#E8E4F6', land: '#000000' }
} as const;

/** A four-point star. Round dots read as dust; points read as a night sky. */
const SPARKLE = 'M0,-1 Q0.16,-0.16 1,0 Q0.16,0.16 0,1 Q-0.16,0.16 -1,0 Q-0.16,-0.16 0,-1 Z';

type StarProps = { x: number; y: number; r: number; fill: string; opacity: number };

const Star = ({ x, y, r, fill, opacity }: StarProps) => (
  <Path d={SPARKLE} fill={fill} opacity={opacity} transform={`translate(${x} ${y}) scale(${r})`} />
);

const BannerSun = ({ part, size = 76 }: Props) => {
  const mark = MARKS[part];
  const isNight = part === 'night';

  // Where the light sits against the horizon, which is the whole point of the
  // mark. Dawn climbs out of it, day clears it, dusk sinks back into it.
  const sun = {
    dawn: { cy: 64, r: 21 },
    day: { cy: 43, r: 20 },
    dusk: { cy: 72, r: 24 },
    night: { cy: 43, r: 20 }
  }[part];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={mark.bloom} stopOpacity="0.34" />
          <Stop offset="0.5" stopColor={mark.bloom} stopOpacity="0.14" />
          <Stop offset="0.78" stopColor={mark.bloom} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="core" cx="42%" cy="36%" r="72%">
          <Stop offset="0" stopColor={mark.rim} />
          <Stop offset="0.5" stopColor={mark.core} />
          <Stop offset="1" stopColor={mark.core} />
        </RadialGradient>
        {/* The horizon has no ends. It fades out before it reaches the edge of
            the box, so the line reads as distance rather than as a rule. */}
        <LinearGradient id="land" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={mark.land} stopOpacity="0" />
          <Stop offset="0.5" stopColor={mark.land} stopOpacity="0.55" />
          <Stop offset="1" stopColor={mark.land} stopOpacity="0" />
        </LinearGradient>
        <ClipPath id="sky">
          <Rect x="0" y="0" width="100" height="66" />
        </ClipPath>
        <Mask id="crescent">
          <Rect x="0" y="0" width="100" height="100" fill="#000000" />
          <Circle cx="50" cy="43" r="20" fill="#FFFFFF" />
          <Circle cx="62" cy="33" r="18" fill="#000000" />
        </Mask>
      </Defs>

      <Circle cx="50" cy={sun.cy - (isNight ? 0 : 4)} r="50" fill="url(#bloom)" />

      {isNight ? (
        <>
          <Circle cx="50" cy="43" r="20" fill="url(#core)" mask="url(#crescent)" />
          <Star x={22} y={26} r={5.5} fill={mark.rim} opacity={0.85} />
          <Star x={78} y={62} r={4} fill={mark.rim} opacity={0.7} />
          <Star x={34} y={76} r={3} fill={mark.rim} opacity={0.5} />
        </>
      ) : (
        <>
          <G clipPath="url(#sky)">
            <Circle cx="50" cy={sun.cy} r={sun.r} fill="url(#core)" />
          </G>
          {/* One first star, only once the sun is going down. */}
          {part === 'dusk' && <Star x={24} y={28} r={4.5} fill={mark.rim} opacity={0.75} />}
          <Rect x="6" y="65" width="88" height="2" rx="1" fill="url(#land)" />
        </>
      )}
    </Svg>
  );
};

export default BannerSun;
