import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { Rpc } from '@/types/database-overrides';

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

export type Follower = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  requestedAt: string;
  respondedAt: string | null;
};

type FollowerRow = {
  id: string;
  follower_id: string;
  requested_at: string;
  responded_at: string | null;
  users: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
};

const FOLLOWER_SELECT = `
  id, follower_id, requested_at, responded_at,
  users!household_follows_follower_id_fkey(first_name, last_name, avatar_url)
`;

const toFollower = (row: FollowerRow): Follower => ({
  id: row.id,
  userId: row.follower_id,
  firstName: row.users?.first_name ?? null,
  lastName: row.users?.last_name ?? null,
  avatarUrl: row.users?.avatar_url ?? null,
  requestedAt: row.requested_at,
  respondedAt: row.responded_at
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

  export async function request(householdId: string): Promise<RequestFollowStatus> {
    const data = await unwrap(
      supabase.rpc('request_follow', {
        target_household_id: householdId
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
    status: 'accepted' | 'pending',
    orderBy: 'responded_at' | 'requested_at'
  ): Promise<Follower[]> {
    const data = await unwrap(
      supabase
        .from('household_follows')
        .select(FOLLOWER_SELECT)
        .eq('household_id', householdId)
        .eq('status', status)
        .order(orderBy, { ascending: true })
    );

    return data.map(toFollower);
  }

  export function listFollowers(householdId: string): Promise<Follower[]> {
    return listByStatus(householdId, 'accepted', 'responded_at');
  }

  export function listRequests(householdId: string): Promise<Follower[]> {
    return listByStatus(householdId, 'pending', 'requested_at');
  }
}

export default FollowService;
