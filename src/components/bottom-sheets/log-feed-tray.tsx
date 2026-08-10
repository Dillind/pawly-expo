import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import Tray, { useTray, type TrayStepDescriptor } from '@/components/core/tray';
import LateFeedStep from '@/components/screens/home/late-feed-step';
import PetAvatar from '@/components/screens/home/pet-avatar';
import ScheduledTimeList from '@/components/ui/scheduled-time-list';
import type { AppTheme } from '@/constants/theme';
import { useSlotStates } from '@/hooks/queries/use-slot-states';
import type { useLogFlow } from '@/hooks/use-log-flow';
import { useStyles } from '@/hooks/use-styles';
import type { HouseholdMember, Pet } from '@/types/core';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useEffect, useState, type RefObject } from 'react';
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
  const { data: slots, isLoading } = useSlotStates(pet?.id, today);

  if (!pet || isLoading || !slots) return <ActivityIndicator />;

  return (
    <ScheduledTimeList
      slots={slots}
      timezone={timezone}
      members={members}
      onOpenLog={onOpenLog}
      onPickSlot={(slot) => flow.pickSlot(pet, slot)}
    />
  );
};

/** Moves the tray onto the late-feed step when the flow asks. */
const WhenNavigator = ({ token }: { token: number }) => {
  const { goTo } = useTray();

  useEffect(() => {
    if (token > 0) goTo('when');
  }, [token, goTo]);

  return null;
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
 * Raised only when there is something to ask: which pet, which Scheduled Time,
 * or when a late feed happened. A pick needing none of those writes without it.
 */
const LogFeedTray = ({
  sheetRef,
  pets,
  timezone,
  today,
  members,
  pet,
  flow,
  onOpenLog
}: Props) => {
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

  const whenStep: TrayStepDescriptor = {
    id: 'when',
    title: 'When was this feed?',
    render: () =>
      flow.confirm ? (
        <LateFeedStep
          confirm={flow.confirm}
          timezone={timezone}
          isLogging={flow.isLogging}
          onResolveLate={flow.resolveLate}
        />
      ) : null
  };

  const steps: TrayStepDescriptor[] = active
    ? [timeStep, whenStep]
    : [
        {
          id: 'pet',
          title: 'Log a feed',
          render: () => <PetPickerStep pets={pets} onSelect={setSelected} />
        },
        timeStep,
        whenStep
      ];

  return (
    <Tray
      sheetRef={sheetRef}
      steps={steps}
      onDismiss={() => {
        setSelected(undefined);
        flow.cancel();
      }}>
      <WhenNavigator token={flow.confirmToken} />
    </Tray>
  );
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
