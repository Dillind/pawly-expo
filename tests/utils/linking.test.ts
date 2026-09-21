import { Linking } from 'react-native';

import { callNumber } from '@/utils/linking';

describe('callNumber', () => {
  const openURL = jest.spyOn(Linking, 'openURL');

  afterEach(() => openURL.mockReset());

  it('dials the digits only', async () => {
    openURL.mockResolvedValue(true);

    await expect(callNumber('0424 548 904')).resolves.toBe(true);
    expect(openURL).toHaveBeenCalledWith('tel:0424548904');
  });

  it('keeps a leading plus', async () => {
    openURL.mockResolvedValue(true);

    await callNumber('+61 (3) 9482-1234');
    expect(openURL).toHaveBeenCalledWith('tel:+61394821234');
  });

  it('reports when the device cannot call', async () => {
    openURL.mockRejectedValue(new Error('no dialler'));

    await expect(callNumber('000')).resolves.toBe(false);
  });
});
