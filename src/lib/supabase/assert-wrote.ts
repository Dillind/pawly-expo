import { UserFacingError } from '@/lib/errors';

/**
 * A write blocked by RLS is not an error. The policy filters the row out, the
 * statement matches nothing, and PostgREST returns success -- so a write that
 * never happened reads exactly like one that did. Pairing every update with
 * `.select()` is what tells the two apart.
 */
export const assertWrote = (rows: unknown[] | null, message: string): void => {
  if (!rows || rows.length === 0) throw new UserFacingError(message);
};
