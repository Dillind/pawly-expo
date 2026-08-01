import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import TileArtwork, { type TileArt } from '@/components/ui/tile-art';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import type { IconName } from '@/constants/icon-map';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { createShadowMedium } from '@/lib/styles/shadows';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  label: string;
  icon: IconName;
  href: string;
  art?: TileArt;
};

const Tile = ({ label, icon, href, art }: Props) => {
  const router = useRouter();
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <PressableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.navigate(href as Href)}
      style={[styles.container, createShadowMedium(theme.colors)]}>
      {art ? (
        <TileArtwork art={art} />
      ) : (
        <View style={styles.iconWell}>
          <Icon name={icon} size={20} color="primary" />
        </View>
      )}

      <AppText variant="header" size={16}>
        {label}
      </AppText>
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
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center'
    }
  });

export default Tile;
