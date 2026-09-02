import AppText from '@/components/core/app-text';
import { Radius, type AppTheme, type ThemeColor } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBlock } from '@/lib/care-card-view';
import { StyleSheet, View } from 'react-native';

import { CARD_WASH_STRONG } from './wash';

/** `onCard` must draw from the card's own foreground; `onPage` uses the theme. */
export type BlockTone = 'onCard' | 'onPage';

const TONE: Record<BlockTone, { text: ThemeColor; label: ThemeColor }> = {
  onCard: { text: 'onPrimary', label: 'onPrimary' },
  onPage: { text: 'text', label: 'textSecondary' }
};

type Props = {
  blocks: CareCardBlock[];
  tone: BlockTone;
};

const CareCardBlocks = ({ blocks, tone }: Props) => {
  const styles = useStyles(makeStyles);
  const colors = TONE[tone];

  return (
    <>
      {blocks.map((block) => (
        <View
          key={block.id}
          style={[
            styles.block,
            tone === 'onCard' && block.kind === 'fields' && block.isEmergency && styles.panel
          ]}>
          <AppText color={colors.label} size={11} style={styles.blockTitle}>
            {block.title}
          </AppText>

          {block.kind === 'medications'
            ? block.items.map((medication) => (
                <View key={medication.id} style={styles.row}>
                  <AppText color={colors.text} size={15}>
                    {medication.name}
                  </AppText>
                  {medication.detail && (
                    <AppText color={colors.label} size={13} style={styles.detail}>
                      {medication.detail}
                    </AppText>
                  )}
                  {medication.instructions && (
                    <AppText color={colors.label} size={13} style={styles.detail}>
                      {medication.instructions}
                    </AppText>
                  )}
                </View>
              ))
            : block.rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <AppText color={colors.label} size={11} style={styles.rowLabel}>
                    {row.label}
                  </AppText>
                  <AppText color={colors.text} size={15}>
                    {row.value}
                  </AppText>
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
    // Mirrors the panel the PDF draws at the top of the page.
    panel: {
      backgroundColor: CARD_WASH_STRONG,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      padding: spacing.three
    },
    blockTitle: {
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      opacity: 0.8
    },
    row: {
      gap: 1
    },
    rowLabel: {
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      opacity: 0.7
    },
    detail: {
      opacity: 0.8
    }
  });

export default CareCardBlocks;
