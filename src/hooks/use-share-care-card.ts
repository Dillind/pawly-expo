import { useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';

import { petBreedLabel } from '@/constants/breeds';
import { emptyCareCard } from '@/constants/care-card-fields';
import { ErrorMessage } from '@/constants/enums';
import { useHousehold } from '@/hooks/queries/household/use-household';
import { careCardQueryOptions } from '@/hooks/queries/pet/use-care-card';
import { petDetailQueryOptions } from '@/hooks/queries/pet/use-pet-detail';
import { buildCareCardHtml, careCardFileName, type CareCardPdfPet } from '@/lib/care-card-pdf';
import { formatAge, formatDateWithYear } from '@/lib/dates';
import { logError } from '@/lib/errors';
import { showErrorToast } from '@/lib/toast';

// A4 at 72ppi. expo-print defaults to US Letter, which crops or letterboxes.
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

export function useShareCareCard() {
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();
  const [isSharing, setIsSharing] = useState(false);
  const isGenerating = useRef(false);

  const collectPet = async (petId: string): Promise<CareCardPdfPet> => {
    const [detail, careCard] = await Promise.all([
      queryClient.fetchQuery(petDetailQueryOptions(petId)),
      queryClient.fetchQuery(careCardQueryOptions(petId))
    ]);

    return {
      name: detail.name,
      breed: petBreedLabel(detail),
      ageLabel: formatAge(detail.birthdate, detail.birthdateIsApproximate),
      card: careCard.card ?? emptyCareCard(petId),
      medications: careCard.medications,
      contacts: careCard.contacts
    };
  };

  const shareCareCard = async (petIds: string[]) => {
    // A ref, not `isSharing`: a second tap in the same tick reads the state
    // before React re-renders and generates the PDF twice.
    if (isGenerating.current || petIds.length === 0) return;

    isGenerating.current = true;
    setIsSharing(true);

    try {
      if (!(await Sharing.isAvailableAsync())) {
        showErrorToast(ErrorMessage.CareCardShareUnavailable);
        return;
      }

      const pets = await Promise.all(petIds.map(collectPet));

      const zone = household?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const html = buildCareCardHtml(pets, { generatedOn: formatDateWithYear(new Date(), zone) });

      const { uri } = await Print.printToFileAsync({ html, width: A4_WIDTH, height: A4_HEIGHT });

      // printToFileAsync names the file from a UUID.
      const printed = new File(uri);
      const named = new File(Paths.cache, careCardFileName(pets));
      if (named.exists) named.delete();
      await printed.move(named);

      await Sharing.shareAsync(named.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: pets.length === 1 ? `${pets[0].name}'s Care Card` : 'Care Cards'
      });
    } catch (error) {
      logError(error);
      showErrorToast(ErrorMessage.CareCardShareFailed);
    } finally {
      isGenerating.current = false;
      setIsSharing(false);
    }
  };

  // No success toast: the share sheet is the confirmation, and the user can
  // still cancel it.
  return { shareCareCard, isSharing };
}
