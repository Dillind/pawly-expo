import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { IconName } from '@/constants/icon-map';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  isIconAccent?: boolean;
};

// No `illustration` prop yet — there is no artwork to pass it. The value of the component now
// is that when v2 art arrives it is one file to change and every empty state in the app moves
// together.
const EmptyState = ({ icon, title, description, action, isIconAccent = false }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, isIconAccent && styles.iconCircleAccent]}>
        <Icon
          name={icon}
          size={IconSize.feature}
          color={isIconAccent ? 'primaryText' : 'textSecondary'}
        />
      </View>
      <AppText size="title3" fontWeight="bold" align="center">
        {title}
      </AppText>
      {description && (
        <AppText size="subhead" color="textSecondary" align="center">
          {description}
        </AppText>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.two,
      paddingVertical: spacing.six,
      paddingHorizontal: spacing.four
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundElement,
      marginBottom: spacing.two
    },
    iconCircleAccent: {
      backgroundColor: colors.primaryMuted
    },
    action: {
      alignSelf: 'stretch',
      marginTop: spacing.three
    }
  });

export default EmptyState;
