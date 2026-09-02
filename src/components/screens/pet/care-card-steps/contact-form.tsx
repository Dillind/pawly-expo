import AppText from '@/components/core/app-text';
import TextInputValidated from '@/components/core/text-input-validated';
import type { AppTheme } from '@/constants/theme';
import { useUpsertContact } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { careCardContactSchema, type CareCardContactInput } from '@/lib/form/pet-schemas';
import type { CareCardContact } from '@/services/care-card.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, useWatch, type Control } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import StepFooter from './step-footer';

type ContactField = {
  name: keyof CareCardContactInput;
  label: string;
  placeholder: string;
  isPhone?: boolean;
};

const CONTACT_FIELDS: ContactField[] = [
  { name: 'name', label: 'Name', placeholder: 'Priya next door' },
  { name: 'phone', label: 'Contact number', placeholder: '0433 221 100', isPhone: true }
];

const ContactFieldInput = ({
  control,
  field
}: {
  control: Control<CareCardContactInput>;
  field: ContactField;
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
          isLabelIndicated
          placeholder={field.placeholder}
          value={value ?? ''}
          onChangeText={onChange}
          keyboardType={field.isPhone ? 'phone-pad' : 'default'}
          autoCapitalize={field.isPhone ? 'none' : 'words'}
        />
      )}
    />
  );
};

type Props = {
  petId: string;
  /** Null when adding rather than editing. */
  contact: CareCardContact | null;
  onDone: () => void;
};

// In place, not a sheet: a TrueSheet over the editor's `fullScreenModal`
// presents at zero height on iOS and swallows every touch.
const ContactForm = ({ petId, contact, onDone }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: upsertContact, isPending: isSaving } = useUpsertContact(petId);

  const form = useForm<CareCardContactInput>({
    resolver: zodResolver(careCardContactSchema),
    defaultValues: { name: contact?.name ?? '', phone: contact?.phone ?? '' }
  });

  const onSubmit = form.handleSubmit((values) => {
    upsertContact({ ...values, id: contact?.id }, { onSuccess: onDone });
  });

  return (
    <FormProvider {...form}>
      <View style={styles.fields}>
        <AppText color="textSecondary" size={15}>
          Someone a sitter can ring when they cannot get hold of you.
        </AppText>

        {CONTACT_FIELDS.map((field) => (
          <ContactFieldInput key={field.name} control={form.control} field={field} />
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
    fields: {
      gap: spacing.three
    }
  });

export default ContactForm;
