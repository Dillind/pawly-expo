import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type Control } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import FormTextInput from '@/components/core/form-text-input';
import type { AppTheme } from '@/constants/theme';
import { useUpsertContact } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { careCardContactSchema, type CareCardContactInput } from '@/lib/form/pet-schemas';
import type { CareCardContact } from '@/services/care-card.service';

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
  return (
    <FormTextInput
      control={control}
      name={field.name}
      label={field.label}
      isLabelIndicated
      placeholder={field.placeholder}
      keyboardType={field.isPhone ? 'phone-pad' : 'default'}
      autoCapitalize={field.isPhone ? 'none' : 'words'}
    />
  );
};

type Props = {
  petId: string;
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
