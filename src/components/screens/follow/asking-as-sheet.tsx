import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import type { RefObject } from 'react';

import HouseholdChoiceSheet from '@/components/screens/follow/household-choice-sheet';
import type { useAskingAs } from '@/hooks/use-asking-as';
import { countDigits } from '@/utils/counts';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
  askingAs: ReturnType<typeof useAskingAs>;
  targetName: string;
  confirmText: string;
  onConfirm: (householdIds: string[]) => void;
};

const AskingAsSheet = ({ sheetRef, askingAs, targetName, confirmText, onConfirm }: Props) => (
  <HouseholdChoiceSheet
    sheetRef={sheetRef}
    title="Asking as"
    description={`${targetName}'s Owners see these, and can follow them back.`}
    footnote="Only households you own."
    choices={askingAs.owned.map((household) => ({
      id: household.id,
      name: household.name,
      detail: [
        household.handle && `@${household.handle}`,
        household.pets.length > 0 && countDigits(household.pets.length, 'pet')
      ]
        .filter(Boolean)
        .join(' · ')
    }))}
    initialIds={askingAs.householdIds}
    confirmText={confirmText}
    onConfirm={onConfirm}
  />
);

export default AskingAsSheet;
