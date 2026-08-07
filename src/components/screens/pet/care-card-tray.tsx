import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_FIELD_PLACEHOLDERS,
  CARE_CARD_FIELDS,
  CARE_CARD_MULTILINE_FIELDS,
  CARE_CARD_PHONE_FIELDS,
  CARE_CARD_SECTIONS,
  type CareCardField,
  type CareCardSection
} from '@/constants/care-card-fields';
import type { AppTheme } from '@/constants/theme';
import {
  useDeleteMedication,
  useUpsertCareCard,
  useUpsertMedication
} from '@/hooks/queries/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import {
  careCardSchema,
  medicationSchema,
  type CareCardInput,
  type MedicationInput
} from '@/lib/form/pet-schemas';
import type { CareCard, Medication } from '@/services/care-card.service';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import MedicationList from './medication-list';

const MEDICATION_STEP = 'medication';

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
          height={isMultiline ? 110 : 46}
        />
      )}
    />
  );
};

type SectionStepProps = {
  petId: string;
  card: CareCard;
  section: CareCardSection;
  nextSectionId: string | null;
};

const SectionStep = ({ petId, card, section, nextSectionId }: SectionStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo, close } = useTray();
  const { mutate: upsertCareCard, isPending: isSaving } = useUpsertCareCard(petId);

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

    upsertCareCard(patch, {
      onSuccess: () => (nextSectionId ? goTo(nextSectionId) : close())
    });
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <AppText color="textSecondary" size={14}>
          {section.blurb}
        </AppText>

        {section.fields.map((field) => (
          <FieldInput key={field} field={field} />
        ))}

        <MainButton
          text={nextSectionId ? 'Save and continue' : 'Save'}
          isLoading={isSaving}
          isDisabled={isSaving}
          onPress={() => void onSubmit()}
        />

        {nextSectionId && (
          <MainButton
            text="Skip for now"
            variant="text"
            isDisabled={isSaving}
            onPress={() => goTo(nextSectionId)}
          />
        )}
      </View>
    </FormProvider>
  );
};

type OverviewStepProps = {
  card: CareCard;
  medications: Medication[];
  onEditMedication: (medication: Medication | null) => void;
  onDeleteMedication: (medication: Medication) => void;
  deletingMedicationId: string | null;
};

const OverviewStep = ({
  card,
  medications,
  onEditMedication,
  onDeleteMedication,
  deletingMedicationId
}: OverviewStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  const openMedication = (medication: Medication | null) => {
    onEditMedication(medication);
    goTo(MEDICATION_STEP);
  };

  return (
    <View style={styles.overview}>
      {CARE_CARD_SECTIONS.map((section) => {
        const filled = section.fields.filter((field) => Boolean(card[field])).length;

        return (
          <View key={section.id} style={styles.overviewRow}>
            <AppText size={16} onPress={() => goTo(section.id)}>
              {section.title}
            </AppText>
            <AppText color="textSecondary" size={13}>
              {filled ? `${filled} of ${section.fields.length}` : 'Nothing yet'}
            </AppText>
          </View>
        );
      })}

      <MedicationList
        medications={medications}
        onAdd={() => openMedication(null)}
        onEdit={openMedication}
        onDelete={onDeleteMedication}
        deletingMedicationId={deletingMedicationId}
      />
    </View>
  );
};

type MedicationStepProps = { petId: string; medication: Medication | null };

const MedicationStep = ({ petId, medication }: MedicationStepProps) => {
  const styles = useStyles(makeStyles);
  const { close } = useTray();
  const { mutate: upsertMedication, isPending: isSavingMedication } = useUpsertMedication(petId);
  const { mutate: deleteMedication, isPending: isDeletingMedication } = useDeleteMedication(petId);

  const form = useForm<MedicationInput>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      name: medication?.name ?? '',
      dose: medication?.dose ?? null,
      scheduleText: medication?.scheduleText ?? null,
      instructions: medication?.instructions ?? null
    }
  });
  const { control, handleSubmit } = form;

  const name = useWatch({ control, name: 'name' });
  const dose = useWatch({ control, name: 'dose' });
  const scheduleText = useWatch({ control, name: 'scheduleText' });
  const instructions = useWatch({ control, name: 'instructions' });

  const onSubmit = handleSubmit((values) => {
    upsertMedication(
      {
        name: values.name,
        dose: values.dose || null,
        scheduleText: values.scheduleText || null,
        instructions: values.instructions || null,
        id: medication?.id
      },
      { onSuccess: close }
    );
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange } }) => (
            <TextInputValidated
              placeholder="Apoquel"
              name="name"
              label="Name"
              value={name ?? ''}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="dose"
          render={({ field: { onChange } }) => (
            <TextInputValidated
              placeholder="16mg, one tablet"
              name="dose"
              label="Dose"
              value={dose ?? ''}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="scheduleText"
          render={({ field: { onChange } }) => (
            <TextInputValidated
              placeholder="Every morning with food"
              name="scheduleText"
              label="When"
              value={scheduleText ?? ''}
              onChangeText={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="instructions"
          render={({ field: { onChange } }) => (
            <TextInputValidated
              placeholder="Hide it in cheese. She will spit it out otherwise."
              name="instructions"
              label="How"
              value={instructions ?? ''}
              onChangeText={onChange}
              isMultiline
              height={90}
            />
          )}
        />

        <MainButton
          text={isSavingMedication ? 'Saving…' : 'Save'}
          isLoading={isSavingMedication}
          isDisabled={isSavingMedication || isDeletingMedication}
          onPress={() => void onSubmit()}
        />

        {medication && (
          <MainButton
            text={isDeletingMedication ? 'Removing…' : 'Remove this medication'}
            variant="text"
            isLoading={isDeletingMedication}
            isDisabled={isSavingMedication || isDeletingMedication}
            onPress={() => deleteMedication(medication.id, { onSuccess: close })}
          />
        )}
      </View>
    </FormProvider>
  );
};

type Props = {
  petId: string;
  card: CareCard;
  medications: Medication[];
  sheetRef: RefObject<TrueSheet | null>;
};

const CareCardTray = ({ petId, card, medications, sheetRef }: Props) => {
  const [medicationTarget, setMedicationTarget] = useState<Medication | null>(null);
  const {
    mutate: deleteMedication,
    isPending: isDeletingMedication,
    variables: deletingId
  } = useDeleteMedication(petId);

  const steps: TrayStepDescriptor[] = [
    {
      id: 'overview',
      title: 'Care Card',
      render: () => (
        <OverviewStep
          card={card}
          medications={medications}
          onEditMedication={setMedicationTarget}
          onDeleteMedication={(medication) => deleteMedication(medication.id)}
          deletingMedicationId={isDeletingMedication ? (deletingId ?? null) : null}
        />
      )
    },
    ...CARE_CARD_SECTIONS.map((section, index) => ({
      id: section.id,
      title: section.title,
      render: () => (
        <SectionStep
          petId={petId}
          card={card}
          section={section}
          nextSectionId={CARE_CARD_SECTIONS[index + 1]?.id ?? null}
        />
      )
    })),
    {
      id: MEDICATION_STEP,
      title: medicationTarget ? `Edit ${medicationTarget.name}` : 'Add a medication',
      render: () => <MedicationStep petId={petId} medication={medicationTarget} />
    }
  ];

  return (
    <Tray
      sheetRef={sheetRef}
      steps={steps}
      onDismiss={() => setMedicationTarget(null)}
    />
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    overview: { gap: spacing.three },
    overviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.three
    },
    form: { gap: spacing.three }
  });

export default CareCardTray;
