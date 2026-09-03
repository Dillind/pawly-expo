import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import ScreenView from '@/components/layout/screen-view';
import MedicationsStep from '@/components/screens/pet/care-card-steps/medications-step';
import ReachingYouStep from '@/components/screens/pet/care-card-steps/reaching-you-step';
import ReviewStep from '@/components/screens/pet/care-card-steps/review-step';
import SectionStep from '@/components/screens/pet/care-card-steps/section-step';
import CareCardHelpSheets, {
  type CareCardHelpHandle
} from '@/components/screens/pet/care-card/care-card-help-sheets';
import { CARE_CARD_STEPS } from '@/constants/care-card-fields';
import { Radius, Spacing, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useCareCardData } from '@/hooks/queries/pet/use-care-card';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useStyles } from '@/hooks/use-styles';
import { formatDateWithYear } from '@/lib/dates';
import { hapticLight } from '@/lib/haptics';
import { isIOS } from '@/utils/platform';

const PROGRESS_DURATION_MS = 260;

const CareCardEditor = () => {
  const { petId, petName, petSubtitle } = useLocalSearchParams<{
    petId: string;
    petName: string;
    petSubtitle?: string;
  }>();
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const { card, medications, contacts, isLoading } = useCareCardData(petId);
  const { shareCareCard, isSharing } = useShareCareCard();
  const { data: household } = useHousehold();

  const [stepIndex, setStepIndex] = useState(0);
  const helpRef = useRef<CareCardHelpHandle | null>(null);

  const progress = useSharedValue((1 / CARE_CARD_STEPS.length) * 100);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  const step = CARE_CARD_STEPS[stepIndex];

  const goTo = (index: number) => {
    const next = Math.min(Math.max(index, 0), CARE_CARD_STEPS.length - 1);
    void hapticLight();
    setStepIndex(next);
    progress.value = withTiming(((next + 1) / CARE_CARD_STEPS.length) * 100, {
      duration: PROGRESS_DURATION_MS
    });
  };

  const close = () => router.back();

  // The household's timezone, matching the stamp useShareCareCard puts on the
  // PDF -- the device's own clock can name a different day near midnight.
  const zone = household?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const generatedOn = formatDateWithYear(new Date(), zone);

  return (
    <ScreenView edges={[]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing.three) }]}>
        <IconButton
          name="close"
          accessibilityLabel="Close the Care Card editor"
          variant="ghost"
          size={22}
          onPress={close}
        />

        <View style={styles.headerTitle}>
          <Icon name="pawPrint" size={14} color="textSecondary" />
          <AppText size={14} color="textSecondary">
            Care Card
          </AppText>
        </View>

        <View style={styles.headerRight}>
          <AppText size={12} color="textSecondary">
            {stepIndex + 1} of {CARE_CARD_STEPS.length}
          </AppText>
          <IconButton
            name="help"
            accessibilityLabel={
              step.kind === 'review' ? 'About sharing a Care Card' : 'What is a Care Card?'
            }
            variant="ghost"
            size={18}
            onPress={() =>
              step.kind === 'review'
                ? helpRef.current?.openSharing()
                : helpRef.current?.openWhatIsIt()
            }
          />
        </View>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.progress, progressStyle]} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={isIOS ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <AppText variant="header" size={30}>
              {step.title}
            </AppText>

            {step.kind === 'reaching-you' && (
              <ReachingYouStep
                petId={petId}
                contacts={contacts}
                onNext={() => goTo(stepIndex + 1)}
              />
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
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <CareCardHelpSheets ref={helpRef} />
    </ScreenView>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    flex: {
      flex: 1
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.three,
      paddingBottom: spacing.two
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two
    },
    track: {
      height: 3,
      marginHorizontal: spacing.three,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected,
      overflow: 'hidden'
    },
    progress: {
      height: 3,
      borderRadius: Radius.full,
      backgroundColor: colors.primary
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    content: {
      padding: spacing.three,
      paddingBottom: spacing.six,
      gap: spacing.three
    },
    title: {
      paddingTop: spacing.two
    }
  });

export default CareCardEditor;
