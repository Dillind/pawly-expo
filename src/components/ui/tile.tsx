import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  label: string;
  subtitle?: string;
  icon: IconName;
  href: string;
};

const Tile = ({ label, subtitle, icon, href }: Props) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      onPress={() => router.navigate(href as Href)}
      style={[styles.container, createShadowMedium(theme.colors)]}>
      <View style={styles.iconWell}>
        <Icon name={icon} size={22} color="text" />
      </View>

      <View style={styles.labels}>
        <AppText variant="header" size={16}>
          {label}
        </AppText>
        {subtitle && (
          <AppText size={13} color="textSecondary">
            {subtitle}
          </AppText>
        )}
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 120,
      padding: spacing.three,
      gap: spacing.three,
      borderRadius: Radius.card,
      backgroundColor: colors.backgroundElement,
      justifyContent: 'space-between'
    },
    iconWell: {
      width: 40,
      height: 40,
      borderRadius: Radius.tile,
      // Not colors.background -- that is pure black in dark mode, so the well
      // reads as a hole punched through the tile.
      backgroundColor: colors.backgroundSelected,
      alignItems: 'center',
      justifyContent: 'center'
    },
    labels: {
      gap: 2
    }
  });

export default Tile;
