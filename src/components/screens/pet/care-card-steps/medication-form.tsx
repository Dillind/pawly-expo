import TextInputValidated from '@/components/core/text-input-validated';
import type { AppTheme } from '@/constants/theme';
import { useUpsertMedication } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { medicationSchema, type MedicationInput } from '@/lib/form/pet-schemas';
import type { Medication } from '@/services/care-card.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, useWatch, type Control } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import StepFooter from './step-footer';

type MedicationField = {
  name: keyof MedicationInput;
  label: string;
  placeholder: string;
  isMultiline?: boolean;
  isRequired?: boolean;
};

const MEDICATION_FIELDS: MedicationField[] = [
  { name: 'name', label: 'Name', placeholder: 'Apoquel', isRequired: true },
  { name: 'dose', label: 'Dose', placeholder: '16mg, one tablet' },
  { name: 'scheduleText', label: 'When', placeholder: 'Every morning with food' },
  {
    name: 'instructions',
    label: 'How',
    placeholder: 'Hide it in cheese. She will spit it out otherwise.',
    isMultiline: true
  }
];

const MEDICATION_MULTILINE_HEIGHT = 90;

const MedicationFieldInput = ({
  control,
  field
}: {
  control: Control<MedicationInput>;
  field: MedicationField;
}) => {
  const value = useWatch({ control, name: field.name });

  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: { onChange } }) => (
        <TextInputValidated
          name={field.name}
          label={field.label}
          isLabelIndicated={field.isRequired}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChangeText={onChange}
          isMultiline={field.isMultiline}
          height={field.isMultiline ? MEDICATION_MULTILINE_HEIGHT : undefined}
        />
      )}
    />
  );
};

type Props = {
  petId: string;
  medication: Medication | null;
  onDone: () => void;
};

const MedicationForm = ({ petId, medication, onDone }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: upsertMedication, isPending: isSaving } = useUpsertMedication(petId);

  const form = useForm<MedicationInput>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: medication?.name ?? '',
      dose: medication?.dose ?? null,
      scheduleText: medication?.scheduleText ?? null,
      instructions: medication?.instructions ?? null
    }
  });

  const onSubmit = form.handleSubmit((values) => {
    upsertMedication(
      {
        name: values.name,
        dose: values.dose || null,
        scheduleText: values.scheduleText || null,
        instructions: values.instructions || null,
        id: medication?.id
      },
      { onSuccess: onDone }
    );
  });

  return (
    <FormProvider {...form}>
      <View style={styles.fields}>
        {MEDICATION_FIELDS.map((field) => (
          <MedicationFieldInput key={field.name} control={form.control} field={field} />
        ))}
      </View>

      <StepFooter
        isBusy={isSaving}
        backLabel="Cancel"
        nextLabel="Save"
        onBack={onDone}
        onNext={() => void onSubmit()}
      />
    </FormProvider>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    fields: { gap: spacing.three }
  });

export default MedicationForm;
