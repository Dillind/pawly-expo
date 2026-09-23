import { useMemo, useState } from 'react';

import { useHousehold } from '@/hooks/queries/household/use-household';
import { useHouseholds } from '@/hooks/queries/household/use-households';
import { defaultAskingAs } from '@/lib/follow-naming';

// Which of the viewer's own Households a Follow Request names. The default
// holds until the viewer changes it.
export function useAskingAs() {
  const { data: households = [], isPending } = useHouseholds();
  const { data: current } = useHousehold();

  const owned = useMemo(() => households.filter((household) => household.isOwner), [households]);
  const fallback = defaultAskingAs(owned, current?.id);

  const [chosenIds, setChosenIds] = useState<string[] | null>(null);
  const householdIds = chosenIds ?? fallback.householdIds;

  const names = owned
    .filter((household) => householdIds.includes(household.id))
    .map((household) => household.name);

  return {
    owned,
    isReady: !isPending,
    canFollow: !isPending && owned.length > 0,
    householdIds,
    names,
    needsChoice: chosenIds === null && fallback.needsChoice,
    choose: setChosenIds
  };
}
