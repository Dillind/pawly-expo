import SectionCard from '@/components/screens/pet/section-card';
import ToggleSwitch from '@/components/core/toggle-switch';
import { usePausePet, useResumePet } from '@/hooks/queries/feeding/use-pet-pause';

type Props = {
  petId: string;
  isPaused: boolean;
};

/**
 * A pause is a date range, not a flag on the pet, so this toggle asks about
 * today. Turning it on stops every nudge — nobody is asked about a feed the
 * household has already decided is not happening.
 */
const PauseCard = ({ petId, isPaused }: Props) => {
  const { mutate: pausePet, isPending: isPausing } = usePausePet(petId);
  const { mutate: resumePet, isPending: isResuming } = useResumePet(petId);

  return (
    <SectionCard>
      <ToggleSwitch
        label="Pause feeds"
        description="Boarding, a vet stay, fasting before surgery."
        value={isPaused}
        isDisabled={isPausing || isResuming}
        onChange={(next) => (next ? pausePet(null) : resumePet())}
      />
    </SectionCard>
  );
};

export default PauseCard;
