import { UserFacingError, userFacingMessage } from '@/lib/errors';

describe('userFacingMessage', () => {
  it('shows a message a service wrote for the user', () => {
    const error = new UserFacingError('There is already a dinner feed. Edit that one instead.');

    expect(userFacingMessage(error, 'Could not save the feed time')).toBe(
      'There is already a dinner feed. Edit that one instead.'
    );
  });

  it('hides a raw driver error behind the call site copy', () => {
    // The exact string Postgres returns when RLS rejects a write.
    const raw = new Error('new row violates row-level security policy for table "pets"');

    expect(userFacingMessage(raw, 'Could not update pet details')).toBe(
      'Could not update pet details'
    );
  });

  it('falls back for anything that is not an Error at all', () => {
    expect(userFacingMessage('boom', 'Could not save')).toBe('Could not save');
    expect(userFacingMessage(undefined, 'Could not save')).toBe('Could not save');
    expect(userFacingMessage(null, 'Could not save')).toBe('Could not save');
  });

  it('is still an Error, so existing catch blocks keep working', () => {
    const error = new UserFacingError('The selected photo is empty');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UserFacingError');
  });
});
