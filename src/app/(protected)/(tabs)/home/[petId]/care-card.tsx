import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import IconButton from '@/components/core/icon-button';
import CardBackFace from '@/components/screens/pet/care-card/card-back-face';
import CardFrontFace from '@/components/screens/pet/care-card/card-front-face';
import CareCardHelpSheets, {
  type CareCardHelpHandle
} from '@/components/screens/pet/care-card/care-card-help-sheets';
import CareCardSectionTray from '@/components/screens/pet/care-card/care-card-section-tray';
import FlipCard from '@/components/screens/pet/care-card/flip-card';
import { CardInset, CardPalette } from '@/constants/care-card-palette';
import { Radius, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useCareCardData } from '@/hooks/queries/pet/use-care-card';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useStyles } from '@/hooks/use-styles';
import { careCardBackRows, careCardBlocks, emergencyNumber } from '@/lib/care-card-view';
import { deviceTimezone, formatDateWithYear } from '@/lib/dates';

const BLUR_INTENSITY = 48;
const CARD_START_SCALE = 0.92;

const CareCardScreen = () => {
  const { petId, petName, petSubtitle } = useLocalSearchParams<{
    petId: string;
    petName: string;
    petSubtitle?: string;
  }>();
  const router = useRouter();
  const styles = useStyles(makeStyles);

  const helpRef = useRef<CareCardHelpHandle | null>(null);
  const trayRef = useRef<TrueSheet | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string | undefined>(undefined);

  const { card, medications, contacts, isLoading } = useCareCardData(petId);
  const { data: pet } = usePetDetail(petId);
  const { data: household } = useHousehold();
  const { shareCareCard, isSharing } = useShareCareCard();

  // The native fade carries the backdrop, so the blur always has the screen
  // behind to sample. The card alone grows into place on top of it.
  const isReduced = useReducedMotion();
  const cardScale = useSharedValue(isReduced ? 1 : CARD_START_SCALE);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.get() }] }));

  useEffect(() => {
    cardScale.set(withSpring(1, { duration: 400, dampingRatio: 0.85 }));
  }, [cardScale]);

  const isOwner = household?.isOwner ?? false;
  const timezone = household?.timezone ?? deviceTimezone();
  const isEmpty = careCardBlocks(card, medications, contacts).length === 0;

  const openSection = (sectionId: string) => {
    setOpenSectionId(sectionId);
    void trayRef.current?.present();
  };

  const openEditor = () =>
    router.push({
      pathname: '/home/[petId]/care-card-editor',
      params: { petId, petName, ...(petSubtitle ? { petSubtitle } : {}) }
    });

  return (
    <View style={styles.screen}>
      <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.wash]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : (
          <Animated.View style={[styles.stage, cardStyle]}>
            <FlipCard
              isFlipped={isFlipped}
              front={
                <CardFrontFace
                  petName={petName}
                  petSubtitle={petSubtitle ?? null}
                  photoUrl={pet?.photoUrl ?? null}
                  emergency={emergencyNumber(card, contacts)}
                  isEmpty={isEmpty}
                  isSharing={isSharing}
                  onHelp={() => helpRef.current?.openWhatIsIt()}
                  onShare={() => void shareCareCard([petId])}
                  onFlip={() => setIsFlipped(true)}
                  onFill={openEditor}
                />
              }
              back={
                <CardBackFace
                  petName={petName}
                  updatedLabel={
                    card.updatedAt
                      ? `Updated ${formatDateWithYear(new Date(card.updatedAt), timezone)}`
                      : null
                  }
                  rows={careCardBackRows(card, medications, contacts)}
                  isOwner={isOwner}
                  onFlip={() => setIsFlipped(false)}
                  onOpenSection={openSection}
                />
              }
            />

            {/* Close acts on the card, so it sits outside it rather than on a
            face. Editing lives on the back, one section at a time. */}
            <View style={styles.footer}>
              <IconButton
                name="close"
                accessibilityLabel="Close the Care Card"
                variant="ghost"
                color="onGlass"
                size={18}
                containerStyle={styles.control}
                onPress={() => router.back()}
              />
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      <CareCardSectionTray
        sheetRef={trayRef}
        petId={petId}
        card={card}
        medications={medications}
        contacts={contacts}
        initialStepId={openSectionId}
        onDismiss={() => setOpenSectionId(undefined)}
      />

      <CareCardHelpSheets ref={helpRef} />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1
    },
    wash: {
      backgroundColor: CardPalette.wash
    },
    safe: {
      flex: 1,
      paddingHorizontal: CardInset,
      paddingVertical: spacing.four
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center'
    },
    stage: {
      flex: 1,
      justifyContent: 'center'
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: spacing.four
    },
    control: {
      width: 38,
      height: 38,
      minWidth: 38,
      minHeight: 38,
      borderRadius: Radius.full,
      backgroundColor: CardPalette.control
    }
  });

export default CareCardScreen;
