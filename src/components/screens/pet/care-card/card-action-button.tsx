import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { IconName } from '@/constants/icon-map';
import type { FontWeight } from '@/types/core';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { CARD_WASH } from './wash';

type Props = {
  text: string;
  accessibilityLabel: string;
  variant: 'solid' | 'ghost';
  icon?: IconName;
  fontWeight?: FontWeight;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
};

// Not MainButton: its `secondary` variant is drawn in `error` and `primary` is
// the card's own colour, so both variants vanish or misread on a teal card.
const CardActionButton = ({
  text,
  accessibilityLabel,
  variant,
  icon,
  fontWeight = 'regular',
  isLoading = false,
  isDisabled = false,
  onPress
}: Props) => {
  const styles = useStyles(makeStyles);
  const theme = useTheme();

  const isSolid = variant === 'solid';
  const labelColor = isSolid ? 'primary' : 'onPrimary';

  return (
    <PressableOpacity
      style={[styles.button, isSolid ? styles.solid : styles.ghost, isDisabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled || isLoading}
      onPress={onPress}>
      {isLoading ? (
        <ActivityIndicator color={isSolid ? theme.colors.primary : theme.colors.onPrimary} />
      ) : (
        <>
          {icon && <Icon name={icon} size={16} color={labelColor} />}
          <AppText color={labelColor} size={16} fontWeight={fontWeight}>
            {text}
          </AppText>
        </>
      )}
    </PressableOpacity>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.one,
      height: 46,
      borderRadius: Radius.full
    },
    solid: { backgroundColor: colors.onPrimary },
    ghost: { backgroundColor: CARD_WASH },
    disabled: { opacity: 0.5 }
  });

export default CardActionButton;
