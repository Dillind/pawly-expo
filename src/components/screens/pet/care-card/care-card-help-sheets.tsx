import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useImperativeHandle, useRef, type Ref } from 'react';

import InfoSheet from '@/components/bottom-sheets/info-sheet';
import { CARE_CARD_HELP, SHARING_HELP } from '@/constants/care-card-help';

export type CareCardHelpHandle = {
  openWhatIsIt: () => void;
  openSharing: () => void;
};

type Props = { ref?: Ref<CareCardHelpHandle> };

const CareCardHelpSheets = ({ ref }: Props) => {
  const whatIsItRef = useRef<TrueSheet | null>(null);
  const sharingRef = useRef<TrueSheet | null>(null);

  useImperativeHandle(ref, () => ({
    openWhatIsIt: () => void whatIsItRef.current?.present(),
    openSharing: () => void sharingRef.current?.present()
  }));

  return (
    <>
      <InfoSheet sheetRef={whatIsItRef} {...CARE_CARD_HELP} />
      <InfoSheet sheetRef={sharingRef} {...SHARING_HELP} />
    </>
  );
};

export default CareCardHelpSheets;
