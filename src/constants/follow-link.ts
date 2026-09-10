/**
 * What a follow QR encodes. Behind one constant for the same reason
 * `inviteLink` is -- ADR 0020 leaves a universal link open.
 *
 * It does not expire, and there is no code: the household id IS the link, and
 * the Owner's accept is the whole of the gate.
 */
const SCHEME = 'crumpetapp';

export const followLink = (householdId: string): string => `${SCHEME}://follow/${householdId}`;
