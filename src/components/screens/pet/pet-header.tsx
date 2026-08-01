import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import type { AppTheme } from '@/constants/theme';
import { Radius } from '@/constants/theme';
import { useChangePetPhoto } from '@/hooks/use-pet-photo-mutations';
import { useStyles } from '@/hooks/use-styles';
import { formatAge } from '@/lib/dates';
import FieldError from '@/lib/form/components/field-error';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Props = {
  petId: string;
  name: string;
  breed: string | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
};

const PetHeader = ({ petId, name, breed, birthdate, birthdateIsApproximate, photoUrl }: Props) => {
  const styles = useStyles(makeStyles);
  const changePhoto = useChangePetPhoto(petId);
  const [error, setError] = useState<string | null>(null);

  const age = formatAge(birthdate, birthdateIsApproximate);
  const subtitle = [breed, age].filter(Boolean).join(' · ');

  const pickPhoto = async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // A silent return here reads as a dead button: the user taps, nothing
    // happens, and nothing explains why.
    if (!permission.granted) {
      setError('Allow photo access in Settings to change the photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (result.canceled) return;

    try {
      await changePhoto.mutateAsync({ localUri: result.assets[0].uri, previousUrl: photoUrl });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change the photo');
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Image source={photoUrl} style={styles.photo} contentFit="cover" transition={200} />

        <View style={styles.editWell}>
          {changePhoto.isPending ? (
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

      <AppText variant="header" size={28}>
        {name}
      </AppText>

      {subtitle.length > 0 && (
        <AppText size={15} color="textSecondary">
          {subtitle}
        </AppText>
      )}

      <FieldError error={error ?? undefined} />
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    container: { gap: spacing.two, alignItems: 'center' },
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
