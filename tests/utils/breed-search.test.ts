import { breedsFor } from '@/constants/breeds';
import type { Option } from '@/types/core';
import { MIN_SEARCH_LENGTH, searchBreeds } from '@/utils/breed-search';

const breed = (label: string): Option => ({ value: label, label });

const BREEDS = [
  breed('Chihuahua'),
  breed('Labrador Retriever'),
  breed('Black Labrador'),
  breed('American cocker spaniel'),
  breed('artésien-normand'),
  breed('Border Collie'),
  breed('Unknown')
];

const labels = (query: string) => searchBreeds(BREEDS, query).map((match) => match.label);

describe('searchBreeds', () => {
  it('returns every breed below the minimum length', () => {
    expect(MIN_SEARCH_LENGTH).toBe(2);
    expect(searchBreeds(BREEDS, '')).toHaveLength(BREEDS.length);
    expect(searchBreeds(BREEDS, 'c')).toHaveLength(BREEDS.length);
    expect(searchBreeds(BREEDS, '  c  ')).toHaveLength(BREEDS.length);
  });

  it('finds a breed the member misspelt', () => {
    expect(labels('chihuaha')).toContain('Chihuahua');
    expect(labels('labradore')).toContain('Labrador Retriever');
  });

  it('forgives two transposed letters', () => {
    expect(labels('labardor')).toContain('Labrador Retriever');
  });

  it('ranks a name prefix above a match inside the name', () => {
    expect(labels('lab')[0]).toBe('Labrador Retriever');
  });

  it('ranks every exact match above every fuzzy one', () => {
    const results = labels('collie');
    expect(results[0]).toBe('Border Collie');
  });

  it('matches a word inside the name', () => {
    expect(labels('cocker')).toContain('American cocker spaniel');
  });

  it('matches without the accent', () => {
    expect(labels('artesien')).toContain('artésien-normand');
  });

  it('is case insensitive', () => {
    expect(labels('CHIHUAHUA')).toContain('Chihuahua');
  });

  it('returns nothing when the term resembles no breed', () => {
    expect(labels('xylophone')).toEqual([]);
  });

  it('finds Chihuahua in the real list from the misspelling', () => {
    const dogs = searchBreeds(breedsFor('dog'), 'chihuaha');

    expect(dogs.map((match) => match.label)).toContain('Chihuahua');
  });
});
