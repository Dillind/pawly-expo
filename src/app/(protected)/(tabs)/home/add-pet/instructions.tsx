import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import FlowStepper from '@/components/ui/flow-stepper';
import { ADD_PET_STEPS } from '@/constants/schemas/add-pet';
import { FEEDING_SCHEDULE_LABEL_OPTIONS } from '@/constants/options';
import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { ErrorMessage } from '@/constants/enums';
import { useAddPet } from '@/hooks/queries/pet/use-pet-mutations';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast } from '@/lib/toast';
import PetPhotoService from '@/services/pet-photo.service';
import { useAuthStore } from '@/stores/auth-store';
import { optionLabel } from '@/utils/options';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
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

  const { control, handleSubmit, reset } = useFormContext<AddPetFormValues>();
  const { fields } = useFieldArray({ control, name: 'feedTimes' });
  const name = useWatch({ control, name: 'name' });
  const feedTimes = useWatch({ control, name: 'feedTimes' });

  const isBusy = isAdding || isUploading;

  // Every field handleSubmit can reject lives on step 1, two screens back, so
  // a failure has to send the member there. Otherwise the button does nothing.
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
          breed: values.breed.trim(),
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
            // The pet's own screen is the summary, and it teaches where to edit
            // all of this later.
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
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        isKeyboardAware
        contentContainerStyle={styles.content}>
        <FlowStepper current={3} steps={ADD_PET_STEPS} />

        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            What does {name || 'your pet'} get?
          </AppText>
          <AppText size={15} color="textSecondary">
            Whoever feeds them sees this when they log it. A sitter will thank you.
          </AppText>
        </View>

        {fields.map((field, index) => {
          const feedTime = feedTimes[index];

          if (!feedTime) return null;

          return (
            <View key={field.id} style={styles.card}>
              <AppText size={15} fontWeight="bold">
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
