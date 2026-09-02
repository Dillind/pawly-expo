import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const BADGE_SIZE = 22;

type Props = {
  uri: string;
  size: number;
  accessibilityLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Draws the remove badge. Omit and the tile has none. */
  onRemove?: () => void;
  removeLabel?: string;
};

const PhotoTile = ({
  uri,
  size,
  accessibilityLabel = 'Photo',
  onPress,
  onLongPress,
  onRemove,
  removeLabel = 'Remove photo'
}: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View>
      <Pressable
        accessibilityRole={onPress ? 'button' : 'image'}
        accessibilityLabel={accessibilityLabel}
        disabled={!onPress && !onLongPress}
        onPress={onPress}
        onLongPress={onLongPress}>
        <Image
          source={uri}
          style={[styles.thumbnail, { width: size, height: size }]}
          contentFit="cover"
          transition={200}
        />
      </Pressable>

      {onRemove && (
        <PressableOpacity
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          // Badge is well under the 44pt minimum -- the tile itself is ~60-84pt.
          hitSlop={12}
          style={styles.removeBadge}
          onPress={onRemove}>
          <Icon name="close" size={13} color="background" />
        </PressableOpacity>
      )}
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    thumbnail: {
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    removeBadge: {
      position: 'absolute',
      top: -spacing.one,
      right: -spacing.one,
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.text,
      borderWidth: 1.5,
      borderColor: colors.background
    }
  });

export default PhotoTile;
