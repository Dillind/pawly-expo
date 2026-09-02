import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PetAvatar from '@/components/core/pet-avatar';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import CareCardTile, { TileWidth } from '@/components/screens/pet/care-card/care-card-tile';
import EditPetDetails from '@/components/screens/pet/edit-pet-details';
import { SEX_OPTIONS } from '@/constants/options';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useChangePetPhoto } from '@/hooks/queries/pet/use-pet-photo-mutations';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';
import type { PetDetail } from '@/services/pet.service';
import { optionLabel } from '@/utils/options';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export const AvatarSize = 140;
const CAMERA_BADGE_SIZE = 44;

type Props = {
  pet: PetDetail;
  isOwner: boolean;
};

/**
 * The photo, the care card, the name, and the way into editing any of them.
 *
 * The avatar is a circle rather than a full-width photo so the care card can
 * stand beside it: the two things a sitter opens this screen for are then one
 * glance apart, and the bar above can carry a readable title.
 */
const PetIdentity = ({ pet, isOwner }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const detailsTrayRef = useRef<TrueSheet | null>(null);
  const photoSheetRef = useRef<TrueSheet | null>(null);
  const { mutate: changePhoto, isPending: isChangingPhoto } = useChangePetPhoto(pet.id);

  const subtitle = [
    pet.breed,
    pet.sex ? optionLabel(SEX_OPTIONS, pet.sex) : null,
    formatAge(pet.birthdate, pet.birthdateIsApproximate)
  ]
    .filter(Boolean)
    .join(' · ');

  const steps: TrayStepDescriptor[] = [
    {
      id: 'edit',
      title: 'Edit details',
      render: () => (
        <EditPetDetails
          petId={pet.id}
          details={{
            name: pet.name,
            petType: pet.petType,
            breed: pet.breed,
            sex: pet.sex,
            birthdate: pet.birthdate,
            birthdateIsApproximate: pet.birthdateIsApproximate
          }}
          onDone={() => void detailsTrayRef.current?.dismiss()}
        />
      )
    }
  ];

  return (
    <View style={styles.hero}>
      <View style={styles.row}>
        {/* The avatar is the centre of the screen, so the care card beside it
            is balanced by an empty column of its own width. */}
        <View style={styles.spacer} />

        <PressableOpacity
          disabled={!isOwner || isChangingPhoto}
          accessibilityRole={isOwner ? 'button' : 'image'}
          accessibilityLabel={isOwner ? 'Change photo' : undefined}
          onPress={() => void photoSheetRef.current?.present()}>
          <PetAvatar photoUrl={pet.photoUrl} size={AvatarSize} />

          {isOwner && (
            <View style={styles.badge}>
              {isChangingPhoto ? (
                <ActivityIndicator />
              ) : (
                <Icon name="camera" size={20} color="text" />
              )}
            </View>
          )}
        </PressableOpacity>

        <CareCardTile
          petName={pet.name}
          onPress={() =>
            router.push({
              pathname: '/home/[petId]/care-card',
              params: {
                petId: pet.id,
                petName: pet.name,
                ...(pet.breed ? { petSubtitle: pet.breed } : {})
              }
            })
          }
        />
      </View>

      <View style={styles.nameRow}>
        <AppText variant="header" size={30} fontWeight="bold">
          {pet.name}
        </AppText>
        {isOwner && (
          <IconButton
            name="pencil"
            accessibilityLabel="Edit details"
            variant="ghost"
            size={20}
            onPress={() => void detailsTrayRef.current?.present()}
          />
        )}
      </View>

      {subtitle.length > 0 && (
        <AppText size={15} color="textSecondary" align="center">
          {subtitle}
        </AppText>
      )}

      <Tray sheetRef={detailsTrayRef} steps={steps} />

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        title="Change photo"
        onPicked={([localUri]) => changePhoto({ localUri, previousUrl: pet.photoUrl })}
      />
    </View>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    hero: {
      alignItems: 'center',
      gap: spacing.one,
      paddingHorizontal: ScreenGutter
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: spacing.two
    },
    spacer: { width: TileWidth },
    // The ring is the page colour, not a border, so the badge reads as cut out
    // of the avatar rather than stuck on top of it.
    badge: {
      position: 'absolute',
      right: -2,
      bottom: 2,
      width: CAMERA_BADGE_SIZE,
      height: CAMERA_BADGE_SIZE,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSelected,
      borderWidth: 3,
      borderColor: colors.background
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.half,
      paddingTop: spacing.one
    }
  });

export default PetIdentity;
