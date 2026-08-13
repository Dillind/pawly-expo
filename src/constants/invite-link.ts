/**
 * What a QR encodes. Behind one constant so swapping the custom scheme for a
 * universal link later touches nothing else — ADR 0020 leaves that door open,
 * and a QR is inherently the case where the scanner already has the app.
 */
const SCHEME = 'crumpetapp';

export const inviteLink = (code: string): string => `${SCHEME}://invite/${code}`;
