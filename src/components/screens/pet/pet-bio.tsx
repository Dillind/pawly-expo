import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useUpdatePet } from '@/hooks/use-update-pet';
import FieldError from '@/lib/form/components/field-error';
import { bioSchema, type BioInput } from '@/lib/form/pet-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

type EditStepProps = {
  petId: string;
  bio: string | null;
  onDone: () => void;
};

const EditStep = ({ petId, bio, onDone }: EditStepProps) => {
  const styles = useStyles(makeStyles);
  const updatePet = useUpdatePet(petId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<BioInput>({
    resolver: zodResolver(bioSchema),
    defaultValues: { bio: bio ?? '' }
  });
  const { control, handleSubmit } = form;

  const bioValue = useWatch({ control, name: 'bio' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await updatePet.mutateAsync({ bio: values.bio });
      onDone();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the bio');
    }
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange } }) => (
            <TextInputValidated
              name="bio"
              value={bioValue ?? ''}
              onChangeText={onChange}
              isMultiline
              height={120}
              placeholder="Add a few words about this pet"
            />
          )}
        />

        <FieldError error={submitError ?? undefined} />

        <MainButton
          text={updatePet.isPending ? 'Saving…' : 'Save'}
          isLoading={updatePet.isPending}
          isDisabled={updatePet.isPending}
          onPress={() => void onSubmit()}
        />
      </View>
    </FormProvider>
  );
};

type Props = { petId: string; name: string; bio: string | null };

const PetBio = ({ petId, name, bio }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);

  const steps: TrayStepDescriptor[] = [
    {
      id: 'edit',
      title: 'Edit bio',
      render: () => (
        <EditStep petId={petId} bio={bio} onDone={() => void sheetRef.current?.dismiss()} />
      )
    }
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="header" size={20}>
          About
        </AppText>
        <IconButton
          name="pencil"
          accessibilityLabel="Edit bio"
          variant="ghost"
          size={18}
          onPress={() => void sheetRef.current?.present()}
        />
      </View>

      {bio ? (
        <AppText size={16}>{bio}</AppText>
      ) : (
        <AppText color="textSecondary" size={14}>
          Add a few words about {name}
        </AppText>
      )}

      <Tray sheetRef={sheetRef} steps={steps} />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    section: { gap: spacing.two },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    form: { gap: spacing.three }
  });

export default PetBio;
