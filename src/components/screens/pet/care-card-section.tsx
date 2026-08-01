import AppText from '@/components/core/app-text';
import ErrorState from '@/components/core/error-state';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import type { AppTheme } from '@/constants/theme';
import { type CareCard, type Medication, useCareCard } from '@/hooks/use-care-card';
import {
  useDeleteMedication,
  useUpsertCareCard,
  useUpsertMedication
} from '@/hooks/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import FieldError from '@/lib/form/components/field-error';
import {
  careCardSchema,
  medicationSchema,
  type CareCardInput,
  type MedicationInput
} from '@/lib/form/pet-schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import MedicationList from './medication-list';

type FieldKey = keyof CareCardInput;

type FieldGroup = { heading: string; fields: FieldKey[] };

const FIELD_LABELS: Record<FieldKey, string> = {
  allergies: 'Allergies',
  vetName: 'Vet name',
  vetPhone: 'Vet phone',
  emergencyVetName: 'Emergency vet name',
  emergencyVetPhone: 'Emergency vet phone',
  microchipNumber: 'Microchip number',
  insuranceProvider: 'Insurance provider',
  insurancePolicyNumber: 'Insurance policy number',
  feedingNotes: 'Feeding notes',
  notes: 'Notes'
};

// An example beats an instruction: the placeholder shows the shape of a good
// answer, which is what a Contributor reading this in a hurry needs.
const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  allergies: 'Chicken, and grass seeds in summer',
  vetName: 'Northcote Vet Clinic',
  vetPhone: '03 9482 1234',
  emergencyVetName: 'Melbourne Animal Emergency',
  emergencyVetPhone: '03 9370 5555',
  microchipNumber: '956000012345678',
  insuranceProvider: 'Petplan',
  insurancePolicyNumber: 'PP-4821993',
  feedingNotes: 'Half a scoop, soaked for five minutes',
  notes: 'Nervous around bikes. Lead stays on near the road.'
};

const MULTILINE_FIELDS: ReadonlySet<FieldKey> = new Set(['allergies', 'feedingNotes', 'notes']);

const FIELD_GROUPS: FieldGroup[] = [
  { heading: 'Allergies', fields: ['allergies'] },
  { heading: 'Vet', fields: ['vetName', 'vetPhone'] },
  { heading: 'Emergency', fields: ['emergencyVetName', 'emergencyVetPhone'] },
  {
    heading: 'Identification',
    fields: ['microchipNumber', 'insuranceProvider', 'insurancePolicyNumber']
  },
  { heading: 'Feeding', fields: ['feedingNotes'] },
  { heading: 'Notes', fields: ['notes'] }
];

const emptyCareCard = (petId: string): CareCard => ({
  petId,
  allergies: null,
  vetName: null,
  vetPhone: null,
  emergencyVetName: null,
  emergencyVetPhone: null,
  microchipNumber: null,
  insuranceProvider: null,
  insurancePolicyNumber: null,
  feedingNotes: null,
  notes: null
});

const toInput = (card: CareCard): CareCardInput => ({
  allergies: card.allergies,
  vetName: card.vetName,
  vetPhone: card.vetPhone,
  emergencyVetName: card.emergencyVetName,
  emergencyVetPhone: card.emergencyVetPhone,
  microchipNumber: card.microchipNumber,
  insuranceProvider: card.insuranceProvider,
  insurancePolicyNumber: card.insurancePolicyNumber,
  feedingNotes: card.feedingNotes,
  notes: card.notes
});

type OverviewStepProps = { card: CareCard; onSelectField: (field: FieldKey) => void };

const OverviewStep = ({ card, onSelectField }: OverviewStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  return (
    <View style={styles.overview}>
      {FIELD_GROUPS.map((group) => (
        <View key={group.heading} style={styles.overviewGroup}>
          <AppText color="textSecondary" size={13}>
            {group.heading}
          </AppText>
          {group.fields.map((field) => (
            <AppText
              key={field}
              size={16}
              onPress={() => {
                onSelectField(field);
                goTo('edit-field');
              }}>
              {FIELD_LABELS[field]}
              {card[field] ? '' : ' — not set'}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
};

type FieldEditStepProps = { petId: string; card: CareCard; field: FieldKey };

const FieldEditStep = ({ petId, card, field }: FieldEditStepProps) => {
  const styles = useStyles(makeStyles);
  const { close } = useTray();
  const upsertCareCard = useUpsertCareCard(petId);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CareCardInput>({
    resolver: zodResolver(careCardSchema),
    defaultValues: toInput(card)
  });
  const { control, handleSubmit } = form;
  const value = useWatch({ control, name: field });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await upsertCareCard.mutateAsync({ [field]: values[field] || null });
      close();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the care card');
    }
  });

  return (
    <FormProvider {...form}>
      <View style={styles.form}>
        <Controller
          control={control}
          name={field}
          render={({ field: { onChange } }) => (
            <TextInputValidated
              name={field}
              label={FIELD_LABELS[field]}
              placeholder={FIELD_PLACEHOLDERS[field]}
              value={value ?? ''}
              onChangeText={onChange}
              isMultiline={MULTILINE_FIELDS.has(field)}
              height={MULTILINE_FIELDS.has(field) ? 120 : 46}
            />
          )}
        />

        <FieldError error={submitError ?? undefined} />

        <MainButton
          text={upsertCareCard.isPending ? 'Saving…' : 'Save'}
          isLoading={upsertCareCard.isPending}
          isDisabled={upsertCareCard.isPending}
          onPress={() => void onSubmit()}
        />
      </View>
    </FormProvider>
  );
};

type MedicationEditStepProps = { petId: string; medication: Medication | null };

const MedicationEditStep = ({ petId, medication }: MedicationEditStepProps) => {
  const styles = useStyles(makeStyles);
  const { close } = useTray();
  const upsertMedication = useUpsertMedication(petId);
  const deleteMedication = useDeleteMedication(petId);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await upsertMedication.mutateAsync({
        name: values.name,
        dose: values.dose || null,
        scheduleText: values.scheduleText || null,
        instructions: values.instructions || null,
        id: medication?.id
      });
      close();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the medication');
    }
  });

  const onDelete = async () => {
    if (!medication) return;
    setSubmitError(null);
    try {
      await deleteMedication.mutateAsync(medication.id);
      close();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not remove the medication');
    }
  };

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

        <FieldError error={submitError ?? undefined} />

        <MainButton
          text={upsertMedication.isPending ? 'Saving…' : 'Save'}
          isLoading={upsertMedication.isPending}
          isDisabled={upsertMedication.isPending || deleteMedication.isPending}
          onPress={() => void onSubmit()}
        />

        {medication && (
          <MainButton
            text={deleteMedication.isPending ? 'Removing…' : 'Remove this medication'}
            variant="text"
            isLoading={deleteMedication.isPending}
            isDisabled={upsertMedication.isPending || deleteMedication.isPending}
            onPress={() => void onDelete()}
          />
        )}
      </View>
    </FormProvider>
  );
};

