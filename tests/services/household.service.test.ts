import { ErrorMessage } from '@/constants/enums';
import { UserFacingError } from '@/lib/errors';
import HouseholdService from '@/services/household.service';

const mockWriteSelect = jest.fn();
const mockEq = jest.fn(() => ({ select: mockWriteSelect }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockRpc = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({ update: mockUpdate })),
    rpc: (...args: unknown[]) => mockRpc(...(args as []))
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteSelect.mockResolvedValue({ data: [{ id: 'household-1' }], error: null });
});

describe('HouseholdService.update', () => {
  it('translates the domain shape into column names', async () => {
    await HouseholdService.update('household-1', { handle: 'kathys-house', isListed: true });

    expect(mockUpdate).toHaveBeenCalledWith({
      handle: 'kathys-house',
      is_listed: true
    });
  });

  it('writes only the fields it was given', async () => {
    await HouseholdService.update('household-1', { isListed: false });

    expect(mockUpdate).toHaveBeenCalledWith({ is_listed: false });
  });

  it('trims the name but never the handle, which the schema already lowercased', async () => {
    await HouseholdService.update('household-1', { name: '  Kathys House  ' });

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Kathys House' });
  });

  it('turns a unique violation into copy a person can read', async () => {
    mockWriteSelect.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' }
    });

    await expect(
      HouseholdService.update('household-1', { handle: 'kathys-house' })
    ).rejects.toThrow(new UserFacingError(ErrorMessage.HouseholdHandleTaken));
  });

  it('re-throws any other driver error untouched', async () => {
    const error = { code: '42501', message: 'permission denied' };
    mockWriteSelect.mockResolvedValue({ data: null, error });

    await expect(HouseholdService.update('household-1', { isListed: true })).rejects.toEqual(error);
  });

  it('reports an empty write as an ownership failure', async () => {
    mockWriteSelect.mockResolvedValue({ data: [], error: null });

    await expect(HouseholdService.update('household-1', { isListed: true })).rejects.toThrow(
      'Only an owner can change household settings'
    );
  });
});

describe('HouseholdService.isHandleAvailable', () => {
  it('asks the RPC and reports only a true answer as free', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    await expect(HouseholdService.isHandleAvailable('kathys-house')).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('handle_available', { candidate: 'kathys-house' });

    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(HouseholdService.isHandleAvailable('kathys-house')).resolves.toBe(false);
  });
});

describe('HouseholdService.getHandleSuggestions', () => {
  it('asks for three by default and copes with no rows', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(HouseholdService.getHandleSuggestions("Kathy's House")).resolves.toEqual([]);
    expect(mockRpc).toHaveBeenCalledWith('handle_suggestions', {
      stem: "Kathy's House",
      wanted: 3
    });
  });
});

describe('HouseholdService.remove', () => {
  it('sends the household and the typed name to the RPC', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'deleted' }, error: null });

    await HouseholdService.remove('household-1', 'Hollybank Cottage');

    expect(mockRpc).toHaveBeenCalledWith('delete_household', {
      target_household_id: 'household-1',
      confirmed_name: 'Hollybank Cottage'
    });
  });

  // Every status is an outcome the screen words differently, so none of them
  // throws and the caller reads the status rather than catching.
  it('returns a refusal rather than throwing', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'not_owner' }, error: null });

    await expect(HouseholdService.remove('household-1', 'Hollybank Cottage')).resolves.toEqual({
      status: 'not_owner'
    });
  });

  it('throws when the call itself fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('network') });

    await expect(HouseholdService.remove('household-1', 'Hollybank Cottage')).rejects.toThrow(
      'network'
    );
  });
});
