import AppText from '@/components/core/app-text';
import { StyleSheet } from 'react-native';

type Props = {
  emoji: string;
  /** Matches the pet avatar it stands in for. */
  size?: number;
};

/**
 * The emoji in a chip stands exactly where a Pet's avatar stands, which is the
 * whole of what makes the two read as one row.
 */
const OccasionEmoji = ({ emoji, size = 20 }: Props) => (
  <AppText size={size - 4} style={[styles.glyph, { width: size, height: size, lineHeight: size }]}>
    {emoji}
  </AppText>
);

const styles = StyleSheet.create({
  glyph: {
    textAlign: 'center'
  }
});

export default OccasionEmoji;
