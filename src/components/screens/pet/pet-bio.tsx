import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import { ErrorMessage, SuccessMessage } from '@/constants/enums';
import type { AppTheme } from '@/constants/theme';
import { useHousehold } from '@/hooks/queries/use-household';
import { useUpdatePet } from '@/hooks/queries/use-update-pet';
import { useStyles } from '@/hooks/use-styles';
import { bioSchema, type BioInput } from '@/lib/form/pet-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

type EditStepProps = {
  petId: string;
  bio: string | null;
  onDone: () => void;
};

const EditStep = ({ petId, bio, onDone }: EditStepProps) => {
  const styles = useStyles(makeStyles);
  const { mutate: updatePet, isPending: isSaving } = useUpdatePet(petId, {
    success: SuccessMessage.BioUpdated,
    failure: ErrorMessage.BioUpdateFailed
  });

  const form = useForm<BioInput>({
    resolver: zodResolver(bioSchema),
    defaultValues: { bio: bio ?? '' }
  });
  const { control, handleSubmit } = form;

  const bioValue = useWatch({ control, name: 'bio' });

  const onSubmit = handleSubmit((values) => {
    updatePet({ bio: values.bio || null }, { onSuccess: onDone });
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
              placeholder="Loves the dog park, and a belly rub after dinner."
              value={bioValue ?? ''}
              onChangeText={onChange}
              isMultiline
              height={120}
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

type Props = { petId: string; name: string; bio: string | null };

const PetBio = ({ petId, name, bio }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const { data: household } = useHousehold();

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
        {household?.isOwner && (
          <IconButton
            name="pencil"
            accessibilityLabel="Edit bio"
            variant="ghost"
            size={18}
            onPress={() => void sheetRef.current?.present()}
          />
        )}
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
