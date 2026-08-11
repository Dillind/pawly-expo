import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Props = {
  size: number;
  isBusy?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
};

const AddPhotoTile = ({
  size,
  isBusy = false,
  accessibilityLabel = 'Add a photo',
  onPress
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={isBusy}
      onPress={onPress}>
      <View style={[styles.tile, { width: size, height: size }]}>
        {isBusy ? <ActivityIndicator /> : <Icon name="imagePlus" size={22} color="textSecondary" />}
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    tile: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default AddPhotoTile;
