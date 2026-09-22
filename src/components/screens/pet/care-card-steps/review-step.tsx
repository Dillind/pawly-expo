import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import CareCardBlocks from '@/components/screens/pet/care-card/care-card-blocks';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { careCardBlocks } from '@/lib/care-card-view';
import { hapticSuccess } from '@/lib/haptics';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';

import StepFooter from './step-footer';

type Props = {
  petName: string;
  petSubtitle: string | null;
  card: CareCard;
  medications: Medication[];
  contacts: CareCardContact[];
  generatedOn: string;
  isSharing: boolean;
  onBack: () => void;
  onShare: () => void;
  onDone: () => void;
};

const ReviewStep = ({
  petName,
  petSubtitle,
  card,
  medications,
  contacts,
  generatedOn,
  isSharing,
  onBack,
  onShare,
  onDone
}: Props) => {
  const styles = useStyles(makeStyles);
  const blocks = careCardBlocks(card, medications, contacts);

  return (
    <>
      <View style={styles.step}>
        <AppText color="textSecondary" size="callout">
          This is the page they will get. Check it reads right.
        </AppText>

        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <View>
              <AppText size="titleSmall">{petName}</AppText>
              {petSubtitle && (
                <AppText size="caption" color="textSecondary">
                  {petSubtitle}
                </AppText>
              )}
            </View>
            <View>
              <AppText size="caption" color="textSecondary" align="right">
                Care Card
              </AppText>
              <AppText size="caption" color="textSecondary" align="right">
                {generatedOn}
              </AppText>
            </View>
          </View>

          {blocks.length === 0 ? (
            <AppText size="subhead" color="textSecondary">
              Nothing filled in yet. Go back and add whatever you can — a half-filled card is still
              worth handing over.
            </AppText>
          ) : (
            <CareCardBlocks blocks={blocks} />
          )}
        </View>
      </View>

      <StepFooter
        isBusy={isSharing}
        nextLabel="Share"
        nextIcon={<Icon name="share" size={IconSize.inline} color="onPrimary" />}
        isNextDisabled={blocks.length === 0}
        onBack={onBack}
        onNext={() => {
          void hapticSuccess();
          onShare();
        }}
      />

      <MainButton text="Done" variant="text" isDisabled={isSharing} onPress={onDone} />
    </>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    step: {
      gap: spacing.three
    },
    preview: {
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      padding: spacing.three,
      gap: spacing.three
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    }
  });

export default ReviewStep;
