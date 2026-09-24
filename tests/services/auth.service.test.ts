import AuthService from '@/services/auth.service';

const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockRpc = jest.fn();
const mockGetSession = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockAppleSignIn = jest.fn();

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn() }
}));
jest.mock('expo-apple-authentication', () => ({
  signInAsync: (...args: unknown[]) => mockAppleSignIn(...(args as []))
}));
jest.mock('expo-crypto', () => ({}));
jest.mock('@/services/push-token.service', () => ({ __esModule: true, default: {} }));
jest.mock('@/services/user.service', () => ({ __esModule: true, default: {} }));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...(args as [])),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...(args as [])) },
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...(args as [])),
      getSession: () => mockGetSession(),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...(args as []))
    }
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue({ error: null });
});

const emailDelete = { confirmation: 'delete my account', method: 'email' as const };

describe('AuthService.deleteAccount', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { email: 'a@x.io' } } } });
    mockSignInWithPassword.mockResolvedValue({ error: null });
  });

  it('checks the password, then sends the phrase and the Households to delete', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });

    await expect(
      AuthService.deleteAccount({ ...emailDelete, password: 'pw', householdsToDelete: ['h1'] })
    ).resolves.toEqual({ status: 'deleted' });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@x.io', password: 'pw' });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      body: {
        confirmation: 'delete my account',
        authorizationCode: undefined,
        householdsToDelete: ['h1']
      }
    });
  });

  it('stops before the function when the password is wrong', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });

    await expect(
      AuthService.deleteAccount({ ...emailDelete, password: 'bad', householdsToDelete: [] })
    ).resolves.toEqual({ status: 'wrong_password' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('sends a fresh Apple authorization code', async () => {
    mockAppleSignIn.mockResolvedValue({ authorizationCode: 'code-1' });
    mockInvoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });

    await AuthService.deleteAccount({
      confirmation: 'delete my account',
      method: 'apple',
      householdsToDelete: []
    });
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      body: expect.objectContaining({ authorizationCode: 'code-1' })
    });
  });

  it('stops quietly when the Apple sheet is cancelled', async () => {
    mockAppleSignIn.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });

    await expect(
      AuthService.deleteAccount({
        confirmation: 'delete my account',
        method: 'apple',
        householdsToDelete: []
      })
    ).resolves.toEqual({ status: 'cancelled' });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('names the households that block deletion', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'last_owner', households: ['The Smiths'] },
      error: null
    });

    await expect(
      AuthService.deleteAccount({ ...emailDelete, password: 'pw', householdsToDelete: [] })
    ).resolves.toEqual({ status: 'last_owner', households: ['The Smiths'] });
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('throws when the function fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(
      AuthService.deleteAccount({ ...emailDelete, password: 'pw', householdsToDelete: [] })
    ).rejects.toThrow('boom');
  });
});

describe('AuthService.accountDeletionPlan', () => {
  it('maps the plan to camelCase', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'h1',
          name: 'The Smiths',
          outcome: 'choose',
          members: [{ user_id: 'u2', first_name: 'Sam', role: 'contributor', joined_at: 'x' }]
        }
      ],
      error: null
    });

    await expect(AuthService.accountDeletionPlan()).resolves.toEqual([
      {
        id: 'h1',
        name: 'The Smiths',
        outcome: 'choose',
        members: [{ userId: 'u2', firstName: 'Sam', role: 'contributor' }]
      }
    ]);
    expect(mockRpc).toHaveBeenCalledWith('account_deletion_plan');
  });
});

describe('AuthService.getSignInMethod', () => {
  it('prefers Apple, then Google, over a password', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { app_metadata: { providers: ['email', 'google'] } } } }
    });
    await expect(AuthService.getSignInMethod()).resolves.toBe('google');

    mockGetSession.mockResolvedValue({
      data: { session: { user: { app_metadata: { providers: ['google', 'apple'] } } } }
    });
    await expect(AuthService.getSignInMethod()).resolves.toBe('apple');
  });
});
