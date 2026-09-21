import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, usePreventZoomTransitionDismissal, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
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
const WASH_IN_MS = 320;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

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

  // The screen behind is not composited on the first frame, so a blur at full
  // strength from the start pops when it finally has something to blur. Fading
  // the whole backdrop in covers that frame. The intensity itself never
  // animates -- on Android that re-renders the blur every frame.
  const washOpacity = useSharedValue(0);

  useEffect(() => {
    washOpacity.set(withTiming(1, { duration: WASH_IN_MS, easing: EASE_OUT }));
  }, [washOpacity]);

  // The card's own scroller owns the vertical gesture, so the zoom's interactive
  // dismissal is fenced off entirely and the round close button is the way out.
  usePreventZoomTransitionDismissal({ unstable_dismissalBoundsRect: { maxX: 0, maxY: 0 } });

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
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: washOpacity }]}>
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.wash]} />
      </Animated.View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={styles.stage}>
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
          </View>
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
