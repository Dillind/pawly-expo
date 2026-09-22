import AuthService from '@/services/auth.service';

const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockRpc = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn() }
}));
jest.mock('expo-apple-authentication', () => ({}));
jest.mock('expo-crypto', () => ({}));
jest.mock('@/services/push-token.service', () => ({ __esModule: true, default: {} }));
jest.mock('@/services/user.service', () => ({ __esModule: true, default: {} }));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...(args as [])),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...(args as [])) },
    auth: { signOut: (...args: unknown[]) => mockSignOut(...(args as [])) }
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue({ error: null });
});

describe('AuthService.deleteAccount', () => {
  it('sends the typed phrase and signs out locally once deleted', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });

    await expect(AuthService.deleteAccount('delete my account')).resolves.toEqual({
      status: 'deleted'
    });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      body: { confirmation: 'delete my account' }
    });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('names the households that block deletion and stays signed in', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'last_owner', households: ['The Smiths'] },
      error: null
    });

    await expect(AuthService.deleteAccount('delete my account')).resolves.toEqual({
      status: 'last_owner',
      households: ['The Smiths']
    });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('throws when the function fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(AuthService.deleteAccount('delete my account')).rejects.toThrow('boom');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('AuthService.accountDeletionBlockers', () => {
  it('returns the household names', async () => {
    mockRpc.mockResolvedValue({ data: ['The Smiths'], error: null });

    await expect(AuthService.accountDeletionBlockers()).resolves.toEqual(['The Smiths']);
    expect(mockRpc).toHaveBeenCalledWith('account_deletion_blockers');
  });
});
