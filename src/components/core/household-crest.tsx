import { StyleSheet, View } from 'react-native';

import Icon from '@/components/core/icon';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  size: number;
  /** Overrides the default half-of-size glyph where a site was drawn to a different ratio. */
  iconSize?: number;
};

/**
 * A Household has no photo, so it is drawn as a paw on a filled circle. The
 * same mark at three sizes -- the filter sheet, the Following list and the
 * follow landing screen -- so it stays one mark when a Household gains a photo.
 */
const HouseholdCrest = ({ size, iconSize }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.crest, { width: size, height: size }]}>
      <Icon name="pawPrint" size={iconSize ?? Math.round(size * 0.5)} color="textSecondary" />
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    crest: {
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    }
  });

export default HouseholdCrest;
