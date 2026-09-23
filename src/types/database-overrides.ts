import type { Database as Generated } from '@/types/database';

type Enum<Name extends keyof Generated['public']['Enums']> = Generated['public']['Enums'][Name];

type OccurrenceState = 'fed' | 'due' | 'missed' | 'upcoming';
type ReminderState = 'due' | 'done' | 'future' | 'missed';

type FeatureRequestRow = {
  id: string;
  title: string;
  description: string | null;
  status: Enum<'feature_request_status'>;
  vote_count: number;
  has_voted: boolean;
  is_mine: boolean;
  is_team_post: boolean;
  is_hidden: boolean;
  report_count: number;
  created_at: string;
};

type ReminderRow = {
  reminder_id: string;
  title: string;
  kind: Enum<'reminder_kind'>;
  local_time: string;
  state: ReminderState;
  done_by: string | null;
  done_at: string | null;
};

type MembershipResult = {
  status:
    | 'changed'
    | 'unchanged'
    | 'removed'
    | 'left'
    | 'last_owner'
    | 'not_owner'
    | 'not_a_member'
    | 'use_leave';
};

// What each RPC really returns. The generator types jsonb as Json and marks every `returns table`
// column non-null; each entry here replaces one of those guesses. Keep it in step with the SQL.
type RpcReturns = {
  list_alerts: {
    id: string;
    kind: Exclude<Enum<'alert_kind'>, 'feed_logged' | 'feed_due'>;
    created_at: string;
    suppressed_reason: string | null;
    is_read: boolean;
    actor_first_name: string | null;
    actor_last_name: string | null;
    pet_id: string | null;
    pet_name: string | null;
    slot_label: string | null;
    post_id: string | null;
    post_caption: string | null;
    comment_id: string | null;
    comment_body: string | null;
    comment_is_reply_to_me: boolean;
    comment_post_is_mine: boolean;
    subject_first_name: string | null;
    subject_last_name: string | null;
    subject_is_me: boolean;
  }[];

  list_feature_requests: FeatureRequestRow[];
  get_feature_request: FeatureRequestRow[];

  pet_feed_times: {
    series_id: string;
    local_time: string;
    label: Enum<'feeding_schedule_label'>;
    days_of_week: number[];
    instructions: string | null;
  }[];
  pet_occurrence_states: {
    series_id: string;
    local_time: string;
    label: Enum<'feeding_schedule_label'>;
    instructions: string | null;
    scheduled_at: string;
    state: OccurrenceState;
    satisfying_log_id: string | null;
    satisfied_at: string | null;
    satisfied_by: string | null;
  }[];
  log_feed: {
    status?: string;
    log_id?: string;
    is_extra_feed?: boolean;
    occurrence?: { label: Enum<'feeding_schedule_label'>; local_time: string };
    existing?: { id: string; logged_at: string; logged_by: string | null };
  };

  pet_reminders: ReminderRow[];
  pet_reminders_range: (ReminderRow & { occurrence_date: string })[];
  household_reminder_days: { day: string; kinds: Enum<'reminder_kind'>[] }[];

  follow_preview: {
    status: 'member' | 'pending' | 'accepted' | 'none' | 'not_found';
    household_id?: string;
    name?: string;
    handle?: string | null;
    pets?: { id: string; name: string; breed: string | null; photo_url: string | null }[];
  };
  request_follow: {
    status: 'pending' | 'accepted' | 'already_member' | 'blocked' | 'not_found';
  };
  respond_to_follow_request: {
    status: 'accepted' | 'declined' | 'not_owner' | 'not_pending' | 'not_found';
  };
  remove_follower: { status: 'removed' | 'not_owner' | 'not_found' };
  list_household_follows: {
    id: string;
    follower_id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    requested_at: string;
    responded_at: string | null;
    named_households: {
      household_id: string;
      name: string;
      handle: string | null;
      relationship: 'member' | 'pending' | 'accepted' | 'blocked' | 'none';
    }[];
  }[];
  follow_request_summary: {
    pending_count: number;
    newest: { first_name: string | null; last_name: string | null; avatar_url: string | null }[];
    has_unread: boolean;
  };

  create_household_with_pet: {
    status: 'created' | 'handle_taken';
    household_id?: string;
    pet_id?: string;
    pet_name?: string;
  };
  delete_household: { status: 'deleted' | 'not_owner' | 'not_found' | 'name_mismatch' };
  household_photo_manifest: {
    status: 'ok' | 'not_owner' | 'not_found' | 'name_mismatch';
    pet_photos?: string[];
    post_photos?: string[];
  };
  set_member_role: MembershipResult;
  remove_household_member: MembershipResult;
  leave_household: MembershipResult;

  create_household_invite: {
    status: 'created' | 'already_member' | 'not_owner';
    code?: string;
  };
  preview_household_invite: {
    status: 'valid' | 'already_member' | 'already_used' | 'expired' | 'revoked' | 'not_found';
    household_name?: string;
    role?: Enum<'household_role'>;
  };
  redeem_household_invite: {
    status:
      | 'joined'
      | 'already_member'
      | 'already_used'
      | 'expired'
      | 'revoked'
      | 'not_found'
      | 'not_signed_in';
    household_id?: string;
  };
};

type GeneratedFunctions = Generated['public']['Functions'];

type Functions = Omit<GeneratedFunctions, keyof RpcReturns> & {
  [Name in keyof RpcReturns]: Omit<GeneratedFunctions[Name], 'Returns'> & {
    Returns: RpcReturns[Name];
  };
};

export type Database = Omit<Generated, 'public'> & {
  public: Omit<Generated['public'], 'Functions'> & { Functions: Functions };
};

export type Rpc<Name extends keyof RpcReturns> = RpcReturns[Name];

export type RpcRow<Name extends keyof RpcReturns> = RpcReturns[Name] extends (infer Row)[]
  ? Row
  : never;

export type { Enum };
