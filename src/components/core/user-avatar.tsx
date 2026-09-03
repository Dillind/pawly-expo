import { Image } from 'expo-image';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import AvatarInitials from '@/components/core/avatar-initials';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  avatarUrl?: string | null;
  size?: number;
};

const UserAvatar = ({ firstName, lastName, avatarUrl, size = 72 }: Props) => {
  const styles = useStyles(useCallback((theme: AppTheme) => makeStyles(theme, size), [size]));

  if (!avatarUrl) return <AvatarInitials firstName={firstName} lastName={lastName} size={size} />;

  return <Image source={avatarUrl} style={styles.photo} contentFit="cover" transition={200} />;
};

const makeStyles = ({ colors }: AppTheme, size: number) =>
  StyleSheet.create({
    photo: {
      width: size,
      height: size,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundElement
    }
  });

export default UserAvatar;
