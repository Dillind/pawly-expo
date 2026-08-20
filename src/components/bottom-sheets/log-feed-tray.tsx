import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import PetAvatar from '@/components/screens/home/pet-avatar';
import OccurrenceList from '@/components/ui/occurrence-list';
import type { AppTheme } from '@/constants/theme';
import { useOccurrences } from '@/hooks/queries/feeding/use-occurrences';
import type { useLogFlow } from '@/hooks/use-log-flow';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdMember, Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

type Flow = ReturnType<typeof useLogFlow>;

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  pets: Pet[];
  timezone: string;
  today: string;
  members: HouseholdMember[];
  /** Preselected by a per-pet Log button, which already knows its pet. */
  pet?: Pet;
  flow: Flow;
  onOpenLog: (logId: string) => void;
};

const PetPickerStep = ({ pets, onSelect }: { pets: Pet[]; onSelect: (pet: Pet) => void }) => {
  const styles = useStyles(makeStyles);
  const { goTo } = useTray();

  return (
    <View style={styles.list}>
      {pets.map((pet) => (
        <PressableOpacity
          key={pet.id}
          style={styles.petRow}
          accessibilityRole="button"
          accessibilityLabel={`Log a feed for ${pet.name}`}
          onPress={() => {
            onSelect(pet);
            goTo('time');
          }}>
          <PetAvatar photoUrl={pet.photoUrl} />

          <AppText size={16} style={styles.petName}>
            {pet.name}
          </AppText>

          <Icon name="caretRight" size={16} color="textSecondary" />
        </PressableOpacity>
      ))}
    </View>
  );
};

const TimeStep = ({
  pet,
  timezone,
  today,
  members,
  flow,
  onOpenLog
}: {
  pet: Pet | undefined;
  timezone: string;
  today: string;
  members: HouseholdMember[];
  flow: Flow;
  onOpenLog: (logId: string) => void;
}) => {
  const { data: occurrences, isLoading } = useOccurrences(pet?.id, today);

  if (!pet || isLoading || !occurrences) return <ActivityIndicator />;

  return (
    <OccurrenceList
      occurrences={occurrences}
      timezone={timezone}
      members={members}
      onOpenLog={onOpenLog}
      onPickOccurrence={(occurrence) => flow.pickOccurrence(pet, occurrence)}
    />
  );
};

const PetHeading = ({ pet }: { pet: Pet }) => {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.heading}>
      <PetAvatar photoUrl={pet.photoUrl} size={32} />
      <AppText variant="header" size={18}>
        {pet.name}
      </AppText>
    </View>
  );
};

/**
 * Raised only when there is something to ask: which pet, and which Feed Time.
 * A pick needing neither writes without it.
 */
const LogFeedTray = ({ sheetRef, pets, timezone, today, members, pet, flow, onOpenLog }: Props) => {
  const [selected, setSelected] = useState<Pet | undefined>(undefined);

  const onlyPet = pets.length === 1 ? pets[0] : undefined;
  const active = pet ?? onlyPet ?? selected;

  const timeStep: TrayStepDescriptor = {
    id: 'time',
    title: active ? `Log a feed for ${active.name}` : 'Log a feed',
    header: active ? () => <PetHeading pet={active} /> : undefined,
    render: () => (
      <TimeStep
        key={active?.id}
        pet={active}
        timezone={timezone}
        today={today}
        members={members}
        flow={flow}
        onOpenLog={onOpenLog}
      />
    )
  };

  const steps: TrayStepDescriptor[] = active
    ? [timeStep]
    : [
        {
          id: 'pet',
          title: 'Log a feed',
          render: () => <PetPickerStep pets={pets} onSelect={setSelected} />
        },
        timeStep
      ];

  return <Tray sheetRef={sheetRef} steps={steps} onDismiss={() => setSelected(undefined)} />;
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    list: { gap: spacing.two },
    petRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.three,
      borderRadius: 12,
      backgroundColor: colors.backgroundSheetRow
    },
    petName: { flex: 1 },
    heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.two }
  });

export default LogFeedTray;
