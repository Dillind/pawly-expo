import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ToggleSwitch from '@/components/core/toggle-switch';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { petDetailsEditSchema, type PetDetailsEditValues } from '@/constants/schemas/pet-details';
import type { AppTheme } from '@/constants/theme';
import { useUpdatePet } from '@/hooks/queries/use-update-pet';
import { useStyles } from '@/hooks/use-styles';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import type { PetSex } from '@/types/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const sexOptions = ['male', 'female'];

export type EditablePetDetails = {
  name: string;
  breed: string | null;
  sex: PetSex | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
};

type Props = {
  petId: string;
  details: EditablePetDetails;
  onDone: () => void;
};

const EditPetDetails = ({ petId, details, onDone }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: updatePet, isPending: isSaving } = useUpdatePet(petId);

  const form = useForm<PetDetailsEditValues>({
    resolver: zodResolver(petDetailsEditSchema),
    defaultValues: {
      name: details.name,
      breed: details.breed ?? '',
      sex: details.sex ?? undefined,
      birthdate: details.birthdate ?? '',
      birthdateIsApproximate: details.birthdateIsApproximate
    },
    mode: 'onBlur'
  });
  const { control, handleSubmit } = form;

  const onSubmit = handleSubmit((values) => {
    updatePet(
      {
        name: values.name,
        breed: values.breed,
        sex: values.sex,
        birthdate: values.birthdate,
        birthdateIsApproximate: values.birthdateIsApproximate
      },
      {
        onSuccess: () => {
          showSuccessToast(SuccessMessage.PetDetailsUpdated);
          onDone();
        },
        onError: () => {
          showErrorToast(ErrorMessage.PetDetailsUpdateFailed);
        }
      }
    );
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="name"
              label="Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Bailey"
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="breed"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="breed"
              label="Breed"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Labrador, mixed, not sure..."
              returnKeyType="done"
            />
          )}
        />

        <Controller
          control={control}
          name="sex"
          render={({ field: { onChange, value } }) => (
            <DropdownPickerValidated
              name="sex"
              label="Sex"
              items={sexOptions}
              value={value ?? ''}
              onChange={(next) => onChange(next as PetSex)}
              getText={(item) => (item === 'male' ? 'Male' : 'Female')}
            />
          )}
        />

        <Controller
          control={control}
          name="birthdate"
          render={({ field: { onChange, value } }) => (
            <DateTimePickerValidated
              name="birthdate"
              label="Birthdate"
              selectedDate={value}
              setSelectedDate={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="birthdateIsApproximate"
          render={({ field: { onChange, value } }) => (
            <ToggleSwitch
              label="Approximate date"
              description="I'm not sure of the exact date"
              value={value}
              onChange={onChange}
            />
          )}
        />

        <MainButton
          text={isSaving ? 'Saving…' : 'Save'}
          isLoading={isSaving}
          isDisabled={isSaving}
          onPress={() => void onSubmit()}
        />
      </View>
    </FormProvider>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    form: { gap: spacing.three }
  });

export default EditPetDetails;
