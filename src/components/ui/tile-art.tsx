import PetStack from '@/components/ui/pet-stack';
import { usePets } from '@/hooks/queries/use-pets';

/**
 * Resolves a descriptor's `art` key to the component that draws it. Tiles stay
 * data (see ADR 0015 and the spec's "the tile grid is data, not JSX") — this is
 * the one place that knows a tile can be about pets.
 */
export type TileArt = 'petStack';

const PetStackArt = () => {
  const { data: pets = [] } = usePets();

  if (pets.length === 0) return null;

  return <PetStack pets={pets} />;
};

const TileArtwork = ({ art }: { art: TileArt }) => (art === 'petStack' ? <PetStackArt /> : null);

export default TileArtwork;
