import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
import DropdownPickerValidated from '@/components/core/dropdown-picker-validated';
import BreedField from '@/components/core/breed-field';
import MainButton from '@/components/core/main-button';
import SegmentedControl from '@/components/core/segmented-control';
import TextInputValidated from '@/components/core/text-input-validated';
import ToggleSwitch from '@/components/core/toggle-switch';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import { breedName, breedSpeciesFor } from '@/constants/breeds';
import { PET_TYPE_OPTIONS, SEX_OPTIONS } from '@/constants/options';
import type { PetDetailsEditValues } from '@/constants/schemas/pet-details';
import type { AppTheme } from '@/constants/theme';
import { useRemovePet } from '@/hooks/queries/pet/use-pet-mutations';
import { useUpdatePet } from '@/hooks/queries/pet/use-update-pet';
import type { PetSex, PetType } from '@/types/core';
import { useStyles } from '@/hooks/use-styles';
import { useTray } from '@/components/core/tray';
import { useRouter } from 'expo-router';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';

export type EditablePetDetails = {
  name: string;
  petType: PetType;
  breedId: string | null;
  /** The free text the row still holds, shown while nothing in the list matches. */
  breedFreetext: string | null;
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
  const router = useRouter();
  const { goTo } = useTray();
  const { mutate: removePet, isPending: isRemoving } = useRemovePet();
  const { mutate: updatePet, isPending: isSaving } = useUpdatePet(petId, {
    success: SuccessMessage.PetDetailsUpdated,
    failure: ErrorMessage.PetDetailsUpdateFailed
  });

  const { control, handleSubmit, setValue } = useFormContext<PetDetailsEditValues>();

  const petType = useWatch({ control, name: 'petType' });
  const breedId = useWatch({ control, name: 'breedId' });

  const breedSpecies = breedSpeciesFor(petType);

  const onSubmit = handleSubmit((values) => {
    updatePet(
      {
        name: values.name,
        petType: values.petType,
        breedId: values.breedId,
        // Picking from the list retires the free text this pet was carrying.
        ...(values.breedId ? { breedFreetext: null } : {}),
        sex: values.sex,
        birthdate: values.birthdate,
        birthdateIsApproximate: values.birthdateIsApproximate
      },
      { onSuccess: onDone }
    );
  });

  const confirmRemove = () =>
    Alert.alert(
      `Remove ${details.name}?`,
      `This deletes every feed logged for ${details.name}, their Care Card, their photos and their feeding schedule. It cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            removePet(petId, {
              onSuccess: () => {
                onDone();
                router.replace('/home');
              }
            })
        }
      ]
    );

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInputValidated
            name="name"
            label="Name"
            isLabelIndicated
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Bailey"
            returnKeyType="next"
          />
        )}
      />

      {/* No `isLabelIndicated`: the row always carries a type, so the
            control never starts unset. */}
      <Controller
        control={control}
        name="petType"
        render={({ field: { onChange, value } }) => (
          <SegmentedControl
            name="petType"
            label="Pet type"
            options={PET_TYPE_OPTIONS}
            value={value}
            onChange={(next) => {
              onChange(next);
              // A dog breed is not a cat breed, and `other` has no list at
              // all. Changing the type clears a value that no longer applies.
              if (breedSpeciesFor(next) !== breedSpecies) {
                setValue('breedId', null, { shouldDirty: true });
              }
            }}
          />
        )}
      />

      {/* No breed field for `other`: we hold no breed list for a rabbit or
            a bird. */}
      {breedSpecies && (
        <BreedField
          value={breedName(breedId) ?? details.breedFreetext}
          onPress={() => goTo('breed')}
        />
      )}

      <Controller
        control={control}
        name="sex"
        render={({ field: { onChange, value } }) => (
          <DropdownPickerValidated
            name="sex"
            label="Sex"
            isLabelIndicated
            options={SEX_OPTIONS}
            value={value ?? ''}
            onChange={onChange}
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
            isLabelIndicated
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
        isDisabled={isSaving || isRemoving}
        onPress={() => void onSubmit()}
      />

      <MainButton
        text={`Remove ${details.name}`}
        variant="destructiveText"
        size="sm"
        isLoading={isRemoving}
        isDisabled={isSaving || isRemoving}
        onPress={confirmRemove}
      />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    form: { gap: spacing.three }
  });

export default EditPetDetails;
