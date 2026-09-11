import { supabase } from '@/lib/supabase/client';

/** Where the viewer stands with a household they did not create. */
export type FollowRelationship = 'member' | 'pending' | 'accepted' | 'none';

export type FollowPreviewPet = {
  id: string;
  name: string;
  breed: string | null;
  photoUrl: string | null;
};

export type FollowPreview = {
  status: FollowRelationship;
  householdId: string;
  name: string;
  /** Null for a Household whose Owner has not set one. */
  handle: string | null;
  pets: FollowPreviewPet[];
};

export type RequestFollowStatus =
  'pending' | 'accepted' | 'already_member' | 'blocked' | 'not_found';

export type RespondStatus = 'accepted' | 'declined' | 'not_owner' | 'not_pending' | 'not_found';

export type RemoveFollowerStatus = 'removed' | 'not_owner' | 'not_found';

/** A Listed Household as it appears in search, with where the caller stands. */
export type HouseholdSearchResult = {
  householdId: string;
  name: string;
  /** Never null: a Household cannot be Listed without one. */
  handle: string;
  petCount: number;
  relationship: FollowRelationship;
};

export type FollowedHousehold = {
  householdId: string;
  name: string;
  petCount: number;
  status: 'pending' | 'accepted';
};

/** A person on the Owner's Followers or Requests list. */
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
  /**
   * What a follow link is offering, without asking for anything. A definer
   * function, because the viewer can read neither the household nor its pets
   * until the Owner accepts.
   */
  export async function preview(householdId: string): Promise<FollowPreview | null> {
    const { data, error } = await supabase.rpc('follow_preview', {
      target_household_id: householdId
    });

    if (error) throw error;

    const result = data as {
      status: FollowRelationship | 'not_found';
      household_id?: string;
      name?: string;
      handle?: string | null;
      pets?: { id: string; name: string; breed: string | null; photo_url: string | null }[];
    };

    // A household that is not there is an absence, not a relationship. Keeping
    // it inside `status` made every reader test the one value that means the
    // other four cannot apply.
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
    const { data, error } = await supabase.rpc('request_follow', {
      target_household_id: householdId
    });

    if (error) throw error;

    return (data as { status: RequestFollowStatus }).status;
  }

  export async function unfollow(householdId: string): Promise<void> {
    const { error } = await supabase.rpc('unfollow_household', {
      target_household_id: householdId
    });

    if (error) throw error;
  }

  /** Owner only, enforced in the function rather than by a write policy. */
  export async function respond(params: {
    followId: string;
    accept: boolean;
  }): Promise<RespondStatus> {
    const { data, error } = await supabase.rpc('respond_to_follow_request', {
      follow_id: params.followId,
      accept: params.accept
    });

    if (error) throw error;

    return (data as { status: RespondStatus }).status;
  }

  export async function remove(followId: string): Promise<RemoveFollowerStatus> {
    const { data, error } = await supabase.rpc('remove_follower', { follow_id: followId });

    if (error) throw error;

    return (data as { status: RemoveFollowerStatus }).status;
  }

  /** The households the viewer follows, a request still waiting included. */
  export async function listFollowing(): Promise<FollowedHousehold[]> {
    const { data, error } = await supabase.rpc('list_following');

    if (error) throw error;

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

  /**
   * Listed Households matched by name or handle. A definer function: is_listed
   * is the gate, and RLS would otherwise return only the caller's own rows.
   */
  export async function search(query: string): Promise<HouseholdSearchResult[]> {
    const { data, error } = await supabase.rpc('search_households', { query });

    if (error) throw error;

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
    const { data, error } = await supabase
      .from('household_follows')
      .select(FOLLOWER_SELECT)
      .eq('household_id', householdId)
      .eq('status', status)
      .order(orderBy, { ascending: true });

    if (error) throw error;

    return (data as unknown as FollowerRow[]).map(toFollower);
  }

  /** A household's accepted followers, in the order the Owner accepted them. */
  export function listFollowers(householdId: string): Promise<Follower[]> {
    return listByStatus(householdId, 'accepted', 'responded_at');
  }

  /** Everyone still waiting on the Owner. Oldest first: they have waited longest. */
  export function listRequests(householdId: string): Promise<Follower[]> {
    return listByStatus(householdId, 'pending', 'requested_at');
  }
}

export default FollowService;
