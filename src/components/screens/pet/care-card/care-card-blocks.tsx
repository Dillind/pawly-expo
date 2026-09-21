import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBlock } from '@/lib/care-card-view';

type Props = {
  blocks: CareCardBlock[];
  isTitled?: boolean;
};

const CareCardBlocks = ({ blocks, isTitled = true }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <>
      {blocks.map((block) => (
        <View key={block.id} style={styles.block}>
          {isTitled && (
            <AppText color="textSecondary" size={11} style={styles.blockTitle}>
              {block.title}
            </AppText>
          )}

          {block.kind === 'medications'
            ? block.items.map((medication) => (
                <View key={medication.id} style={styles.row}>
                  <AppText size={15}>{medication.name}</AppText>
                  {medication.detail && (
                    <AppText color="textSecondary" size={13}>
                      {medication.detail}
                    </AppText>
                  )}
                  {medication.instructions && (
                    <AppText color="textSecondary" size={13}>
                      {medication.instructions}
                    </AppText>
                  )}
                </View>
              ))
            : block.rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <AppText color="textSecondary" size={11} style={styles.rowLabel}>
                    {row.label}
                  </AppText>
                  <AppText size={15}>{row.value}</AppText>
                </View>
              ))}
        </View>
      ))}
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    block: {
      gap: spacing.two
    },
    blockTitle: {
      letterSpacing: 1.4,
      textTransform: 'uppercase'
    },
    row: {
      gap: 1
    },
    rowLabel: {
      letterSpacing: 1.1,
      textTransform: 'uppercase'
    }
  });

export default CareCardBlocks;
