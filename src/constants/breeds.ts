import breedsJson from '@/data/breeds.json';
import type { Option, PetType } from '@/types/core';

export type BreedSpecies = 'dog' | 'cat';

type BreedRecord = {
  id: string;
  species: string;
  name: string;
  wikidataQid: string | null;
};

/**
 * The list ships in the bundle rather than coming from the `breeds` table, and
 * that is a cost decision. Fetching it is about 80 KB a cold start against a
 * 5 GB allowance, and it grows with users while the data never changes.
 * Bundled, egress is zero, the picker paints with no spinner, and there is no
 * offline case. The price is that a new breed needs a release — breeds change
 * about never, so that is the right trade.
 *
 * The table still earns its place: it is what makes `breed_id` a real foreign
 * key, and what future breed-keyed content reads.
 */
const BREEDS = breedsJson as BreedRecord[];

const BY_ID = new Map(BREEDS.map((breed) => [breed.id, breed]));

const BY_SPECIES: Record<BreedSpecies, Option[]> = {
  dog: [],
  cat: []
};

for (const breed of BREEDS) {
  BY_SPECIES[breed.species as BreedSpecies].push({ value: breed.id, label: breed.name });
}

/** We hold no breed list for a rabbit or a bird, so `other` has no picker. */
export const breedSpeciesFor = (petType: PetType): BreedSpecies | null =>
  petType === 'dog' || petType === 'cat' ? petType : null;

export const breedsFor = (species: BreedSpecies): Option[] => BY_SPECIES[species];

/** The `optionLabel` of this list. Undefined for an id we no longer carry. */
export const breedName = (breedId: string | null | undefined): string | undefined =>
  breedId ? BY_ID.get(breedId)?.name : undefined;

export const isKnownBreedId = (breedId: string): boolean => BY_ID.has(breedId);

const BY_NAME = new Map(
  BREEDS.map((breed) => [`${breed.species}:${breed.name.toLowerCase()}`, breed.id])
);

/**
 * The bridge from the free text we already hold. CRU-104 does this once as a
 * backfill; until then the forms do it on load, so a pet that reads
 * "Labrador Retriever" opens with that row already ticked.
 */
export const breedIdByName = (
  species: BreedSpecies,
  name: string | null | undefined
): string | null =>
  name ? (BY_NAME.get(`${species}:${name.trim().toLowerCase()}`) ?? null) : null;

/**
 * What to show for a pet's breed. Reads prefer `breedId` and fall back to the
 * free text, which is what stops a pet that typed "Cavadoodle" reading as
 * nothing while the two columns coexist.
 */
export const petBreedLabel = (pet: {
  breedId: string | null;
  breedFreetext: string | null;
}): string | null => breedName(pet.breedId) ?? pet.breedFreetext;
