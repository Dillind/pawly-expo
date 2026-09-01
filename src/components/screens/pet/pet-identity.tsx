import PhotoSourceSheet from '@/components/bottom-sheets/photo-source-sheet';
import AppText from '@/components/core/app-text';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import EditPetDetails from '@/components/screens/pet/edit-pet-details';
import PetPhotoHeader from '@/components/screens/pet/pet-photo-header';
import { ScreenGutter, type AppTheme } from '@/constants/theme';
import { useChangePetPhoto } from '@/hooks/queries/pet/use-pet-photo-mutations';
import { useStyles } from '@/hooks/use-styles';
import type { PetDetail } from '@/services/pet.service';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  pet: PetDetail;
  isOwner: boolean;
  /** "Three feed times a day · Logged once today". */
  summary: string | null;
};

/**
 * The photo, the name and the way into editing either.
 *
 * The name is in the page rather than in the navigation bar: the header is
 * transparent over the photo, and a title floating on a photo is unreadable at
 * the top of half of them.
 */
const PetIdentity = ({ pet, isOwner, summary }: Props) => {
  const styles = useStyles(makeStyles);
  const detailsTrayRef = useRef<TrueSheet | null>(null);
  const photoSheetRef = useRef<TrueSheet | null>(null);
  const { mutate: changePhoto, isPending: isChangingPhoto } = useChangePetPhoto(pet.id);

  const steps: TrayStepDescriptor[] = [
    {
      id: 'edit',
      title: 'Edit details',
      render: () => (
        <EditPetDetails
          petId={pet.id}
          details={{
            name: pet.name,
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
    <View>
      <PetPhotoHeader
        photoUrl={pet.photoUrl}
        isBusy={isChangingPhoto}
        onEdit={isOwner ? () => void detailsTrayRef.current?.present() : undefined}
        onChangePhoto={isOwner ? () => void photoSheetRef.current?.present() : undefined}
      />

      <View style={styles.names}>
        <AppText variant="header" size={30} fontWeight="bold">
          {pet.name}
        </AppText>
        {summary && (
          <AppText size={13} color="textSecondary">
            {summary}
          </AppText>
        )}
      </View>

      <Tray sheetRef={detailsTrayRef} steps={steps} />

      <PhotoSourceSheet
        sheetRef={photoSheetRef}
        title="Change photo"
        onPicked={([localUri]) => changePhoto({ localUri, previousUrl: pet.photoUrl })}
      />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    names: {
      paddingTop: spacing.three,
      paddingHorizontal: ScreenGutter,
      gap: spacing.half
    }
  });

export default PetIdentity;
