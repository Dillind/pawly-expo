import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FlowStepper from '@/components/ui/flow-stepper';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import { Radius, type AppTheme } from '@/constants/theme';
import { useAddPet } from '@/hooks/queries/pet/use-pet-mutations';
import { useStyles } from '@/hooks/use-styles';
import PetPhotoService from '@/services/pet-photo.service';
import { useAuthStore } from '@/stores/auth-store';
import useAddPetStore from '@/stores/add-pet-store';
import { optionLabel } from '@/utils/options';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Step 3, and skippable. Instructions are what makes the app useful to a
 * sitter, but a pet with none is still a pet — so this offers the work and an
 * exit past it, and both buttons create the pet.
 */
const AddPetInstructions = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId } = useAuthStore();
  const { mutate: addPet, isPending: isAdding } = useAddPet();
  const [isUploading, setIsUploading] = useState(false);

  const store = useAddPetStore();
  const { name, feedTimes, setInstructions, reset } = store;

  const isBusy = isAdding || isUploading;

  const create = async () => {
    setIsUploading(true);

    let photoUrl: string | null = null;

    try {
      if (store.photoUri && userId) {
        photoUrl = await PetPhotoService.uploadCover({ userId, localUri: store.photoUri });
      }
    } finally {
      setIsUploading(false);
    }

    addPet(
      {
        name: store.name.trim(),
        breed: store.breed.trim(),
        sex: store.sex,
        birthdate: store.birthdate,
        birthdateIsApproximate: store.ageMode === 'approximate',
        photoUrl,
        petType: store.petType,
        feedingTimes: feedTimes.map((feedTime) => ({
          scheduledTime: feedTime.localTime,
          label: feedTime.label,
          daysOfWeek: feedTime.daysOfWeek,
          instructions: feedTime.instructions
        }))
      },
      {
        onSuccess: (pet) => {
          reset();
          // The pet's own screen is the summary, and it teaches where to edit
          // all of this later.
          router.replace(`/home/${pet.id}`);
        }
      }
    );
  };

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        isKeyboardAware
        contentContainerStyle={styles.content}>
        <FlowStepper current={3} count={3} />

        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            What does {name || 'your pet'} get?
          </AppText>
          <AppText size={15} color="textSecondary">
            Whoever feeds them sees this when they log it. A sitter will thank you.
          </AppText>
        </View>

        {feedTimes.map((feedTime, index) => (
          <View key={`${feedTime.label}-${index}`} style={styles.card}>
            <AppText size={15} fontWeight="bold">
              {optionLabel(FEEDING_SCHEDULE_LABEL_OPTIONS, feedTime.label)}
              {'  ·  '}
              {dayjs(feedTime.localTime, 'HH:mm').format('h:mm A')}
            </AppText>

            <TextInputValidated
              label="Instructions"
              placeholder="Half a tin of wet food + 1 cup dry"
              value={feedTime.instructions ?? ''}
              onChangeText={(next: string) => setInstructions(index, next === '' ? null : next)}
              isMultiline
            />
          </View>
        ))}

        <MainButton
          text={`Add ${name || 'pet'}`}
          isLoading={isBusy}
          isDisabled={isBusy}
          onPress={() => void create()}
        />

        <MainButton
          text="Skip for now"
          variant="text"
          isDisabled={isBusy}
          onPress={() => void create()}
        />
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: { gap: spacing.three, paddingBottom: spacing.six },
    intro: { gap: spacing.one },
    card: {
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default AddPetInstructions;
