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
  status: FollowRelationship | 'not_found';
  householdId?: string;
  name?: string;
  pets: FollowPreviewPet[];
};

export type RequestFollowStatus =
  'pending' | 'accepted' | 'already_member' | 'blocked' | 'not_found';

export type RespondStatus = 'accepted' | 'declined' | 'not_owner' | 'not_pending' | 'not_found';

export type RemoveFollowerStatus = 'removed' | 'not_owner' | 'not_found';

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
  username: string | null;
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
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const FOLLOWER_SELECT = `
  id, follower_id, requested_at, responded_at,
  users!household_follows_follower_id_fkey(first_name, last_name, username, avatar_url)
`;

const toFollower = (row: FollowerRow): Follower => ({
  id: row.id,
  userId: row.follower_id,
  firstName: row.users?.first_name ?? null,
  lastName: row.users?.last_name ?? null,
  username: row.users?.username ?? null,
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
  export async function preview(householdId: string): Promise<FollowPreview> {
    const { data, error } = await supabase.rpc('follow_preview', {
      target_household_id: householdId
    });

    if (error) throw error;

    const result = data as {
      status: FollowPreview['status'];
      household_id?: string;
      name?: string;
      pets?: { id: string; name: string; breed: string | null; photo_url: string | null }[];
    };

    return {
      status: result.status,
      householdId: result.household_id,
      name: result.name,
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

  /** A household's accepted followers. Owner-only by RLS. */
  export async function listFollowers(householdId: string): Promise<Follower[]> {
    const { data, error } = await supabase
      .from('household_follows')
      .select(FOLLOWER_SELECT)
      .eq('household_id', householdId)
      .eq('status', 'accepted')
      .order('responded_at', { ascending: true });

    if (error) throw error;

    return (data as unknown as FollowerRow[]).map(toFollower);
  }

  /** Everyone still waiting on the Owner. Oldest first: they have waited longest. */
  export async function listRequests(householdId: string): Promise<Follower[]> {
    const { data, error } = await supabase
      .from('household_follows')
      .select(FOLLOWER_SELECT)
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) throw error;

    return (data as unknown as FollowerRow[]).map(toFollower);
  }
}

export default FollowService;
