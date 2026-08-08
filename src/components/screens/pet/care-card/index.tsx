import { useCareCardData } from '@/hooks/queries/use-care-card';
import { useShareCareCard } from '@/hooks/use-share-care-card';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import CareCardHelpSheets, { type CareCardHelpHandle } from './care-card-help-sheets';
import CareCardOverlay from './care-card-overlay';
import CareCardTile, { type TileFrame } from './care-card-tile';

type Props = {
  petId: string;
  petName: string;
  petSubtitle: string | null;
  photoUrl: string | null;
};

const CareCard = ({ petId, petName, petSubtitle, photoUrl }: Props) => {
  const router = useRouter();
  const { card, medications, contacts, isFilled, isLoading } = useCareCardData(petId);
  const { shareCareCard, isSharing } = useShareCareCard();

  const [origin, setOrigin] = useState<TileFrame | null>(null);
  const helpRef = useRef<CareCardHelpHandle | null>(null);

  const openEditor = () => {
    router.push({
      pathname: '/home/pet/care-card-editor',
      params: { petId, petName, ...(petSubtitle ? { petSubtitle } : {}) }
    });
  };

  // An empty tile skips the card: one that says "nothing here" is a speed bump.
  const handleTilePress = (frame: TileFrame) => {
    if (isFilled) {
      setOrigin(frame);
      return;
    }
    openEditor();
  };

  return (
    <>
      <CareCardTile
        petName={petName}
        isFilled={isFilled}
        // While loading the card reads as empty, which would wrongly open the
        // editor for a card that does exist.
        isDisabled={isLoading}
        isHidden={origin !== null}
        onPress={handleTilePress}
      />

      {origin && (
        <CareCardOverlay
          petName={petName}
          petSubtitle={petSubtitle}
          photoUrl={photoUrl}
          card={card}
          medications={medications}
          contacts={contacts}
          origin={origin}
          isSharing={isSharing}
          onClose={() => setOrigin(null)}
          // Leaving it mounted behind the editor kept `origin` set on return,
          // which hid the tile for good.
          onEdit={() => {
            setOrigin(null);
            openEditor();
          }}
          onShare={() => void shareCareCard([petId])}
          onHelp={() => helpRef.current?.openWhatIsIt()}
        />
      )}

      <CareCardHelpSheets ref={helpRef} />
    </>
  );
};

export default CareCard;
