import AppText from '@/components/core/app-text';
import TextInputValidated from '@/components/core/text-input-validated';
import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_FIELD_PLACEHOLDERS,
  CARE_CARD_FIELDS,
  CARE_CARD_MULTILINE_FIELDS,
  CARE_CARD_PHONE_FIELDS,
  type CareCardField,
  type CareCardSection
} from '@/constants/care-card-fields';
import type { AppTheme } from '@/constants/theme';
import { useUpsertCareCard } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { careCardSchema, type CareCardInput } from '@/lib/form/pet-schemas';
import type { CareCard } from '@/services/care-card.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import StepFooter from './step-footer';

const MULTILINE_HEIGHT = 110;
const SINGLE_LINE_HEIGHT = 46;

const toInput = (card: CareCard): CareCardInput =>
  Object.fromEntries(CARE_CARD_FIELDS.map((field) => [field, card[field]])) as CareCardInput;

const FieldInput = ({ field }: { field: CareCardField }) => {
  const { control } = useFormContext<CareCardInput>();
  const value = useWatch({ control, name: field });
  const isMultiline = CARE_CARD_MULTILINE_FIELDS.has(field);

  return (
    <Controller
      control={control}
      name={field}
      render={({ field: { onChange } }) => (
        <TextInputValidated
          name={field}
          label={CARE_CARD_FIELD_LABELS[field]}
          placeholder={CARE_CARD_FIELD_PLACEHOLDERS[field]}
          value={value ?? ''}
          onChangeText={onChange}
          keyboardType={CARE_CARD_PHONE_FIELDS.has(field) ? 'phone-pad' : 'default'}
          isMultiline={isMultiline}
          height={isMultiline ? MULTILINE_HEIGHT : SINGLE_LINE_HEIGHT}
        />
      )}
    />
  );
};

type Props = {
  petId: string;
  card: CareCard;
  section: CareCardSection;
  isFirst: boolean;
  onBack: () => void;
  onNext: () => void;
};

const SectionStep = ({ petId, card, section, isFirst, onBack, onNext }: Props) => {
  const styles = useStyles(makeStyles);
  const { mutate: upsertCareCard, isPending: isSaving } = useUpsertCareCard(petId, {
    isSilent: true
  });

  const form = useForm<CareCardInput>({
    resolver: zodResolver(careCardSchema),
    defaultValues: toInput(card)
  });

  // Only this step's fields are sent. The form holds the whole card so the
  // resolver has something complete to validate, but writing all of it back
  // would clobber another member's edit to a field this step never showed.
  const onSubmit = form.handleSubmit((values) => {
    const patch = Object.fromEntries(
      section.fields.map((field) => [field, values[field] || null])
    ) as Partial<CareCardInput>;

    upsertCareCard(patch, { onSuccess: onNext });
  });

  return (
    <FormProvider {...form}>
      <View style={styles.fields}>
        <AppText color="textSecondary" size={15}>
          {section.blurb}
        </AppText>

        {section.fields.map((field) => (
          <FieldInput key={field} field={field} />
        ))}
      </View>

      <StepFooter
        isFirst={isFirst}
        isBusy={isSaving}
        onBack={onBack}
        onNext={() => void onSubmit()}
      />
    </FormProvider>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    fields: { gap: spacing.three }
  });

export default SectionStep;
