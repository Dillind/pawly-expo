import type { Option } from '@/types/core';

/** Two letters, so the first keystroke does not reorder the whole list. */
export const MIN_SEARCH_LENGTH = 2;

// Names carry accents -- "artésien-normand", "Bắc Hà dog" -- and nobody types
// them, so both sides are folded before they are compared.
const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Damerau-Levenshtein, stopped as soon as the row's best beats `max`. The
 * bound is what keeps this affordable over 900 names on every keystroke.
 */
const editDistance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious: number[] = [];

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowBest = i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      let best = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);

      // The transposition case: "labardor" should still reach "labrador".
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, beforePrevious[j - 2] + 1);
      }

      current.push(best);
      rowBest = Math.min(rowBest, best);
    }

    if (rowBest > max) return max + 1;

    beforePrevious = previous;
    previous = current;
  }

  return previous[b.length];
};

/** One wrong letter is always forgiven; a second only in a longer word. */
const toleranceFor = (term: string): number => (term.length > 5 ? 2 : 1);

// Lower sorts first. The bands matter more than the numbers: every exact
// match outranks every fuzzy one, so a typo never displaces a real match.
const NAME_PREFIX = 0;
const WORD_PREFIX = 1;
const CONTAINS = 2;
const FUZZY = 3;

const scoreOf = (name: string, term: string): number | null => {
  const at = name.indexOf(term);

  if (at === 0) return NAME_PREFIX;
  if (at > 0) return name[at - 1] === ' ' || name[at - 1] === '-' ? WORD_PREFIX : CONTAINS;

  const tolerance = toleranceFor(term);
  let best = tolerance + 1;

  // Against each word as well as the whole name, so a typo in "cocker" still
  // reaches "American cocker spaniel".
  for (const word of [name, ...name.split(/[\s-]+/)]) {
    best = Math.min(best, editDistance(term, word, tolerance));
    if (best === 0) break;
  }

  return best <= tolerance ? FUZZY + best : null;
};

/**
 * Below `MIN_SEARCH_LENGTH` the full list is returned unchanged, so the picker
 * opens on every breed rather than on one letter's worth of noise.
 */
export const searchBreeds = (breeds: Option[], query: string): Option[] => {
  const term = fold(query);

  if (term.length < MIN_SEARCH_LENGTH) return breeds;

  return breeds
    .map((breed) => ({ breed, score: scoreOf(fold(breed.label), term) }))
    .filter((match): match is { breed: Option; score: number } => match.score !== null)
    .sort((a, b) => a.score - b.score || a.breed.label.localeCompare(b.breed.label, 'en'))
    .map(({ breed }) => breed);
};
