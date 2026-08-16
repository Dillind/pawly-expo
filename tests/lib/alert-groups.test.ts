import { collapseLikes } from '@/lib/alert-groups';
import type { Alert } from '@/services/alert.service';

const alert = (overrides: Partial<Alert>): Alert => ({
  id: 'a1',
  kind: 'post_liked',
  createdAt: '2026-08-14T07:00:00.000Z',
  isRead: false,
  wasSuppressed: false,
  actorName: 'Sarah Smith',
  petId: null,
  petName: null,
  slotLabel: null,
  postId: 'po1',
  postCaption: 'Muddy paws again',
  subjectName: null,
  subjectIsMe: false,
  ...overrides
});

describe('collapseLikes', () => {
  it('leaves anything that is not a like alone', () => {
    const rows = collapseLikes([
      alert({ id: 'x', kind: 'post' }),
      alert({ id: 'y', kind: 'post' })
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].alertIds).toEqual(['x']);
    expect(rows[0].otherLikeCount).toBe(0);
  });

  it('collapses likes on one post into a single row', () => {
    const rows = collapseLikes([
      alert({ id: 'l1', actorName: 'Lisa Jones' }),
      alert({ id: 'l2' }),
      alert({ id: 'l3' })
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].otherLikeCount).toBe(2);
    expect(rows[0].alertIds).toEqual(['l1', 'l2', 'l3']);
  });

  // The list is newest first, so the first like seen is the one the row names.
  it('keeps the newest liker as the row', () => {
    const rows = collapseLikes([
      alert({ id: 'l1', actorName: 'Lisa Jones' }),
      alert({ id: 'l2', actorName: 'Sarah Smith' })
    ]);

    expect(rows[0].actorName).toBe('Lisa Jones');
  });

  it('keeps likes on different posts apart', () => {
    const rows = collapseLikes([alert({ id: 'l1' }), alert({ id: 'l2', postId: 'po2' })]);

    expect(rows).toHaveLength(2);
  });

  it('holds the row unread while any like under it is unread', () => {
    const rows = collapseLikes([
      alert({ id: 'l1', isRead: true }),
      alert({ id: 'l2', isRead: false })
    ]);

    expect(rows[0].isRead).toBe(false);
  });

  it('reads as read only when every like under it has been read', () => {
    const rows = collapseLikes([
      alert({ id: 'l1', isRead: true }),
      alert({ id: 'l2', isRead: true })
    ]);

    expect(rows[0].isRead).toBe(true);
  });

  it('keeps the order of the rows it does not group', () => {
    const rows = collapseLikes([
      alert({ id: 'p1', kind: 'post', postId: 'po9' }),
      alert({ id: 'l1' }),
      alert({ id: 'm1', kind: 'missed_feed', postId: null }),
      alert({ id: 'l2' })
    ]);

    expect(rows.map((row) => row.id)).toEqual(['p1', 'l1', 'm1']);
  });
});
