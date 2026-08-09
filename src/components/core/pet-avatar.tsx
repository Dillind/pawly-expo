import Icon from '@/components/core/icon';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { Image } from 'expo-image';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  photoUrl?: string | null;
  size: number;
};

const PetAvatar = ({ photoUrl, size }: Props) => {
  const styles = useStyles(useCallback((theme: AppTheme) => makeStyles(theme, size), [size]));

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />;
  }

  return (
    <View style={[styles.avatar, styles.fallback]}>
      <Icon name="pawPrint" size={Math.round(size * 0.5)} color="textSecondary" />
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme, size: number) =>
  StyleSheet.create({
    avatar: {
      width: size,
      height: size,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center'
    },
    fallback: {
      backgroundColor: colors.backgroundSelected
    }
  });

export default PetAvatar;
