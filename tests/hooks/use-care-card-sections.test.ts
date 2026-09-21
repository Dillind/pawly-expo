import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { act, renderHook } from '@testing-library/react-native';

import { useCareCardSections } from '@/hooks/use-care-card-sections';

const fakeSheet = () => ({ present: jest.fn() }) as unknown as TrueSheet;

const setup = async (isOwner: boolean) => {
  const { result } = await renderHook(() => useCareCardSections(isOwner));
  const tray = fakeSheet();
  const sheet = fakeSheet();
  result.current.trayRef.current = tray;
  result.current.sheetRef.current = sheet;
  return { result, tray, sheet };
};

describe('useCareCardSections', () => {
  it('opens the edit tray for an owner', async () => {
    const { result, tray, sheet } = await setup(true);

    await act(async () => result.current.openSection('watch-for'));

    expect(tray.present).toHaveBeenCalled();
    expect(sheet.present).not.toHaveBeenCalled();
    expect(result.current.openSectionId).toBe('watch-for');
  });

  it('opens the read-only sheet for anyone else', async () => {
    const { result, tray, sheet } = await setup(false);

    await act(async () => result.current.openSection('watch-for'));

    expect(sheet.present).toHaveBeenCalled();
    expect(tray.present).not.toHaveBeenCalled();
  });

  it('forgets the section once it closes', async () => {
    const { result } = await setup(false);

    await act(async () => result.current.openSection('paperwork'));
    await act(async () => result.current.closeSection());

    expect(result.current.openSectionId).toBeUndefined();
  });
});
