import AppText from '@/components/core/app-text';
import Divider from '@/components/core/divider';
import ListCard from '@/components/core/list-card';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBlock } from '@/lib/care-card-view';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

const ROW_INSET = 16;

type Props = { blocks: CareCardBlock[] };

/**
 * The card's contents as a page reads them: one labelled section per row, the
 * label quiet above the words that matter.
 *
 * Separate from `CareCardBlocks`, which draws the same data as loose blocks for
 * the editor's review step. This one is the handover document.
 */
const CareCardSections = ({ blocks }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <ListCard>
      {blocks.map((block, index) => (
        <Fragment key={block.id}>
          {index > 0 && <Divider inset={ROW_INSET} />}

          <View style={styles.section}>
            <AppText size={13} fontWeight="bold" color="textSecondary">
              {block.title}
            </AppText>

            {block.kind === 'medications'
              ? block.items.map((medication) => (
                  <View key={medication.id} style={styles.entry}>
                    <AppText size={15}>{medication.name}</AppText>
                    {medication.detail && (
                      <AppText size={13} color="textSecondary">
                        {medication.detail}
                      </AppText>
                    )}
                    {medication.instructions && (
                      <AppText size={13} color="textSecondary">
                        {medication.instructions}
                      </AppText>
                    )}
                  </View>
                ))
              : block.rows.map((row) => (
                  <View key={row.id} style={styles.entry}>
                    <AppText size={13} color="textSecondary">
                      {row.label}
                    </AppText>
                    <AppText size={15}>{row.value}</AppText>
                  </View>
                ))}
          </View>
        </Fragment>
      ))}
    </ListCard>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    section: { padding: spacing.three, gap: spacing.one },
    entry: { gap: 1 }
  });

export default CareCardSections;
