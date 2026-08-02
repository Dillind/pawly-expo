import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import EditPetDetails from '@/components/screens/pet/edit-pet-details';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useChangePetPhoto } from '@/hooks/queries/use-pet-photo-mutations';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { PetSex } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const sexLabels: Record<PetSex, string> = { male: 'Male', female: 'Female' };

type Props = {
  petId: string;
  name: string;
  breed: string | null;
  sex: PetSex | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
};

const PetHeader = ({
  petId,
  name,
  breed,
  sex,
  birthdate,
  birthdateIsApproximate,
  photoUrl
}: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: changePhoto, isPending: isChangingPhoto } = useChangePetPhoto(petId);
  const sheetRef = useRef<TrueSheet | null>(null);
  const { data: household } = useHousehold();

  const age = formatAge(birthdate, birthdateIsApproximate);
  const subtitle = [breed, sex ? sexLabels[sex] : null, age].filter(Boolean).join(' · ');

  const steps: TrayStepDescriptor[] = [
    {
      id: 'edit',
      title: 'Edit details',
      render: () => (
        <EditPetDetails
          petId={petId}
          details={{ name, breed, sex, birthdate, birthdateIsApproximate }}
          onDone={() => void sheetRef.current?.dismiss()}
        />
      )
    }
  ];

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // A silent return here reads as a dead button: the user taps, nothing
    // happens, and nothing explains why.
    if (!permission.granted) {
      showErrorToast(ErrorMessage.PhotoAccessDenied);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (result.canceled) return;

    changePhoto(
      { localUri: result.assets[0].uri, previousUrl: photoUrl },
      {
        onSuccess: () => {
          showSuccessToast(SuccessMessage.PetPhotoUpdated);
        },
        onError: (caught) => {
          showErrorToast(ErrorMessage.PetPhotoUpdateFailed);
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View>
        <Image source={photoUrl} style={styles.photo} contentFit="cover" transition={200} />

        <View style={styles.editWell}>
          {isChangingPhoto ? (
            <ActivityIndicator />
          ) : (
            <IconButton
              name="camera"
              accessibilityLabel="Change photo"
              variant="primary"
              size={18}
              onPress={() => void pickPhoto()}
            />
          )}
        </View>
      </View>

      <View style={styles.nameRow}>
        <AppText variant="header" size={28}>
          {name}
        </AppText>

        {household?.isOwner && (
          <IconButton
            name="pencil"
            accessibilityLabel="Edit pet details"
            variant="ghost"
            size={18}
            onPress={() => void sheetRef.current?.present()}
          />
        )}
      </View>

      {subtitle.length > 0 && (
        <AppText size={15} color="textSecondary">
          {subtitle}
        </AppText>
      )}

      <Tray sheetRef={sheetRef} steps={steps} />
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: {
      gap: spacing.two,
      alignItems: 'center'
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one
    },
    photo: {
      width: 120,
      height: 120,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundElement
    },
    editWell: {
      position: 'absolute',
      right: -spacing.two,
      bottom: 0,
      borderRadius: Radius.full,
      backgroundColor: colors.background
    }
  });

export default PetHeader;
