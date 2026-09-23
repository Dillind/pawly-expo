import { useRequestFollow } from '@/hooks/queries/follow/use-follows';
import { useAskingAs } from '@/hooks/use-asking-as';

// A Follow Request that names the viewer's chosen Households. One per screen,
// so a list reads `sendingHouseholdId` to spin only the row that sent.
export function useSendFollowRequest() {
  const askingAs = useAskingAs();
  const { mutate: requestFollow, isPending, variables } = useRequestFollow();

  const send = (householdId: string, namedHouseholdIds: string[] = askingAs.householdIds) =>
    requestFollow({
      householdId,
      namedHouseholdIds,
      namedHouseholdNames: askingAs.owned
        .filter((household) => namedHouseholdIds.includes(household.id))
        .map((household) => household.name)
    });

  return {
    askingAs,
    send,
    sendingHouseholdId: isPending ? variables?.householdId : undefined
  };
}
