import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  eyebrow: string;
  action: ReactNode;
};

const CardFaceHeader = ({ eyebrow, action }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.row}>
      <View style={styles.label}>
        <Icon name="pawPrint" size={13} color="onPrimary" />
        <AppText color="onPrimary" size={11} style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      </View>
      {action}
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { flexDirection: 'row', alignItems: 'center', gap: spacing.one },
    eyebrow: { letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.8 }
  });

export default CardFaceHeader;
