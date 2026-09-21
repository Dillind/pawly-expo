import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type ReactNode, type RefObject } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import ContactForm from '@/components/screens/pet/care-card-steps/contact-form';
import MedicationForm from '@/components/screens/pet/care-card-steps/medication-form';
import SectionStep from '@/components/screens/pet/care-card-steps/section-step';
import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_MULTILINE_FIELDS,
  CARE_CARD_STEPS,
  type CareCardField,
  type CareCardSection
} from '@/constants/care-card-fields';
import { Radius, type AppTheme } from '@/constants/theme';
import { useDeleteContact, useDeleteMedication } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { firstStepForSection, hasValue } from '@/lib/care-card-view';
import {
  MAX_CARE_CARD_CONTACTS,
  type CareCard,
  type CareCardContact,
  type Medication
} from '@/services/care-card.service';

const CONTACT_FORM_STEP = 'contact-form';
const MEDICATION_FORM_STEP = 'medication-form';

// The shared Tray has no scroller and sizes to its content, so a section with
// two long answers is split one field per step rather than made scrollable.
const fieldGroups = (section: CareCardSection): CareCardField[][] => {
  const multilineCount = section.fields.filter((field) =>
    CARE_CARD_MULTILINE_FIELDS.has(field)
  ).length;

  return multilineCount > 1 ? section.fields.map((field) => [field]) : [section.fields];
};

type EntryRowProps = {
  label: string;
  detail: string | null;
  onEdit: () => void;
  onRemove: () => void;
  isBusy: boolean;
};

