import { petCountText } from '@/utils/counts';

describe('petCountText', () => {
  it('spells a small count, because the artboards read as words', () => {
    expect(petCountText(0)).toBe('No pets');
    expect(petCountText(1)).toBe('One pet');
    expect(petCountText(3)).toBe('Three pets');
    expect(petCountText(10)).toBe('Ten pets');
  });

  it('falls back to a digit past ten', () => {
    expect(petCountText(11)).toBe('11 pets');
  });
});
