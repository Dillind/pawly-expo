import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import IconButton from '@/components/core/icon-button';
import CardBackFace from '@/components/screens/pet/care-card/card-back-face';
import CardFrontFace from '@/components/screens/pet/care-card/card-front-face';
import CareCardHelpSheets, {
  type CareCardHelpHandle
} from '@/components/screens/pet/care-card/care-card-help-sheets';
import CareCardSectionSheet from '@/components/screens/pet/care-card/care-card-section-sheet';
import CareCardSectionTray from '@/components/screens/pet/care-card/care-card-section-tray';
import FlipCard from '@/components/screens/pet/care-card/flip-card';
import { CardInset, CardPalette } from '@/constants/care-card-palette';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { useCareCardData } from '@/hooks/queries/pet/use-care-card';
import { usePetDetail } from '@/hooks/queries/pet/use-pet-detail';
import { useCareCardSections } from '@/hooks/use-care-card-sections';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useStyles } from '@/hooks/use-styles';
import {
  careCardBackRows,
  careCardBlocks,
  careCardSectionBlock,
  frontNumbers,
  type CareCardRow
} from '@/lib/care-card-view';
import { deviceTimezone, formatDateWithYear } from '@/lib/dates';
import { showErrorToast } from '@/lib/toast';
import { callNumber } from '@/utils/linking';

const BLUR_INTENSITY = 48;

const CareCardScreen = () => {
  const { petId, petName, petSubtitle } = useLocalSearchParams<{
    petId: string;
    petName: string;
    petSubtitle?: string;
  }>();
  const router = useRouter();
  const styles = useStyles(makeStyles);

  const helpRef = useRef<CareCardHelpHandle | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  const { card, medications, contacts, isLoading } = useCareCardData(petId);
  const { data: pet } = usePetDetail(petId);
  const { data: household } = useHousehold();
  const { shareCareCard, isSharing } = useShareCareCard();

  const isOwner = household?.isOwner ?? false;
  const timezone = household?.timezone ?? deviceTimezone();
  const isEmpty = careCardBlocks(card, medications, contacts).length === 0;
  const { trayRef, sheetRef, openSectionId, openSection, closeSection } =
    useCareCardSections(isOwner);

  const openEditor = () =>
    router.push({
      pathname: '/home/[petId]/care-card-editor',
      params: { petId, petName, ...(petSubtitle ? { petSubtitle } : {}) }
    });

  const call = async ({ value }: CareCardRow) => {
    if (!(await callNumber(value))) showErrorToast('This device cannot make calls');
  };

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
          <View style={styles.stage}>
            <FlipCard
              isFlipped={isFlipped}
              front={
                <CardFrontFace
                  petName={petName}
                  petSubtitle={petSubtitle ?? null}
                  photoUrl={pet?.photoUrl ?? null}
                  numbers={frontNumbers(card, contacts)}
                  isEmpty={isEmpty}
                  isOwner={isOwner}
                  isSharing={isSharing}
                  onHelp={() => helpRef.current?.openWhatIsIt()}
                  onShare={() => void shareCareCard([petId])}
                  onFlip={() => setIsFlipped(true)}
                  onFill={openEditor}
                  onCall={(number) => void call(number)}
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

            <View style={styles.footer}>
              <IconButton
                name="close"
                accessibilityLabel="Close the Care Card"
                variant="ghost"
                color="onGlass"
                size={IconSize.control}
                containerStyle={styles.control}
                onPress={() => router.back()}
              />
            </View>
          </View>
        )}
      </SafeAreaView>

      {isOwner ? (
        <CareCardSectionTray
          sheetRef={trayRef}
          petId={petId}
          card={card}
          medications={medications}
          contacts={contacts}
          initialStepId={openSectionId}
          onDismiss={closeSection}
        />
      ) : (
        <CareCardSectionSheet
          sheetRef={sheetRef}
          block={
            openSectionId ? careCardSectionBlock(openSectionId, card, medications, contacts) : null
          }
          onDismiss={closeSection}
        />
      )}

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
