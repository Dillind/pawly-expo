import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { CareCardBlock } from '@/lib/care-card-view';
import { ScrollView, StyleSheet } from 'react-native';

import CardFaceHeader from './card-face-header';
import CareCardBlocks from './care-card-blocks';

type Props = {
  petName: string;
  blocks: CareCardBlock[];
  onFlip: () => void;
};

const CardBackFace = ({ petName, blocks, onFlip }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <>
      <CardFaceHeader
        eyebrow={petName}
        action={
          <PressableOpacity
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to the front of the card"
            onPress={onFlip}>
            <Icon name="caretLeft" size={14} color="onPrimary" />
            <AppText color="onPrimary" size={13}>
              Back
            </AppText>
          </PressableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <CareCardBlocks blocks={blocks} tone="onCard" />
      </ScrollView>
    </>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    backButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.one },
    scroll: { flex: 1 },
    scrollContent: { gap: spacing.three, paddingBottom: spacing.two }
  });

export default CardBackFace;
