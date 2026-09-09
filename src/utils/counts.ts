const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const form = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

/**
 * "Three pets", not "3 pets". A small count reads as a word wherever it stands
 * on its own as a label, and the artboards spell it out.
 */
export const countText = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count <= 10 ? WORDS[count] : count} ${form(count, singular, plural)}`;

/** "3 pets" -- inside a sentence or beside a label, where the digit is the point. */
export const countDigits = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${form(count, singular, plural)}`;
