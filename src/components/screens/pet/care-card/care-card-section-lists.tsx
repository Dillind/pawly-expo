import { Alert, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import PressableOpacity from '@/components/core/pressable-opacity';
import { useTray } from '@/components/core/tray';
import { REACHING_YOU_NOTE } from '@/constants/care-card-fields';
import { IconSize, Radius, type AppTheme } from '@/constants/theme';
import { useDeleteContact, useDeleteMedication } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { hasValue } from '@/lib/care-card-view';
import {
  MAX_CARE_CARD_CONTACTS,
  type CareCardContact,
  type Medication
} from '@/services/care-card.service';

export const CONTACT_FORM_STEP = 'contact-form';
export const MEDICATION_FORM_STEP = 'medication-form';

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
        size={IconSize.control}
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

export const ContactsStep = ({ petId, contacts, onEdit }: ContactsStepProps) => {
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
        {REACHING_YOU_NOTE}
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
          leftIcon={<Icon name="plus" size={IconSize.inline} />}
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

export const MedicationsStep = ({ petId, medications, onEdit }: MedicationsStepProps) => {
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
        leftIcon={<Icon name="plus" size={IconSize.inline} />}
        onPress={() => edit(null)}
      />

      <MainButton text="Done" onPress={close} />
    </View>
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
