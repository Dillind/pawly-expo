const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/**
 * "Three pets", not "3 pets". A small count reads as a word everywhere a
 * household is described, and the artboards spell it out.
 */
export const petCountText = (count: number): string => {
  const word = count <= 10 ? WORDS[count] : String(count);

  return `${word} ${count === 1 ? 'pet' : 'pets'}`;
};
