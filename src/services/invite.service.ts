import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { HouseholdRole } from '@/types/core';
import type { Rpc } from '@/types/database-overrides';

export type PendingInvite = {
  id: string;
  email: string;
  role: HouseholdRole;
  code: string;
  createdAt: string;
  expiresAt: string;
};

type CreateInviteStatus = Rpc<'create_household_invite'>['status'];

export type PreviewStatus = Rpc<'preview_household_invite'>['status'];

type InvitePreview = {
  status: PreviewStatus;
  householdName?: string;
  role?: HouseholdRole;
};

export type RedeemStatus = Rpc<'redeem_household_invite'>['status'];

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
  // Never reports whether the address has an account. See ADR 0020.
  export async function create(params: {
    householdId: string;
    email: string;
    role: HouseholdRole;
  }): Promise<{ status: CreateInviteStatus; code?: string }> {
    const data = await unwrap(
      supabase.rpc('create_household_invite', {
        target_household_id: params.householdId,
        invitee_email: params.email,
        invitee_role: params.role
      })
    );

    const result = data;

    return { status: result.status, code: result.code };
  }

  export async function listPending(householdId: string): Promise<PendingInvite[]> {
    const data = await unwrap(
      supabase
        .from('household_invites')
        .select('id, email, role, code, created_at, expires_at')
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
    );

    return data.map(toInvite);
  }

  // Holding the code is the authorisation: someone who scanned a QR is neither
  // an owner nor the named invitee.
  export async function preview(code: string): Promise<InvitePreview> {
    const data = await unwrap(
      supabase.rpc('preview_household_invite', {
        invite_code: code
      })
    );

    const result = data;

    return { status: result.status, householdName: result.household_name, role: result.role };
  }

  export async function revoke(inviteId: string): Promise<void> {
    await unwrap(supabase.rpc('revoke_household_invite', { invite_id: inviteId }));
  }

  // Returns a status rather than throwing: expired, revoked and already_used
  // each need different wording.
  export async function redeem(params: {
    code?: string;
    inviteId?: string;
  }): Promise<{ status: RedeemStatus; householdId?: string }> {
    const data = await unwrap(
      supabase.rpc('redeem_household_invite', {
        invite_code: params.code ?? undefined,
        invite_id: params.inviteId ?? undefined
      })
    );

    const result = data;

    return { status: result.status, householdId: result.household_id };
  }
}

export default InviteService;
