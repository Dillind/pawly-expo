import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { Rpc, RpcRow } from '@/types/database-overrides';

export type FollowRelationship = 'member' | 'pending' | 'accepted' | 'none';

export type FollowPreviewPet = {
  id: string;
  name: string;
  breed: string | null;
  photoUrl: string | null;
};

type FollowPreview = {
  status: FollowRelationship;
  householdId: string;
  name: string;
  handle: string | null;
  pets: FollowPreviewPet[];
};

export type RequestFollowStatus = Rpc<'request_follow'>['status'];

type RespondStatus = Rpc<'respond_to_follow_request'>['status'];

type RemoveFollowerStatus = Rpc<'remove_follower'>['status'];

export type HouseholdSearchResult = {
  householdId: string;
  name: string;
  // Never null: a Household cannot be Listed without one.
  handle: string;
  petCount: number;
  relationship: FollowRelationship;
};

type FollowedHousehold = {
  householdId: string;
  name: string;
  petCount: number;
  status: 'pending' | 'accepted';
};

type FollowRow = RpcRow<'list_household_follows'>;

export type FollowBackRelationship = FollowRow['named_households'][number]['relationship'];

export type NamedHousehold = {
  householdId: string;
  name: string;
  handle: string | null;
  relationship: FollowBackRelationship;
};

export type Follower = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  requestedAt: string;
  respondedAt: string | null;
  namedHouseholds: NamedHousehold[];
};

export type FollowRequestSummary = {
  pendingCount: number;
  newest: { firstName: string | null; lastName: string | null; avatarUrl: string | null }[];
  hasUnread: boolean;
};

const toFollower = (row: FollowRow): Follower => ({
  id: row.id,
  userId: row.follower_id,
  firstName: row.first_name,
  lastName: row.last_name,
  avatarUrl: row.avatar_url,
  requestedAt: row.requested_at,
  respondedAt: row.responded_at,
  namedHouseholds: row.named_households.map((named) => ({
    householdId: named.household_id,
    name: named.name,
    handle: named.handle,
    relationship: named.relationship
  }))
});

namespace FollowService {
  // A definer function: the viewer can read neither the household nor its pets
  // until the Owner accepts.
  export async function preview(householdId: string): Promise<FollowPreview | null> {
    const data = await unwrap(
      supabase.rpc('follow_preview', {
        target_household_id: householdId
      })
    );

    const result = data;

    // An absence, not a relationship: inside `status` every reader had to test
    // the one value that means the other four cannot apply.
    if (result.status === 'not_found') return null;

    return {
      status: result.status,
      householdId: result.household_id as string,
      name: result.name as string,
      handle: result.handle ?? null,
      pets: (result.pets ?? []).map((pet) => ({
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        photoUrl: pet.photo_url
      }))
    };
  }

  // Named Households the caller does not own are dropped by the RPC.
  export async function request(
    householdId: string,
    namedHouseholdIds: string[] = []
  ): Promise<RequestFollowStatus> {
    const data = await unwrap(
      supabase.rpc('request_follow', {
        target_household_id: householdId,
        named_household_ids: namedHouseholdIds
      })
    );

    return data.status;
  }

  export async function unfollow(householdId: string): Promise<void> {
    await unwrap(
      supabase.rpc('unfollow_household', {
        target_household_id: householdId
      })
    );
  }

  // Owner only, enforced in the function rather than by a write policy.
  export async function respond(params: {
    followId: string;
    accept: boolean;
  }): Promise<RespondStatus> {
    const data = await unwrap(
      supabase.rpc('respond_to_follow_request', {
        follow_id: params.followId,
        accept: params.accept
      })
    );

    return data.status;
  }

  export async function remove(followId: string): Promise<RemoveFollowerStatus> {
    const data = await unwrap(supabase.rpc('remove_follower', { follow_id: followId }));

    return data.status;
  }

  export async function listFollowing(): Promise<FollowedHousehold[]> {
    const data = await unwrap(supabase.rpc('list_following'));

    const rows = (data ?? []) as {
      household_id: string;
      name: string;
      pet_count: number;
      status: 'pending' | 'accepted';
    }[];

    return rows.map((row) => ({
      householdId: row.household_id,
      name: row.name,
      petCount: row.pet_count,
      status: row.status
    }));
  }

  // A definer function: is_listed is the gate, and RLS would otherwise return
  // only the caller's own rows.
  export async function search(query: string): Promise<HouseholdSearchResult[]> {
    const data = await unwrap(supabase.rpc('search_households', { query }));

    const rows = (data ?? []) as {
      household_id: string;
      name: string;
      handle: string;
      pet_count: number;
      relationship: FollowRelationship;
    }[];

    return rows.map((row) => ({
      householdId: row.household_id,
      name: row.name,
      handle: row.handle,
      petCount: row.pet_count,
      relationship: row.relationship
    }));
  }

  async function listByStatus(
    householdId: string,
    status: 'accepted' | 'pending'
  ): Promise<Follower[]> {
    const data = await unwrap(
      supabase.rpc('list_household_follows', {
        target_household_id: householdId,
        follow_status: status
      })
    );

    return data.map(toFollower);
  }

  export function listFollowers(householdId: string): Promise<Follower[]> {
    return listByStatus(householdId, 'accepted');
  }

  export function listRequests(householdId: string): Promise<Follower[]> {
    return listByStatus(householdId, 'pending');
  }

  export async function requestSummary(householdId: string): Promise<FollowRequestSummary> {
    const data = await unwrap(
      supabase.rpc('follow_request_summary', { target_household_id: householdId })
    );

    return {
      pendingCount: data.pending_count,
      newest: data.newest.map((person) => ({
        firstName: person.first_name,
        lastName: person.last_name,
        avatarUrl: person.avatar_url
      })),
      hasUnread: data.has_unread
    };
  }

  export async function markRequestAlertsRead(householdId: string): Promise<void> {
    await unwrap(
      supabase.rpc('mark_follow_request_alerts_read', { target_household_id: householdId })
    );
  }
}

export default FollowService;
