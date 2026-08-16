import { supabase } from '@/lib/supabase/client';

export const ALERTS_PAGE_SIZE = 30;

/**
 * The kinds the inbox lists. `feed_logged` is deliberately absent: it stays in
 * the database as a delivery record and is never read back here (ADR 0023).
 */
export type AlertKind =
  | 'missed_feed'
  | 'post'
  | 'post_liked'
  | 'member_removed'
  | 'member_role_changed'
  | 'member_left';

/** A row survives its subject, so every resolved field here can be null. */
export type Alert = {
  id: string;
  kind: AlertKind;
  createdAt: string;
  isRead: boolean;
  /** Recorded but never pushed. */
  wasSuppressed: boolean;
  actorName: string | null;
  petId: string | null;
  petName: string | null;
  slotLabel: string | null;
  postId: string | null;
  postCaption: string | null;
  subjectName: string | null;
  subjectIsMe: boolean;
};

/** Keyset: an alert queued mid-scroll must not shift a page. */
export type AlertsCursor = { createdAt: string; id: string };

type AlertRow = {
  id: string;
  kind: AlertKind;
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
  subject_first_name: string | null;
  subject_last_name: string | null;
  subject_is_me: boolean;
};

// Must agree with authorName in send-alerts/message.ts -- the push and the
// inbox render the same event.
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
  subjectName: displayName(row.subject_first_name, row.subject_last_name),
  subjectIsMe: row.subject_is_me
});

namespace AlertService {
  export async function listPage(
    householdId: string,
    cursor: AlertsCursor | null
  ): Promise<Alert[]> {
    const { data, error } = await supabase.rpc('list_alerts', {
      target_household_id: householdId,
      before_created_at: cursor?.createdAt ?? null,
      before_id: cursor?.id ?? null,
      page_size: ALERTS_PAGE_SIZE
    });

    if (error) throw error;

    return (data as AlertRow[]).map(toAlert);
  }

  export async function unreadCount(householdId: string): Promise<number> {
    const { data, error } = await supabase.rpc('unread_alert_count', {
      target_household_id: householdId
    });

    if (error) throw error;

    return (data as number) ?? 0;
  }

  export async function markRead(alertIds: string[]): Promise<void> {
    if (alertIds.length === 0) return;

    const { error } = await supabase.rpc('mark_alerts_read', { alert_ids: alertIds });

    if (error) throw error;
  }

  export async function markAllRead(householdId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_all_alerts_read', {
      target_household_id: householdId
    });

    if (error) throw error;
  }
}

export default AlertService;
