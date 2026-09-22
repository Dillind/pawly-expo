import { useRouter, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';

type Props = {
  label: string;
  icon: IconName;
  href: string;
};

const Tile = ({ label, icon, href }: Props) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.navigate(href as Href)}
      style={[styles.container, createShadowMedium(theme.colors)]}>
      <Icon name={icon} size={IconSize.action} color="text" />

      <AppText variant="header" size="body" numberOfLines={1}>
        {label}
      </AppText>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + spacing.one,
      paddingHorizontal: spacing.three,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default Tile;
