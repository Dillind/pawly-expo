import { Image } from 'expo-image';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import Icon from '@/components/core/icon';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  photoUrl: string | null;
  size?: number;
};

const PetAvatar = ({ photoUrl, size = 40 }: Props) => {
  const styles = useStyles(useCallback((theme: AppTheme) => makeStyles(theme, size), [size]));

  if (!photoUrl) {
    return (
      <View style={[styles.avatar, styles.placeholder]}>
        <Icon name="pawPrint" size={size * 0.45} color="textSecondary" />
      </View>
    );
  }

  return (
    <Image source={photoUrl} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
  );
};

const makeStyles = ({ colors }: AppTheme, size: number) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected
    },
    placeholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected
    }
  });

export default PetAvatar;
