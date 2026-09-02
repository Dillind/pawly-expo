import breedsJson from '@/data/breeds.json';
import type { Option, PetType } from '@/types/core';

export type BreedSpecies = 'dog' | 'cat';

type BreedRecord = {
  id: string;
  species: string;
  name: string;
};

// Bundled, not read from the `breeds` table: a fetch costs egress on every
// cold start for data that never changes. Reasoning on issue #116. The table
// exists to make `pets.breed_id` a real foreign key. The two must stay in step.
const BREEDS = breedsJson as BreedRecord[];

const BREED_BY_ID = new Map(BREEDS.map((breed) => [breed.id, breed]));

const BREEDS_BY_SPECIES: Record<BreedSpecies, Option[]> = {
  dog: [],
  cat: []
};

for (const breed of BREEDS) {
  BREEDS_BY_SPECIES[breed.species as BreedSpecies].push({ value: breed.id, label: breed.name });
}

// We hold no breed list for a rabbit or a bird, so `other` has no picker.
export const breedSpeciesFor = (petType: PetType): BreedSpecies | null =>
  petType === 'dog' || petType === 'cat' ? petType : null;

export const breedsFor = (species: BreedSpecies): Option[] => BREEDS_BY_SPECIES[species];

export const breedName = (breedId: string | null | undefined): string | undefined =>
  breedId ? BREED_BY_ID.get(breedId)?.name : undefined;

export const isKnownBreedId = (breedId: string): boolean => BREED_BY_ID.has(breedId);

const BREED_ID_BY_NAME = new Map(
  BREEDS.map((breed) => [`${breed.species}:${breed.name.toLowerCase()}`, breed.id])
);

// Bridges the free text we already hold, so a pet reading "Labrador Retriever"
// opens with that row ticked. CRU-104 backfilled the same match in SQL.
export const breedIdByName = (
  species: BreedSpecies,
  name: string | null | undefined
): string | null =>
  name ? (BREED_ID_BY_NAME.get(`${species}:${name.trim().toLowerCase()}`) ?? null) : null;

// Falls back to the free text, so a pet that typed "Cavadoodle" still reads.
export const petBreedLabel = (pet: {
  breedId: string | null;
  breedFreetext: string | null;
}): string | null => breedName(pet.breedId) ?? pet.breedFreetext;