type Props = { petId: string };

const CareCardSection = ({ petId }: Props) => {
  const styles = useStyles(makeStyles);
  const sheetRef = useRef<TrueSheet | null>(null);
  const { data, isLoading, isError, refetch } = useCareCard(petId);
  const deleteMedication = useDeleteMedication(petId);

  const [entryStep, setEntryStep] = useState<'overview' | 'edit-field' | 'edit-medication'>(
    'overview'
  );
  const [selectedField, setSelectedField] = useState<FieldKey | null>(null);
  const [medicationTarget, setMedicationTarget] = useState<Medication | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const card = data?.card ?? emptyCareCard(petId);
  const medications = data?.medications ?? [];
  const hasAnyCareCardValue = FIELD_GROUPS.some((group) =>
    group.fields.some((field) => Boolean(card[field]))
  );

  const openOverview = () => {
    setEntryStep('overview');
    void sheetRef.current?.present();
  };

  const selectField = (field: FieldKey) => setSelectedField(field);

  const openMedication = (medication: Medication | null) => {
    setMedicationTarget(medication);
    setEntryStep('edit-medication');
    void sheetRef.current?.present();
  };

  const handleDeleteMedication = async (medication: Medication) => {
    setDeleteError(null);
    try {
      await deleteMedication.mutateAsync(medication.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not remove the medication');
    }
  };

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load the Care Card"
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const allSteps: Record<'overview' | 'edit-field' | 'edit-medication', TrayStepDescriptor> = {
    overview: {
      id: 'overview',
      title: 'Care Card',
      render: () => <OverviewStep card={card} onSelectField={selectField} />
    },
    'edit-field': {
      id: 'edit-field',
      title: selectedField ? FIELD_LABELS[selectedField] : 'Edit',
      render: () =>
        selectedField ? (
          <FieldEditStep petId={petId} card={card} field={selectedField} />
        ) : null
    },
    'edit-medication': {
      id: 'edit-medication',
      title: medicationTarget ? `Edit ${medicationTarget.name}` : 'Add a medication',
      render: () => <MedicationEditStep petId={petId} medication={medicationTarget} />
    }
  };

  // Tray always opens on steps[0] -- put the tapped entry point first so a
  // field or medication row opens straight into its editor, while `overview`
  // (reached from the section header) still lists every field via `goTo`.
  const steps = [
    allSteps[entryStep],
    ...Object.values(allSteps).filter((step) => step.id !== entryStep)
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="header" size={20}>
          Care Card
        </AppText>
        <IconButton
          name="pencil"
          accessibilityLabel="Edit Care Card"
          variant="ghost"
          size={18}
          onPress={openOverview}
        />
      </View>

      {!hasAnyCareCardValue && (
        <AppText color="textSecondary" size={14}>
          Nothing here yet. Add what a sitter would need to know.
        </AppText>
      )}

      {hasAnyCareCardValue && (
        <View style={styles.groups}>
          {FIELD_GROUPS.filter((group) => group.fields.some((field) => Boolean(card[field]))).map(
            (group) => (
              <View key={group.heading} style={styles.group}>
                <AppText color="textSecondary" size={13}>
                  {group.heading}
                </AppText>
                {group.fields
                  .filter((field) => Boolean(card[field]))
                  .map((field) => (
                    <AppText key={field} size={16}>
                      {card[field]}
                    </AppText>
                  ))}
              </View>
            )
          )}
        </View>
      )}

      <FieldError error={deleteError ?? undefined} />

      <MedicationList
        medications={medications}
        onAdd={() => openMedication(null)}
        onEdit={(medication) => openMedication(medication)}
        onDelete={(medication) => void handleDeleteMedication(medication)}
        deletingMedicationId={
          deleteMedication.isPending ? (deleteMedication.variables ?? null) : null
        }
      />

      <Tray
        sheetRef={sheetRef}
        steps={steps}
        onDismiss={() => {
          setEntryStep('overview');
          setSelectedField(null);
          setMedicationTarget(null);
        }}
      />
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
    groups: { gap: spacing.three },
    group: { gap: spacing.half },
    overview: { gap: spacing.three },
    overviewGroup: { gap: spacing.half },
    form: { gap: spacing.three }
  });

export default CareCardSection;
