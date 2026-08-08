import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import { Radius, type AppTheme } from '@/constants/theme';
import { useDeleteContact } from '@/hooks/queries/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { MAX_CARE_CARD_CONTACTS, type CareCardContact } from '@/services/care-card.service';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import ContactForm from './contact-form';
import StepFooter from './step-footer';

const ContactRow = ({
  contact,
  isBusy,
  onEdit,
  onRemove
}: {
  contact: CareCardContact;
  isBusy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.contact}>
      <View style={styles.contactText}>
        <AppText size={16}>{contact.name}</AppText>
        <AppText size={13} color="textSecondary">
          {contact.phone ?? 'No number given'}
        </AppText>
      </View>

      <IconButton
        name="pencil"
        accessibilityLabel={`Edit ${contact.name}`}
        variant="ghost"
        size={18}
        onPress={onEdit}
      />
      <IconButton
        name="close"
        accessibilityLabel={`Remove ${contact.name}`}
        variant="ghost"
        color="error"
        size={20}
        isDisabled={isBusy}
        onPress={onRemove}
      />
    </View>
  );
};

type Props = {
  petId: string;
  contacts: CareCardContact[];
  onNext: () => void;
};

const ReachingYouStep = ({ petId, contacts, onNext }: Props) => {
  const styles = useStyles(makeStyles);
  // Wrapped so "add" (null contact) is distinguishable from "not editing".
  const [editing, setEditing] = useState<{ contact: CareCardContact | null } | null>(null);
  const [hasTriedToContinue, setHasTriedToContinue] = useState(false);

  const { mutate: deleteContact, isPending: isDeleting } = useDeleteContact(petId);

  const isFull = contacts.length >= MAX_CARE_CARD_CONTACTS;
  const isEmpty = contacts.length === 0;

  const confirmRemove = (contact: CareCardContact) => {
    Alert.alert(`Remove ${contact.name}?`, 'They will come off the Care Card.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Remove', style: 'destructive', onPress: () => deleteContact(contact.id) }
    ]);
  };

  // The list is not a form field, so there is no resolver to hang this off.
  const handleNext = () => {
    if (isEmpty) {
      setHasTriedToContinue(true);
      return;
    }
    onNext();
  };

  if (editing) {
    return (
      <ContactForm petId={petId} contact={editing.contact} onDone={() => setEditing(null)} />
    );
  }

  return (
    <>
      <View style={styles.step}>
        <AppText color="textSecondary" size={15}>
          Who a sitter should ring, in the order they should try. Add yourself first.
        </AppText>

        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            isBusy={isDeleting}
            onEdit={() => setEditing({ contact })}
            onRemove={() => confirmRemove(contact)}
          />
        ))}

        {isFull ? (
          <AppText size={13} color="textSecondary">
            That is the limit. A sitter with four numbers to try has none.
          </AppText>
        ) : (
          <MainButton
            text="Add contact"
            variant="neutral"
            leftIcon={<Icon name="plus" size={16} />}
            onPress={() => setEditing({ contact: null })}
          />
        )}

        {hasTriedToContinue && isEmpty && (
          <AppText size={13} color="error">
            Add at least one person a sitter can ring.
          </AppText>
        )}

        <AppText size={13} color="textSecondary">
          {contacts.length} of {MAX_CARE_CARD_CONTACTS} added
        </AppText>
      </View>

      <StepFooter isFirst onNext={handleNext} />
    </>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    step: { gap: spacing.three },
    contact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      padding: spacing.three
    },
    contactText: { flex: 1, gap: spacing.half }
  });

export default ReachingYouStep;
