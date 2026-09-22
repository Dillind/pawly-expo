import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import type { RpcRow } from '@/types/database-overrides';

export const ALERTS_PAGE_SIZE = 30;

// `feed_logged` and `feed_due` are deliberately absent: each stays in the
// database as a delivery record. See ADR 0023 and ADR 0033.
type AlertKind = AlertRow['kind'];

// A row survives its subject, so every resolved field here can be null.
export type Alert = {
  id: string;
  kind: AlertKind;
  createdAt: string;
  isRead: boolean;
  wasSuppressed: boolean;
  actorName: string | null;
  petId: string | null;
  petName: string | null;
  slotLabel: string | null;
  postId: string | null;
  postCaption: string | null;
  commentId: string | null;
  commentBody: string | null;
  commentIsReplyToMe: boolean;
  commentPostIsMine: boolean;
  subjectName: string | null;
  subjectIsMe: boolean;
};

// Keyset: an alert queued mid-scroll must not shift a page.
export type AlertsCursor = { createdAt: string; id: string };

type AlertRow = RpcRow<'list_alerts'>;

// Must agree with authorName in send-alerts/message.ts.
const displayName = (firstName: string | null, lastName: string | null): string | null => {
  const name = [firstName, lastName].filter(Boolean).join(' ');

  return name || null;
};

const toAlert = (row: AlertRow): Alert => ({
  id: row.id,
  kind: row.kind,
  createdAt: row.created_at,
  isRead: row.is_read,
  wasSuppressed: row.suppressed_reason !== null,
  actorName: displayName(row.actor_first_name, row.actor_last_name),
  petId: row.pet_id,
  petName: row.pet_name,
  slotLabel: row.slot_label,
  postId: row.post_id,
  postCaption: row.post_caption,
  commentId: row.comment_id,
  commentBody: row.comment_body,
  commentIsReplyToMe: row.comment_is_reply_to_me,
  commentPostIsMine: row.comment_post_is_mine,
  subjectName: displayName(row.subject_first_name, row.subject_last_name),
  subjectIsMe: row.subject_is_me
});

namespace AlertService {
  export async function listPage(
    householdId: string,
    cursor: AlertsCursor | null
  ): Promise<Alert[]> {
    const data = await unwrap(
      supabase.rpc('list_alerts', {
        target_household_id: householdId,
        before_created_at: cursor?.createdAt ?? null,
        before_id: cursor?.id ?? null,
        page_size: ALERTS_PAGE_SIZE
      })
    );

    return data.map(toAlert);
  }

  export async function unreadCount(householdId: string): Promise<number> {
    const data = await unwrap(
      supabase.rpc('unread_alert_count', {
        target_household_id: householdId
      })
    );

    return data ?? 0;
  }

  export async function markRead(alertIds: string[]): Promise<void> {
    if (alertIds.length === 0) return;

    await unwrap(supabase.rpc('mark_alerts_read', { alert_ids: alertIds }));
  }

  export async function markAllRead(householdId: string): Promise<void> {
    await unwrap(
      supabase.rpc('mark_all_alerts_read', {
        target_household_id: householdId
      })
    );
  }
}

export default AlertService;
