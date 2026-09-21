import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import IconButton from '@/components/core/icon-button';
import FlowScreen from '@/components/layout/flow-screen';
import MedicationsStep from '@/components/screens/pet/care-card-steps/medications-step';
import ReachingYouStep from '@/components/screens/pet/care-card-steps/reaching-you-step';
import ReviewStep from '@/components/screens/pet/care-card-steps/review-step';
import SectionStep from '@/components/screens/pet/care-card-steps/section-step';
import CareCardHelpSheets, {
  type CareCardHelpHandle
} from '@/components/screens/pet/care-card/care-card-help-sheets';
import { CARE_CARD_STEPS } from '@/constants/care-card-fields';
import { IconSize, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useCareCardData } from '@/hooks/queries/pet/use-care-card';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useStyles } from '@/hooks/use-styles';
import { formatDateWithYear } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';

const CareCardEditor = () => {
  const { petId, petName, petSubtitle } = useLocalSearchParams<{
    petId: string;
    petName: string;
    petSubtitle?: string;
  }>();
  const router = useRouter();
  const styles = useStyles(makeStyles);

  const { card, medications, contacts, isLoading } = useCareCardData(petId);
  const { shareCareCard, isSharing } = useShareCareCard();
  const { data: household } = useHousehold();

  const [stepIndex, setStepIndex] = useState(0);
  const helpRef = useRef<CareCardHelpHandle | null>(null);

  const step = CARE_CARD_STEPS[stepIndex];

  const goTo = (index: number) => {
    void hapticLight();
    setStepIndex(Math.min(Math.max(index, 0), CARE_CARD_STEPS.length - 1));
  };

  const close = () => router.back();

  // The household's timezone, matching the stamp useShareCareCard puts on the
  // PDF -- the device's own clock can name a different day near midnight.
  const zone = household?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const generatedOn = formatDateWithYear(new Date(), zone);

  return (
    <FlowScreen
      step={stepIndex + 1}
      stepCount={CARE_CARD_STEPS.length}
      title={step.title}
      closeLabel="Close the Care Card editor"
      onClose={close}
      isKeyboardAware
      action={
        <IconButton
          name="help"
          accessibilityLabel={
            step.kind === 'review' ? 'About sharing a Care Card' : 'What is a Care Card?'
          }
          variant="glass"
          size={IconSize.action}
          onPress={() =>
            step.kind === 'review'
              ? helpRef.current?.openSharing()
              : helpRef.current?.openWhatIsIt()
          }
        />
      }>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          {step.kind === 'reaching-you' && (
            <ReachingYouStep petId={petId} contacts={contacts} onNext={() => goTo(stepIndex + 1)} />
          )}

          {step.kind === 'section' && (
            <SectionStep
              key={step.id}
              petId={petId}
              card={card}
              section={step.section}
              isFirst={stepIndex === 0}
              onBack={() => goTo(stepIndex - 1)}
              onNext={() => goTo(stepIndex + 1)}
            />
          )}

          {step.kind === 'medications' && (
            <MedicationsStep
              petId={petId}
              medications={medications}
              onBack={() => goTo(stepIndex - 1)}
              onNext={() => goTo(stepIndex + 1)}
            />
          )}

          {step.kind === 'review' && (
            <ReviewStep
              petName={petName}
              petSubtitle={petSubtitle ?? null}
              card={card}
              medications={medications}
              contacts={contacts}
              generatedOn={generatedOn}
              isSharing={isSharing}
              onBack={() => goTo(stepIndex - 1)}
              onShare={() => void shareCareCard([petId])}
              onDone={close}
            />
          )}
        </>
      )}

      <CareCardHelpSheets ref={helpRef} />
    </FlowScreen>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    loading: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.five
    }
  });

export default CareCardEditor;
