import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { CARE_CARD_FIELDS, emptyCareCard } from '@/constants/care-card-fields';
import { Radius, type AppTheme } from '@/constants/theme';
import { useCareCard } from '@/hooks/queries/use-care-card';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { createShadowMedium } from '@/lib/styles/shadows';
import type { CareCard as CareCardData, Medication } from '@/services/care-card.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

import CareCardTray from './care-card-tray';

const FLIP_DURATION_MS = 460;

// Both faces are stacked, and only the front is in normal flow -- so the front
// sets the card's height and the back has to fit inside it. The floor keeps a
// barely-filled card from collapsing to something shorter than its own back.
const MIN_CARD_HEIGHT = 236;

type SummaryRow = { label: string; value: string | null };

const summaryRows = (card: CareCardData, medications: Medication[]): SummaryRow[] => [
  { label: 'Allergies', value: card.allergies },
  {
    label: 'Medications',
    value: medications.length ? medications.map((medication) => medication.name).join(', ') : null
  },
  { label: 'Vet', value: card.vetPhone ?? card.vetName }
];

type Props = { petId: string; petName: string };

const CareCard = ({ petId, petName }: Props) => {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const { data, isLoading, isError, refetch } = useCareCard(petId);
  const { shareCareCard, isSharing } = useShareCareCard();

  const [isFlipped, setIsFlipped] = useState(false);
  const progress = useSharedValue(0);
  const isReducedMotion = useReducedMotion();

  const card = data?.card ?? emptyCareCard(petId);
  const medications = data?.medications ?? [];
  const filledCount = CARE_CARD_FIELDS.filter((field) => Boolean(card[field])).length;

  const flip = () => {
    const next = isFlipped ? 0 : 1;
    setIsFlipped(!isFlipped);
    hapticLight();
    // Under reduced motion the rotation is a jump cut and the opacity swap
    // below becomes the whole transition.
    progress.value = withTiming(next, { duration: isReducedMotion ? 0 : FLIP_DURATION_MS });
  };

  const frontStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${progress.value * 180}deg` }]
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? 0 : 1,
    transform: [{ perspective: 1000 }, { rotateY: `${progress.value * 180 - 180}deg` }]
  }));

  if (isLoading) {
    return (
      <View style={[styles.card, styles.centred]}>
        <ActivityIndicator color={theme.colors.onPrimary} />
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load the Care Card"
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <>
      <View style={[styles.card, createShadowMedium(theme.colors)]}>
        <Animated.View style={[styles.face, frontStyle]} pointerEvents={isFlipped ? 'none' : 'auto'}>
          <View style={styles.eyebrowRow}>
            <AppText color="onPrimary" size={11} style={styles.eyebrow}>
              Care Card
            </AppText>
            <IconButton
              name="flip"
              accessibilityLabel="Show how to hand this over"
              variant="ghost"
              color="onPrimary"
              size={18}
              onPress={flip}
            />
          </View>

          <View style={styles.rows}>
            {summaryRows(card, medications).map((row) => (
              <View key={row.label} style={styles.row}>
                <AppText color="onPrimary" size={11} style={styles.rowLabel}>
                  {row.label}
                </AppText>
                <AppText color="onPrimary" size={15} numberOfLines={2}>
                  {row.value ?? 'Not set'}
                </AppText>
              </View>
            ))}
          </View>

          <PressableOpacity
            style={styles.footerRow}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${petName}'s Care Card`}
            onPress={() => void sheetRef.current?.present()}>
            <AppText color="onPrimary" size={15}>
              {filledCount ? 'Edit' : 'Fill it in'}
            </AppText>
            <Icon name="caretRight" size={16} color="onPrimary" />
          </PressableOpacity>
        </Animated.View>

        <Animated.View
          style={[styles.face, styles.backFace, backStyle]}
          pointerEvents={isFlipped ? 'auto' : 'none'}>
          <View style={styles.eyebrowRow}>
            <AppText color="onPrimary" size={11} style={styles.eyebrow}>
              Hand it over
            </AppText>
            <IconButton
              name="flip"
              accessibilityLabel="Show the summary"
              variant="ghost"
              color="onPrimary"
              size={18}
              onPress={flip}
            />
          </View>

          <AppText color="onPrimary" size={15}>
            A PDF of {petName}&apos;s Care Card, for whoever is looking after them. They do not need
            Crumpet.
          </AppText>

          <View style={styles.footerRow}>
            <IconButton
              name="share"
              accessibilityLabel={`Share ${petName}'s Care Card`}
              variant="secondary"
              size={20}
              isLoading={isSharing}
              isDisabled={isSharing || filledCount === 0}
              onPress={() => void shareCareCard([petId])}
            />
            <AppText color="onPrimary" size={13} style={styles.caption}>
              {filledCount === 0
                ? 'Fill the card in first — there is nothing to send yet.'
                : 'Made fresh each time. Send a new one if anything changes.'}
            </AppText>
          </View>
        </Animated.View>
      </View>

      <CareCardTray petId={petId} card={card} medications={medications} sheetRef={sheetRef} />
    </>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    // The one coloured object on a screen of white cards. It is a different
    // kind of thing from the sections around it and should look like one.
    card: {
      minHeight: MIN_CARD_HEIGHT,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.primary,
      overflow: 'hidden'
    },
    centred: { alignItems: 'center', justifyContent: 'center' },
    face: {
      padding: spacing.three,
      gap: spacing.three,
      flex: 1,
      backfaceVisibility: 'hidden'
    },
    backFace: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: 'space-between'
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    eyebrow: { letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.8 },
    rows: { gap: spacing.two, flex: 1 },
    row: { gap: 1 },
    rowLabel: { letterSpacing: 1.1, textTransform: 'uppercase', opacity: 0.7 },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.two },
    caption: { flex: 1, opacity: 0.8 }
  });

export default CareCard;
