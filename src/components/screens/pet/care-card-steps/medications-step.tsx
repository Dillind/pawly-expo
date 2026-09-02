import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import IconButton from '@/components/core/icon-button';
import MainButton from '@/components/core/main-button';
import { Radius, type AppTheme } from '@/constants/theme';
import { useDeleteMedication } from '@/hooks/queries/pet/use-care-card-mutations';
import { useStyles } from '@/hooks/use-styles';
import { hasValue } from '@/lib/care-card-view';
import type { Medication } from '@/services/care-card.service';

import MedicationForm from './medication-form';
import StepFooter from './step-footer';

const MedicationRow = ({
  medication,
  isBusy,
  onEdit,
  onRemove
}: {
  medication: Medication;
  isBusy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) => {
  const styles = useStyles(makeStyles);
  const detail = [medication.dose, medication.scheduleText].filter(hasValue).join(' · ');

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText size={16}>{medication.name}</AppText>
        {detail.length > 0 && (
          <AppText size={13} color="textSecondary">
            {detail}
          </AppText>
        )}
      </View>

      <IconButton
        name="pencil"
        accessibilityLabel={`Edit ${medication.name}`}
        variant="ghost"
        size={18}
        onPress={onEdit}
      />
      <IconButton
        name="trash"
        accessibilityLabel={`Remove ${medication.name}`}
        variant="ghost"
        color="error"
        size={18}
        isDisabled={isBusy}
        onPress={onRemove}
      />
    </View>
  );
};

type Props = {
  petId: string;
  medications: Medication[];
  onBack: () => void;
  onNext: () => void;
};

const MedicationsStep = ({ petId, medications, onBack, onNext }: Props) => {
  const styles = useStyles(makeStyles);
  const [editing, setEditing] = useState<{ medication: Medication | null } | null>(null);
  const { mutate: deleteMedication, isPending: isDeleting } = useDeleteMedication(petId);

  if (editing) {
    return (
      <MedicationForm
        petId={petId}
        medication={editing.medication}
        onDone={() => setEditing(null)}
      />
    );
  }

  const confirmRemove = (medication: Medication) => {
    Alert.alert(`Remove ${medication.name}?`, 'It will come off the Care Card.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMedication(medication.id) }
    ]);
  };

  return (
    <>
      <View style={styles.list}>
        <AppText color="textSecondary" size={15}>
          Anything they take, and how to get it into them.
        </AppText>

        {medications.map((medication) => (
          <MedicationRow
            key={medication.id}
            medication={medication}
            isBusy={isDeleting}
            onEdit={() => setEditing({ medication })}
            onRemove={() => confirmRemove(medication)}
          />
        ))}

        <MainButton
          text="Add a medication"
          variant="secondary"
          leftIcon={<Icon name="plus" size={16} />}
          onPress={() => setEditing({ medication: null })}
        />
      </View>

      <StepFooter onBack={onBack} onNext={onNext} />
    </>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    list: {
      gap: spacing.three
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.one,
      backgroundColor: colors.backgroundElement,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      padding: spacing.three
    },
    rowText: {
      flex: 1,
      gap: spacing.half
    }
  });

export default MedicationsStep;
