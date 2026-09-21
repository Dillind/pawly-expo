import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type ReactNode, type RefObject } from 'react';

import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import ContactForm from '@/components/screens/pet/care-card-steps/contact-form';
import MedicationForm from '@/components/screens/pet/care-card-steps/medication-form';
import SectionStep from '@/components/screens/pet/care-card-steps/section-step';
import {
  CONTACT_FORM_STEP,
  ContactsStep,
  MEDICATION_FORM_STEP,
  MedicationsStep
} from '@/components/screens/pet/care-card/care-card-section-lists';
import {
  CARE_CARD_FIELD_LABELS,
  CARE_CARD_MULTILINE_FIELDS,
  CARE_CARD_STEPS,
  type CareCardField,
  type CareCardSection
} from '@/constants/care-card-fields';
import { firstStepForSection } from '@/lib/care-card-view';
import { type CareCard, type CareCardContact, type Medication } from '@/services/care-card.service';

// The shared Tray has no scroller and sizes to its content, so a section with
// two long answers is split one field per step rather than made scrollable.
const fieldGroups = (section: CareCardSection): CareCardField[][] => {
  const multilineCount = section.fields.filter((field) =>
    CARE_CARD_MULTILINE_FIELDS.has(field)
  ).length;

  return multilineCount > 1 ? section.fields.map((field) => [field]) : [section.fields];
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

export default CareCardSectionTray;
