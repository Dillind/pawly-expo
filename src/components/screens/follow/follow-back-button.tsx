import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';

import Icon from '@/components/core/icon';
import MainButton from '@/components/core/main-button';
import HouseholdChoiceSheet from '@/components/screens/follow/household-choice-sheet';
import { IconSize } from '@/constants/theme';
import { useFollowBack } from '@/hooks/queries/follow/use-follows';
import { followBackState } from '@/lib/follow-naming';
import type { Follower, NamedHousehold } from '@/services/follow.service';

type Props = {
  person: Follower;
  acceptingHouseholdId: string;
};

const LOCKED_LABELS: Partial<Record<NamedHousehold['relationship'], string>> = {
  pending: 'Requested',
  accepted: 'Following'
};

// A sent Follow Back is remembered here: the requests screen keeps an accepted
// row that no refetch returns.
const FollowBackButton = ({ person, acceptingHouseholdId }: Props) => {
  const sheetRef = useRef<TrueSheet | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const { mutate: followBack, isPending } = useFollowBack(acceptingHouseholdId);

  const named = person.namedHouseholds.map((household) =>
    sentIds.includes(household.householdId)
      ? { ...household, relationship: 'pending' as const }
      : household
  );
  const state = followBackState(named);

  const send = (households: NamedHousehold[]) =>
    followBack(households, {
      onSuccess: () => setSentIds((ids) => [...ids, ...households.map((h) => h.householdId)])
    });

  if (state.kind === 'hidden') return null;

  if (state.kind === 'settled') {
    // MainButton draws nothing without a handler; a settled state is shown, not pressed.
    return (
      <MainButton
        text={state.label}
        size="sm"
        variant="secondary"
        isDisabled
        onPress={() => undefined}
      />
    );
  }

  if (state.kind === 'single') {
    return (
      <MainButton
        text="Follow back"
        size="sm"
        isLoading={isPending}
        isDisabled={isPending}
        onPress={() => send([state.household])}
      />
    );
  }

  const open = state.households.filter((household) => household.relationship === 'none');
  const name = person.firstName ?? 'them';

  return (
    <>
      <MainButton
        text="Follow back"
        size="sm"
        isLoading={isPending}
        isDisabled={isPending}
        rightIcon={<Icon name="caretDown" size={IconSize.inline} color="onPrimary" />}
        onPress={() => void sheetRef.current?.present()}
      />
      <HouseholdChoiceSheet
        sheetRef={sheetRef}
        title={`Follow back ${name}`}
        description={`Only the households ${name} shared with you.`}
        choices={state.households.map((household) => ({
          id: household.householdId,
          name: household.name,
          detail: household.handle ? `@${household.handle}` : undefined,
          lockedLabel: LOCKED_LABELS[household.relationship]
        }))}
        initialIds={open.map((household) => household.householdId)}
        confirmText="Follow back"
        onConfirm={(ids) => send(open.filter((household) => ids.includes(household.householdId)))}
      />
    </>
  );
};

export default FollowBackButton;
