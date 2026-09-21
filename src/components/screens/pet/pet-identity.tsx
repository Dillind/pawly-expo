import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Link } from 'expo-router';
import { useRef } from 'react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import PetAvatar from '@/components/core/pet-avatar';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import CareCardTile, { TileWidth } from '@/components/screens/pet/care-card/care-card-tile';
import EditPetDetails from '@/components/screens/pet/edit-pet-details';
import BreedPicker from '@/components/ui/breed-picker';
import { breedSpeciesFor, petBreedLabel } from '@/constants/breeds';
import { SEX_OPTIONS } from '@/constants/options';
import { petDetailsEditSchema, type PetDetailsEditValues } from '@/constants/schemas/pet-details';
import { Radius, ScreenGutter, type AppTheme } from '@/constants/theme';
import { useChangePetPhoto } from '@/hooks/queries/pet/use-pet-photo-mutations';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';
import type { PetDetail } from '@/services/pet.service';
import { optionLabel } from '@/utils/options';

const BreedTrayStep = () => {
  const { back } = useTray();
  const { control, setValue } = useFormContext<PetDetailsEditValues>();

  const petType = useWatch({ control, name: 'petType' });
  const breedId = useWatch({ control, name: 'breedId' });

  const species = breedSpeciesFor(petType);

  if (!species) return null;

  return (
    <View style={{ height: BreedStepHeight }}>
      <BreedPicker
        species={species}
        value={breedId}
        onChange={(next) => {
          setValue('breedId', next, { shouldDirty: true, shouldValidate: true });
          back();
        }}
      />
    </View>
  );
};

// A Tray sizes to its content and a list has no natural height, so without this
// the sheet collapses to one row.
const BreedStepHeight = 460;

export const AvatarSize = 140;
const CAMERA_BADGE_SIZE = 44;

type Props = {
  pet: PetDetail;
  isOwner: boolean;
};

const PetIdentity = ({ pet, isOwner }: Props) => {
  const styles = useStyles(makeStyles);
  const detailsTrayRef = useRef<TrueSheet | null>(null);
  const photoSheetRef = useRef<TrueSheet | null>(null);
  const { mutate: changePhoto, isPending: isChangingPhoto } = useChangePetPhoto(pet.id);

  const subtitle = [
    petBreedLabel(pet),
    pet.sex ? optionLabel(SEX_OPTIONS, pet.sex) : null,
    formatAge(pet.birthdate, pet.birthdateIsApproximate)
  ]
    .filter(Boolean)
    .join(' · ');

  // The breed step is a sibling and must read and write the same instance.
  const form = useForm<PetDetailsEditValues>({
    resolver: zodResolver(petDetailsEditSchema),
    defaultValues: {
      name: pet.name,
      petType: pet.petType,
      // Still free text, so match the bundled list to open with the right row
      // ticked. CRU-104 makes it a real column.
      breedId: pet.breedId,
      sex: pet.sex ?? undefined,
      birthdate: pet.birthdate ?? '',
      birthdateIsApproximate: pet.birthdateIsApproximate
    },
    mode: 'onBlur'
  });

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
            breedId: pet.breedId,
            breedFreetext: pet.breedFreetext,
            sex: pet.sex,
            birthdate: pet.birthdate,
            birthdateIsApproximate: pet.birthdateIsApproximate
          }}
          onDone={() => void detailsTrayRef.current?.dismiss()}
        />
      )
    },
    {
      id: 'breed',
      title: 'Breed',
      render: () => <BreedTrayStep />
    }
  ];

  return (
    <View style={styles.hero}>
      <View style={styles.row}>
        {/* The care card stands beside the avatar so a sitter's two reasons for
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

        <Link
          href={{
            pathname: '/home/[petId]/care-card',
            params: {
              petId: pet.id,
              petName: pet.name,
              ...(petBreedLabel(pet) ? { petSubtitle: petBreedLabel(pet) as string } : {})
            }
          }}
          asChild>
          <CareCardTile petName={pet.name} />
        </Link>
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

      <FormProvider {...form}>
        <Tray sheetRef={detailsTrayRef} steps={steps} />
      </FormProvider>

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
    spacer: {
      width: TileWidth
    },
    // The page colour, not a border, so the badge reads as cut out.
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
