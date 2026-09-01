import { supabase } from '@/lib/supabase/client';
import type { HouseholdRole } from '@/types/core';

export type PendingInvite = {
  id: string;
  email: string;
  role: HouseholdRole;
  code: string;
  createdAt: string;
  expiresAt: string;
};

export type CreateInviteStatus = 'created' | 'already_member' | 'not_owner';

export type PreviewStatus =
  'valid' | 'already_member' | 'already_used' | 'expired' | 'revoked' | 'not_found';

export type InvitePreview = {
  status: PreviewStatus;
  householdName?: string;
  role?: HouseholdRole;
};

export type RedeemStatus =
  | 'joined'
  | 'already_member'
  | 'already_used'
  | 'expired'
  | 'revoked'
  | 'not_found'
  | 'not_signed_in';

type InviteRow = {
  id: string;
  email: string;
  role: HouseholdRole;
  code: string;
  created_at: string;
  expires_at: string;
};

const toInvite = (row: InviteRow): PendingInvite => ({
  id: row.id,
  email: row.email,
  role: row.role,
  code: row.code,
  createdAt: row.created_at,
  expiresAt: row.expires_at
});

namespace InviteService {
  /**
   * Never reports whether the address has an account. The invite is created
   * either way, so there is no lookup result to leak — see ADR 0020.
   */
  export async function create(params: {
    householdId: string;
    email: string;
    role: HouseholdRole;
  }): Promise<{ status: CreateInviteStatus; code?: string }> {
    const { data, error } = await supabase.rpc('create_household_invite', {
      target_household_id: params.householdId,
      invitee_email: params.email,
      invitee_role: params.role
    });

    if (error) throw error;

    const result = data as { status: CreateInviteStatus; code?: string };

    return { status: result.status, code: result.code };
  }

  /** Everything still outstanding for a household. Owner-only by RLS. */
  export async function listPending(householdId: string): Promise<PendingInvite[]> {
    const { data, error } = await supabase
      .from('household_invites')
      .select('id, email, role, code, created_at, expires_at')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data as InviteRow[]).map(toInvite);
  }

  /**
   * What a code is offering, without accepting it. Holding the code is the
   * authorisation — the select policy covers owners and the named invitee, and
   * someone who scanned a QR is usually neither.
   */
  export async function preview(code: string): Promise<InvitePreview> {
    const { data, error } = await supabase.rpc('preview_household_invite', {
      invite_code: code
    });

    if (error) throw error;

    const result = data as { status: PreviewStatus; household_name?: string; role?: HouseholdRole };

    return { status: result.status, householdName: result.household_name, role: result.role };
  }

  export async function revoke(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_household_invite', { invite_id: inviteId });

    if (error) throw error;
  }

  /**
   * By code when typed or scanned, by id when tapped in the inbox. Returns a
   * status rather than throwing — expired, revoked and already_used each need
   * different wording.
   */
  export async function redeem(params: {
    code?: string;
    inviteId?: string;
  }): Promise<{ status: RedeemStatus; householdId?: string }> {
    const { data, error } = await supabase.rpc('redeem_household_invite', {
      invite_code: params.code ?? undefined,
      invite_id: params.inviteId ?? undefined
    });

    if (error) throw error;

    const result = data as { status: RedeemStatus; household_id?: string };

    return { status: result.status, householdId: result.household_id };
  }
}

export default InviteService;
