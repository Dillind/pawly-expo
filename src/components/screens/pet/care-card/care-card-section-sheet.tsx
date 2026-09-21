import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import CareCardBlocks from '@/components/screens/pet/care-card/care-card-blocks';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBlock } from '@/lib/care-card-view';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  block: CareCardBlock | null;
  onDismiss: () => void;
};

const isBlockEmpty = (block: CareCardBlock) =>
  block.kind === 'medications' ? block.items.length === 0 : block.rows.length === 0;

const CareCardSectionSheet = ({ sheetRef, block, onDismiss }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <BaseSheet sheetRef={sheetRef} title={block?.title} detents={['auto']} onDismiss={onDismiss}>
      <View style={styles.body}>
        {block && isBlockEmpty(block) ? (
          <AppText color="textSecondary" size={15}>
            Nothing here yet.
          </AppText>
        ) : (
          block && <CareCardBlocks blocks={[block]} isTitled={false} />
        )}
      </View>
    </BaseSheet>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    body: {
      gap: spacing.three,
      paddingBottom: spacing.four
    }
  });

export default CareCardSectionSheet;
