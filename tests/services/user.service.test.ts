import UserService from '@/services/user.service';

const rpcResult: { data: unknown; error: unknown } = { data: null, error: null };
const mockRpc = jest.fn(() => Promise.resolve(rpcResult));

jest.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...(args as [])) }
}));

beforeEach(() => {
  jest.clearAllMocks();
  rpcResult.data = null;
  rpcResult.error = null;
});

describe('UserService.getUsernameSuggestions', () => {
  it('passes the stem and how many are wanted', async () => {
    rpcResult.data = ['ben_dog1', 'ben_dog3', 'ben_dog4'];

    const suggestions = await UserService.getUsernameSuggestions('ben_dog');

    expect(mockRpc).toHaveBeenCalledWith('username_suggestions', {
      stem: 'ben_dog',
      wanted: 3
    });
    expect(suggestions).toEqual(['ben_dog1', 'ben_dog3', 'ben_dog4']);
  });

  it('reads no suggestions as an empty list', async () => {
    const suggestions = await UserService.getUsernameSuggestions('sarah_c');

    expect(suggestions).toEqual([]);
  });

  it('throws what the RPC returned', async () => {
    rpcResult.error = new Error('rpc failed');

    await expect(UserService.getUsernameSuggestions('sarah_c')).rejects.toThrow('rpc failed');
  });
});
