import { type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { reportError } from '@/lib/sentry';

const RootErrorScreen = ({ error, retry }: ErrorBoundaryProps) => {
  const styles = useStyles(makeStyles);

  useEffect(() => {
    reportError(error);
    void SplashScreen.hideAsync();
  }, [error]);

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Icon name="circleAlert" size={IconSize.feature} color="error" />
        <AppText size="titleMedium" fontWeight="bold" align="center">
          Something went wrong
        </AppText>
        <AppText size="callout" color="textSecondary" align="center">
          Crumpet could not show this screen. Try again, and if it keeps happening, restart the app.
        </AppText>
      </View>
      <MainButton text="Try again" onPress={() => void retry()} />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.five,
      padding: spacing.four,
      backgroundColor: colors.background
    },
    body: {
      alignItems: 'center',
      gap: spacing.two
    }
  });

export default RootErrorScreen;
