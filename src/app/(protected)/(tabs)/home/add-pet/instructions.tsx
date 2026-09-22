import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import FlowScreen from '@/components/layout/flow-screen';
import { ErrorMessage } from '@/constants/enums';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import { ADD_PET_STEP_COUNT, type AddPetFormValues } from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { useAddPet } from '@/hooks/queries/pet/use-pet-mutations';
import { useAddPetExit } from '@/hooks/use-add-pet-exit';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast } from '@/lib/toast';
import PetPhotoService from '@/services/pet-photo.service';
import { useAuthStore } from '@/stores/auth-store';
import { optionLabel } from '@/utils/options';

// Skippable: a pet with no instructions is still a pet. Both buttons create
// the pet.
const AddPetInstructions = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { userId } = useAuthStore();
  const { mutate: addPet, isPending: isAdding } = useAddPet();
  const [isUploading, setIsUploading] = useState(false);

  const { control, handleSubmit, reset } = useFormContext<AddPetFormValues>();
  const { exit } = useAddPetExit();
  const { fields } = useFieldArray({ control, name: 'feedTimes' });
  const name = useWatch({ control, name: 'name' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  const isBusy = isAdding || isUploading;

  // Every field handleSubmit can reject lives on step 1, so a failure has to
  // send the member there or the button does nothing.
  const create = handleSubmit(
    async (values) => {
      setIsUploading(true);

      let photoUrl: string | null = null;

      try {
        if (values.photoUri && userId) {
          photoUrl = await PetPhotoService.uploadCover({ userId, localUri: values.photoUri });
        }
      } finally {
        setIsUploading(false);
      }

      addPet(
        {
          name: values.name.trim(),
          breedId: values.breedId,
          breedFreetext: null,
          sex: values.sex,
          birthdate: values.birthdate,
          birthdateIsApproximate: values.ageMode === 'approximate',
          photoUrl,
          petType: values.petType,
          feedingTimes: values.feedTimes.map((feedTime) => ({
            scheduledTime: feedTime.localTime,
            label: feedTime.label,
            daysOfWeek: feedTime.daysOfWeek,
            instructions: feedTime.instructions
          }))
        },
        {
          onSuccess: (pet) => {
            reset();
            // The pet's own screen is the summary.
            router.replace(`/home/${pet.id}`);
          }
        }
      );
    },
    () => {
      showErrorToast(ErrorMessage.MissingPetDetails);
      router.dismissTo('/home/add-pet');
    }
  );

  return (
    <FlowScreen
      step={3}
      stepCount={ADD_PET_STEP_COUNT}
      title={`What does ${name || 'your pet'} get?`}
      subtitle="Whoever feeds them sees this when they log it. A sitter will thank you."
      closeLabel="Close, and do not add this pet"
      onClose={exit}
      onBack={() => router.back()}
      isKeyboardAware
      footer={
        <>
          <MainButton
            text={`Add ${name || 'pet'}`}
            isLoading={isBusy}
            isDisabled={isBusy}
            onPress={() => void create()}
          />

          <MainButton
            text="Add without instructions"
            variant="text"
            isDisabled={isBusy}
            onPress={() => void create()}
          />
        </>
      }>
      {fields.map((field, index) => {
        const feedTime = feedTimes[index];

        if (!feedTime) return null;

        return (
          <View key={field.id} style={styles.card}>
            <AppText size="callout" fontWeight="bold">
              {optionLabel(FEEDING_SCHEDULE_LABEL_OPTIONS, feedTime.label)}
              {'  ·  '}
              {dayjs(feedTime.localTime, 'HH:mm').format('h:mm A')}
            </AppText>

            <Controller
              control={control}
              name={`feedTimes.${index}.instructions`}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInputValidated
                  name={`feedTimes.${index}.instructions`}
                  label="Instructions"
                  placeholder="Half a tin of wet food + 1 cup dry"
                  value={value ?? ''}
                  onBlur={onBlur}
                  onChangeText={(next: string) => onChange(next === '' ? null : next)}
                  isMultiline
                />
              )}
            />
          </View>
        );
      })}
    </FlowScreen>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    card: {
      gap: spacing.two,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    }
  });

export default AddPetInstructions;
