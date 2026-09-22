import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { Enum, RpcRow } from '@/types/database-overrides';

export type FeatureRequestStatus = Enum<'feature_request_status'>;

export type FeatureRequestSort = 'top' | 'new';

export type FeatureRequest = {
  id: string;
  title: string;
  description: string | null;
  status: FeatureRequestStatus;
  voteCount: number;
  hasVoted: boolean;
  isMine: boolean;
  isTeamPost: boolean;
  isHidden: boolean;
  reportCount: number;
  createdAt: string;
};

export type FeatureRequestsCursor = {
  voteCount: number;
  createdAt: string;
  id: string;
};

export type FeatureRequestsPage = {
  requests: FeatureRequest[];
  nextCursor: FeatureRequestsCursor | null;
};

export type CreateFeatureRequestError = 'daily_limit_reached' | 'blocked_content' | 'board_banned';

type FeatureRequestRow = RpcRow<'list_feature_requests'>;

const PAGE_SIZE = 20;

const KNOWN_CREATE_ERRORS: CreateFeatureRequestError[] = [
  'daily_limit_reached',
  'blocked_content',
  'board_banned'
];

const mapFeatureRequest = (row: FeatureRequestRow): FeatureRequest => ({
  id: row.id,
  title: row.title,
  description: row.description,
  status: row.status,
  voteCount: row.vote_count,
  hasVoted: row.has_voted,
  isMine: row.is_mine,
  isTeamPost: row.is_team_post,
  isHidden: row.is_hidden,
  reportCount: row.report_count,
  createdAt: row.created_at
});

export class FeatureRequestCreateError extends Error {
  constructor(readonly reason: CreateFeatureRequestError) {
    super(reason);
  }
}

namespace FeatureRequestService {
  export async function list(params: {
    sort: FeatureRequestSort;
    reportedOnly: boolean;
    cursor: FeatureRequestsCursor | null;
  }): Promise<FeatureRequestsPage> {
    const data = await unwrap(
      supabase.rpc('list_feature_requests', {
        sort: params.sort,
        reported_only: params.reportedOnly,
        after_vote_count: params.cursor?.voteCount ?? null,
        after_created_at: params.cursor?.createdAt ?? null,
        after_id: params.cursor?.id ?? null,
        page_size: PAGE_SIZE
      })
    );

    const requests = data.map(mapFeatureRequest);
    const last = requests.at(-1);

    return {
      requests,
      nextCursor:
        requests.length === PAGE_SIZE && last
          ? { voteCount: last.voteCount, createdAt: last.createdAt, id: last.id }
          : null
    };
  }

  export async function get(requestId: string): Promise<FeatureRequest | null> {
    const data = await unwrap(supabase.rpc('get_feature_request', { request_id: requestId }));

    const row = data[0];
    return row ? mapFeatureRequest(row) : null;
  }

  export async function create(params: {
    title: string;
    description: string | null;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('create_feature_request', {
      title: params.title,
      description: params.description
    });

    if (error) {
      const known = KNOWN_CREATE_ERRORS.find((reason) => error.message === reason);
      if (known) throw new FeatureRequestCreateError(known);
      throw error;
    }

    return data;
  }

  export async function vote(params: { requestId: string; userId: string }): Promise<void> {
    await unwrap(
      supabase
        .from('feature_request_votes')
        .insert({ request_id: params.requestId, user_id: params.userId })
    );
  }

  export async function removeVote(params: { requestId: string; userId: string }): Promise<void> {
    await unwrap(
      supabase
        .from('feature_request_votes')
        .delete()
        .eq('request_id', params.requestId)
        .eq('user_id', params.userId)
    );
  }

  export async function report(requestId: string): Promise<void> {
    await unwrap(supabase.rpc('report_feature_request', { request_id: requestId }));
  }

  // The client never learns an author's id, so a block names the request instead.
  export async function blockAuthor(requestId: string): Promise<void> {
    await unwrap(
      supabase.rpc('block_feature_request_author', {
        request_id: requestId
      })
    );
  }

  export async function remove(requestId: string): Promise<void> {
    await unwrap(supabase.rpc('delete_feature_request', { request_id: requestId }));
  }

  export async function setStatus(params: {
    requestId: string;
    status: FeatureRequestStatus;
  }): Promise<void> {
    await unwrap(
      supabase.rpc('set_feature_request_status', {
        request_id: params.requestId,
        new_status: params.status
      })
    );
  }

  export async function restore(requestId: string): Promise<void> {
    await unwrap(supabase.rpc('restore_feature_request', { request_id: requestId }));
  }

  export async function countReported(): Promise<number> {
    return unwrap(supabase.rpc('count_reported_feature_requests'));
  }

  export async function isCrumpetTeam(): Promise<boolean> {
    const data = await unwrap(supabase.rpc('is_crumpet_team'));

    return Boolean(data);
  }

  export async function isBanned(): Promise<boolean> {
    const data = await unwrap(supabase.rpc('is_feature_board_banned'));

    return Boolean(data);
  }
}

export default FeatureRequestService;
