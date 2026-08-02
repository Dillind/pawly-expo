import AppText from '@/components/core/app-text';
import IconButton from '@/components/core/icon-button';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { Medication } from '@/services/care-card.service';
import { StyleSheet, View } from 'react-native';

type Props = {
  medications: Medication[];
  onAdd: () => void;
  onEdit: (medication: Medication) => void;
  onDelete: (medication: Medication) => void;
  deletingMedicationId: string | null;
};

const MedicationList = ({ medications, onAdd, onEdit, onDelete, deletingMedicationId }: Props) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="header" size={18}>
          Medications
        </AppText>
        <IconButton
          name="plus"
          accessibilityLabel="Add a medication"
          variant="ghost"
          size={18}
          onPress={onAdd}
        />
      </View>

      {medications.length === 0 && (
        <AppText color="textSecondary" size={14}>
          Nothing here yet. Add what a sitter would need to know.
        </AppText>
      )}

      {medications.length > 0 && (
        <View style={styles.list}>
          {medications.map((medication) => (
            <View key={medication.id} style={styles.row}>
              <View style={styles.details}>
                <AppText size={16}>{medication.name}</AppText>
                {medication.dose && (
                  <AppText color="textSecondary" size={14}>
                    {medication.dose}
                  </AppText>
                )}
                {medication.scheduleText && (
                  <AppText color="textSecondary" size={14}>
                    {medication.scheduleText}
                  </AppText>
                )}
                {medication.instructions && (
                  <AppText color="textSecondary" size={14}>
                    {medication.instructions}
                  </AppText>
                )}
              </View>
              <View style={styles.actions}>
                <IconButton
                  name="pencil"
                  accessibilityLabel={`Edit ${medication.name}`}
                  variant="ghost"
                  size={18}
                  isDisabled={deletingMedicationId === medication.id}
                  onPress={() => onEdit(medication)}
                />
                <IconButton
                  name="trash"
                  accessibilityLabel={`Remove ${medication.name}`}
                  variant="ghost"
                  size={18}
                  isDisabled={deletingMedicationId === medication.id}
                  onPress={() => onDelete(medication)}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    section: { gap: spacing.two },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    list: { gap: spacing.two },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.one,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.textSecondary
    },
    details: { flex: 1, gap: 2 },
    actions: { flexDirection: 'row' }
  });

export default MedicationList;
