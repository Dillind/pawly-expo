import {
  breedIdByName,
  breedName,
  breedsFor,
  breedSpeciesFor,
  isKnownBreedId
} from '@/constants/breeds';

describe('breedsFor', () => {
  it('returns a non-trivial list per species, sorted by name', () => {
    for (const species of ['dog', 'cat'] as const) {
      const list = breedsFor(species);

      expect(list.length).toBeGreaterThan(100);

      const names = list.map((breed) => breed.label);

      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    }
  });

  it('carries an Unknown row for each species, because not knowing is an answer', () => {
    for (const species of ['dog', 'cat'] as const) {
      expect(breedsFor(species).some((breed) => breed.label === 'Unknown')).toBe(true);
    }
  });

  it('carries the Australian crosses Wikidata is thin on', () => {
    const dogs = breedsFor('dog').map((breed) => breed.label);

    for (const cross of ['Cavoodle', 'Groodle', 'Spoodle', 'Moodle']) {
      expect(dogs).toContain(cross);
    }
  });

  it('never lists one name twice within a species', () => {
    for (const species of ['dog', 'cat'] as const) {
      const names = breedsFor(species).map((breed) => breed.label);

      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('breedSpeciesFor', () => {
  it('has no list for a pet that is neither a dog nor a cat', () => {
    expect(breedSpeciesFor('dog')).toBe('dog');
    expect(breedSpeciesFor('cat')).toBe('cat');
    expect(breedSpeciesFor('other')).toBeNull();
  });
});

describe('breedName', () => {
  it('reads a name back from its id', () => {
    const [first] = breedsFor('dog');

    expect(breedName(first.value)).toBe(first.label);
  });

  it('is undefined for nothing, and for an id we do not carry', () => {
    expect(breedName(null)).toBeUndefined();
    expect(breedName('not-an-id')).toBeUndefined();
    expect(isKnownBreedId('not-an-id')).toBe(false);
  });
});

describe('breedIdByName', () => {
  it('matches the free text we already hold, ignoring case and space', () => {
    const [first] = breedsFor('dog');

    expect(breedIdByName('dog', `  ${first.label.toUpperCase()} `)).toBe(first.value);
  });

  it('is null for text that matches nothing, so nothing is forced to Unknown', () => {
    expect(breedIdByName('dog', 'Cavadoodle')).toBeNull();
    expect(breedIdByName('dog', null)).toBeNull();
  });
});
