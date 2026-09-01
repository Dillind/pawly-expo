import type { DayPart } from '@/constants/theme';
import Svg, { Circle, Defs, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  part: DayPart;
  size?: number;
};

// Three stops per state: the outer bloom, the mid ring, the core. They are not
// theme tokens -- the mark belongs to the gradient behind it, so it is tuned
// per banner state rather than per light or dark mode.
const MARKS = {
  dawn: { bloom: '#F0A81C', mid: '#FFD9A0', core: '#F5A93A' },
  day: { bloom: '#F0A81C', mid: '#FFE9A8', core: '#EFA219' },
  dusk: { bloom: '#E8763C', mid: '#FFD2A0', core: '#E8763C' },
  night: { bloom: '#C9C2E8', mid: '#F4F1FC', core: '#E8E4F6' }
} as const;

/**
 * The banner's time-of-day mark: soft concentric rings that read as part of
 * the wash, not an icon sitting on top of it. Night is a crescent, because a
 * disc at night reads as a full moon every night of the month.
 */
const BannerSun = ({ part, size = 76 }: Props) => {
  const mark = MARKS[part];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={mark.bloom} stopOpacity="0.20" />
          <Stop offset="0.55" stopColor={mark.bloom} stopOpacity="0.10" />
          <Stop offset="0.72" stopColor={mark.bloom} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="mid" cx="50%" cy="48%" r="50%">
          <Stop offset="0" stopColor={mark.bloom} stopOpacity="0.42" />
          <Stop offset="0.6" stopColor={mark.bloom} stopOpacity="0.22" />
          <Stop offset="1" stopColor={mark.bloom} stopOpacity="0.04" />
        </RadialGradient>
        <RadialGradient id="core" cx="46%" cy="42%" r="62%">
          <Stop offset="0" stopColor={mark.mid} />
          <Stop offset="0.55" stopColor={mark.core} />
          <Stop offset="1" stopColor={mark.core} />
        </RadialGradient>
        <Mask id="crescent">
          <Rect x="0" y="0" width="100" height="100" fill="#000000" />
          <Circle cx="50" cy="50" r="27" fill="#FFFFFF" />
          <Circle cx="64" cy="41" r="24" fill="#000000" />
        </Mask>
      </Defs>

      <Circle cx="50" cy="50" r="50" fill="url(#bloom)" />
      <Circle cx="50" cy="50" r="38" fill="url(#mid)" />
      {part === 'night' ? (
        <Circle cx="50" cy="50" r="27" fill="url(#core)" mask="url(#crescent)" />
      ) : (
        <Circle cx="50" cy="50" r="27" fill="url(#core)" />
      )}
    </Svg>
  );
};

export default BannerSun;