const EntryRow = ({ label, detail, onEdit, onRemove, isBusy }: EntryRowProps) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.entry}>
      <PressableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}`}
        style={styles.entryText}
        onPress={onEdit}>
        <AppText size={16}>{label}</AppText>
        {detail && (
          <AppText size={13} color="textSecondary" numberOfLines={1}>
            {detail}
          </AppText>
        )}
      </PressableOpacity>

      <IconButton
        name="trash"
        accessibilityLabel={`Remove ${label}`}
        variant="ghost"
        color="error"
        size={18}
        isDisabled={isBusy}
        onPress={onRemove}
      />
    </View>
  );
};

type ContactsStepProps = {
  petId: string;
  contacts: CareCardContact[];
  onEdit: (contact: CareCardContact | null) => void;
};

const ContactsStep = ({ petId, contacts, onEdit }: ContactsStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo, close } = useTray();
  const { mutate: deleteContact, isPending: isDeleting } = useDeleteContact(petId);

  const edit = (contact: CareCardContact | null) => {
    onEdit(contact);
    goTo(CONTACT_FORM_STEP);
  };

  const confirmRemove = (contact: CareCardContact) => {
    Alert.alert(`Remove ${contact.name}?`, 'They will come off the Care Card.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Remove', style: 'destructive', onPress: () => deleteContact(contact.id) }
    ]);
  };

  return (
    <View style={styles.list}>
      <AppText color="textSecondary" size={15}>
        Who a sitter should ring, in the order they should try.
      </AppText>

      {contacts.map((contact) => (
        <EntryRow
          key={contact.id}
          label={contact.name}
          detail={contact.phone ?? 'No number given'}
          isBusy={isDeleting}
          onEdit={() => edit(contact)}
          onRemove={() => confirmRemove(contact)}
        />
      ))}

      {contacts.length < MAX_CARE_CARD_CONTACTS && (
        <MainButton
          text="Add contact"
          variant="secondary"
          leftIcon={<Icon name="plus" size={16} />}
          onPress={() => edit(null)}
        />
      )}

      <MainButton text="Done" onPress={close} />
    </View>
  );
};

type MedicationsStepProps = {
  petId: string;
  medications: Medication[];
  onEdit: (medication: Medication | null) => void;
};

const MedicationsStep = ({ petId, medications, onEdit }: MedicationsStepProps) => {
  const styles = useStyles(makeStyles);
  const { goTo, close } = useTray();
  const { mutate: deleteMedication, isPending: isDeleting } = useDeleteMedication(petId);

  const edit = (medication: Medication | null) => {
    onEdit(medication);
    goTo(MEDICATION_FORM_STEP);
  };

  const confirmRemove = (medication: Medication) => {
    Alert.alert(`Remove ${medication.name}?`, 'It will come off the Care Card.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMedication(medication.id) }
    ]);
  };

  return (
    <View style={styles.list}>
      <AppText color="textSecondary" size={15}>
        Anything they take, and how to get it into them.
      </AppText>

      {medications.map((medication) => (
        <EntryRow
          key={medication.id}
          label={medication.name}
          detail={[medication.dose, medication.scheduleText].filter(hasValue).join(' · ') || null}
          isBusy={isDeleting}
          onEdit={() => edit(medication)}
          onRemove={() => confirmRemove(medication)}
        />
      ))}

      <MainButton
        text="Add a medication"
        variant="secondary"
        leftIcon={<Icon name="plus" size={16} />}
        onPress={() => edit(null)}
      />

      <MainButton text="Done" onPress={close} />
    </View>
  );
};

const FormStep = ({ children }: { children: (goBack: () => void) => ReactNode }) => {
  const { back } = useTray();
  return <>{children(back)}</>;
};

const FieldsStep = ({
  petId,
  card,
  section,
  nextStepId
}: {
  petId: string;
  card: CareCard;
  section: CareCardSection;
  nextStepId: string | null;
}) => {
  const { goTo, close } = useTray();

  return (
    <SectionStep
      petId={petId}
      card={card}
      section={section}
      isFirst
      isSilent={false}
      nextLabel={nextStepId ? 'Save and continue' : 'Save'}
      onBack={close}
      onNext={() => (nextStepId ? goTo(nextStepId) : close())}
    />
  );
};

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  petId: string;
  card: CareCard;
  medications: Medication[];
  contacts: CareCardContact[];
  initialStepId: string | undefined;
  onDismiss: () => void;
};

// Every section's steps are built up front and the tray opens on the one the row
// names. A tray that rendered only the active section would have a null ref on
// the tap that chose it.
const CareCardSectionTray = ({
  sheetRef,
  petId,
  card,
  medications,
  contacts,
  initialStepId,
  onDismiss
}: Props) => {
  const [editingContact, setEditingContact] = useState<{ contact: CareCardContact | null } | null>(
    null
  );
  const [editingMedication, setEditingMedication] = useState<{
    medication: Medication | null;
  } | null>(null);

  const steps: TrayStepDescriptor[] = [];

  for (const step of CARE_CARD_STEPS) {
    if (step.kind === 'review') continue;

    if (step.kind === 'reaching-you') {
      steps.push({
        id: step.id,
        title: step.title,
        render: () => (
          <ContactsStep
            petId={petId}
            contacts={contacts}
            onEdit={(contact) => setEditingContact({ contact })}
          />
        )
      });
      continue;
    }

    if (step.kind === 'medications') {
      steps.push({
        id: step.id,
        title: step.title,
        render: () => (
          <MedicationsStep
            petId={petId}
            medications={medications}
            onEdit={(medication) => setEditingMedication({ medication })}
          />
        )
      });
      continue;
    }

    const groups = fieldGroups(step.section);

    groups.forEach((fields, index) => {
      const isSplit = groups.length > 1;
      const id = isSplit ? `${step.id}:${fields[0]}` : step.id;
      const next = groups[index + 1];
      const nextStepId = next ? `${step.id}:${next[0]}` : null;

      steps.push({
        id,
        title: isSplit ? CARE_CARD_FIELD_LABELS[fields[0]] : step.title,
        render: () => (
          <FieldsStep
            petId={petId}
            card={card}
            section={{ ...step.section, id, fields }}
            nextStepId={nextStepId}
          />
        )
      });
    });
  }

  // The forms are their own steps so the tray's back arrow returns to the list.
  if (editingContact) {
    steps.push({
      id: CONTACT_FORM_STEP,
      title: editingContact.contact ? 'Edit contact' : 'Add contact',
      render: () => (
        <FormStep>
          {(goBack) => (
            <ContactForm petId={petId} contact={editingContact.contact} onDone={goBack} />
          )}
        </FormStep>
      )
    });
  }

  if (editingMedication) {
    steps.push({
      id: MEDICATION_FORM_STEP,
      title: editingMedication.medication ? 'Edit medication' : 'Add a medication',
      render: () => (
        <FormStep>
          {(goBack) => (
            <MedicationForm
              petId={petId}
              medication={editingMedication.medication}
              onDone={goBack}
            />
          )}
        </FormStep>
      )
    });
  }

  return (
    <Tray
      sheetRef={sheetRef}
      steps={steps}
      initialStepId={firstStepForSection(
        steps.map((step) => step.id),
        initialStepId
      )}
      onDismiss={() => {
        setEditingContact(null);
        setEditingMedication(null);
        onDismiss();
      }}
    />
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    list: {
      gap: spacing.three
    },
    entry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      backgroundColor: colors.backgroundSheetRow,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three
    },
    entryText: {
      flex: 1,
      gap: spacing.half
    }
  });

export default CareCardSectionTray;
