import AppText from '@/components/core/app-text';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  size?: number;
};

export const toInitials = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const initials = [firstName, lastName]
    .map((part) => part?.trim().charAt(0).toUpperCase() ?? '')
    .join('');

  return initials || '?';
};

const AvatarInitials = ({ firstName, lastName, size = 72 }: Props) => {
  const styles = useStyles(useCallback((theme: AppTheme) => makeStyles(theme, size), [size]));

  return (
    <View style={styles.circle}>
      <AppText variant="header" size={size * 0.36} color="onPrimary">
        {toInitials(firstName, lastName)}
      </AppText>
    </View>
  );
};

const makeStyles = ({ colors }: AppTheme, size: number) =>
  StyleSheet.create({
    circle: {
      width: size,
      height: size,
      borderRadius: Radius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    }
  });

export default AvatarInitials;
