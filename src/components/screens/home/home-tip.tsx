import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { HomeTip as Tip } from '@/utils/home-tip';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

type Props = {
  tip: Tip;
};

/**
 * The quiet card below the tiles. It is only ever rendered when `findHomeTip`
 * found something real, so it has no empty state of its own.
 */
const HomeTip = ({ tip }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  return (
    <PressableOpacity
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${tip.title} ${tip.action}`}
      onPress={() => router.push(`/home/${tip.petId}`)}>
      <Icon name="lightbulb" size={18} color="textSecondary" />
      <View style={styles.copy}>
        <AppText size={14}>{tip.title}</AppText>
        <AppText size={12} color="textSecondary">
          {tip.action}
        </AppText>
      </View>
    </PressableOpacity>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + spacing.one,
      paddingHorizontal: spacing.three,
      paddingVertical: spacing.two + spacing.one,
      borderRadius: Radius.tile + spacing.one,
      backgroundColor: colors.backgroundSelected
    },
    copy: {
      flex: 1,
      gap: 1
    }
  });

export default HomeTip;
