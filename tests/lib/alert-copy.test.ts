import { alertGlyph, alertSentence } from '@/lib/alert-copy';
import type { InboxRow } from '@/lib/alert-groups';

const alert = (overrides: Partial<InboxRow>): InboxRow => ({
  id: 'a1',
  kind: 'post',
  createdAt: '2026-08-14T07:00:00.000Z',
  isRead: false,
  wasSuppressed: false,
  actorName: 'Sarah Smith',
  petId: 'p1',
  petName: 'Crumpet',
  slotLabel: null,
  postId: 'po1',
  postCaption: 'Muddy paws again',
  commentId: null,
  commentBody: null,
  commentIsReplyToMe: false,
  commentPostIsMine: false,
  subjectName: null,
  subjectIsMe: false,
  alertIds: ['a1'],
  otherLikeCount: 0,
  ...overrides
});

describe('alertSentence', () => {
  // Nobody did it, so it leads with the pet rather than a person.
  it('names no actor for a missed feed', () => {
    const sentence = alertSentence(
      alert({ kind: 'missed_feed', petName: 'Toby', slotLabel: 'lunch' })
    );

    expect(sentence).toBe('Toby’s lunch was missed');
  });

  it('says "feed" rather than "custom" for an unlabelled slot', () => {
    const sentence = alertSentence(
      alert({ kind: 'missed_feed', petName: 'Toby', slotLabel: 'custom' })
    );

    expect(sentence).toBe('Toby’s feed was missed');
  });

  it('quotes a post caption', () => {
    const sentence = alertSentence(
      alert({ kind: 'post', postCaption: 'Muddy paws again', petName: null })
    );

    expect(sentence).toBe('Sarah Smith posted “Muddy paws again”');
  });

  it('falls back when a post has no caption', () => {
    const sentence = alertSentence(alert({ kind: 'post', postCaption: null, petName: null }));

    expect(sentence).toBe('Sarah Smith shared a photo');
  });

  it('says "your post" for a like, and quotes the caption', () => {
    const sentence = alertSentence(
      alert({ kind: 'post_liked', postCaption: 'Muddy paws again', petName: null })
    );

    expect(sentence).toBe('Sarah Smith liked your post “Muddy paws again”');
  });

  it('names the newest liker and counts the rest when likes collapse', () => {
    expect(alertSentence(alert({ kind: 'post_liked', otherLikeCount: 1 }))).toBe(
      'Sarah Smith and 1 other liked your post “Muddy paws again”'
    );
    expect(alertSentence(alert({ kind: 'post_liked', postCaption: null, otherLikeCount: 3 }))).toBe(
      'Sarah Smith and 3 others liked your photo'
    );
  });

  it('falls back when a liked post has no caption', () => {
    const sentence = alertSentence(alert({ kind: 'post_liked', postCaption: null, petName: null }));

    expect(sentence).toBe('Sarah Smith liked your photo');
  });

  // The row outlives its subject, so a deleted post must still read.
  it('says less rather than breaking when the subject is gone', () => {
    expect(alertSentence(alert({ postCaption: null }))).toBe('Sarah Smith shared a photo');
    expect(alertSentence(alert({ kind: 'missed_feed', petName: null }))).toBe('A feed was missed');
  });

  it('addresses the reader directly when they are the subject', () => {
    expect(alertSentence(alert({ kind: 'member_removed', subjectIsMe: true }))).toBe(
      'Sarah Smith removed you from the household'
    );
  });

  // The alert reaches the subject alone, so there is no third-person wording.
  it('always addresses a role change to the reader', () => {
    expect(alertSentence(alert({ kind: 'member_role_changed', subjectIsMe: true }))).toBe(
      'Sarah Smith changed your role'
    );
    expect(alertSentence(alert({ kind: 'member_role_changed', subjectName: 'Test User' }))).toBe(
      'Sarah Smith changed your role'
    );
  });

  it('names the subject when it is somebody else', () => {
    const sentence = alertSentence(
      alert({ kind: 'member_removed', subjectName: 'Test User', subjectIsMe: false })
    );

    expect(sentence).toBe('Sarah Smith removed Test User');
  });

  it('leads with the person who left, not whoever is recorded as actor', () => {
    const sentence = alertSentence(
      alert({ kind: 'member_left', subjectName: 'Test User', actorName: 'Test User' })
    );

    expect(sentence).toBe('Test User left the household');
  });

  it('falls back to "Member" for a missing name, matching the push', () => {
    expect(alertSentence(alert({ actorName: null, postCaption: null }))).toBe(
      'Member shared a photo'
    );
  });
});

describe('alertSentence for a comment', () => {
  const commented = (overrides = {}) =>
    alert({
      kind: 'post_commented',
      actorName: 'Sarah Smith',
      commentBody: 'what a face',
      ...overrides
    });

  it('names a reply to your own comment', () => {
    expect(alertSentence(commented({ commentIsReplyToMe: true }))).toBe(
      'Sarah Smith replied to your comment \u201Cwhat a face\u201D'
    );
  });

  it('names a comment on your own post', () => {
    expect(alertSentence(commented({ commentPostIsMine: true }))).toBe(
      'Sarah Smith commented on your post \u201Cwhat a face\u201D'
    );
  });

  it('claims neither when the reader owns neither', () => {
    expect(alertSentence(commented())).toBe('Sarah Smith also commented \u201Cwhat a face\u201D');
  });

  // The sibling case: Alice owns the parent but Bob was the one answered.
  it('does not claim a reply for the parent author when a sibling was answered', () => {
    expect(alertSentence(commented({ commentIsReplyToMe: false, commentPostIsMine: false }))).toBe(
      'Sarah Smith also commented \u201Cwhat a face\u201D'
    );
  });

  it('prefers the reply wording when the reader owns both', () => {
    expect(
      alertSentence(commented({ commentIsReplyToMe: true, commentPostIsMine: true }))
    ).toBe('Sarah Smith replied to your comment \u201Cwhat a face\u201D');
  });

  it('says less once the comment is gone', () => {
    expect(alertSentence(commented({ commentBody: null, commentPostIsMine: true }))).toBe(
      'Sarah Smith commented on your post'
    );
  });

  it('counts the others on a collapsed comment-like row', () => {
    expect(
      alertSentence(
        alert({
          kind: 'comment_liked',
          commentBody: 'what a face',
          otherLikeCount: 2
        })
      )
    ).toBe('Sarah Smith and 2 others liked your comment \u201Cwhat a face\u201D');
  });
});

describe('alertGlyph', () => {
  it('gives the three membership kinds one shared glyph', () => {
    expect(alertGlyph('member_removed')).toBe('users');
    expect(alertGlyph('member_role_changed')).toBe('users');
    expect(alertGlyph('member_left')).toBe('users');
  });

  it('distinguishes the rest', () => {
    expect(alertGlyph('missed_feed')).toBe('circleAlert');
    expect(alertGlyph('post')).toBe('image');
    expect(alertGlyph('post_liked')).toBe('heart');
    expect(alertGlyph('comment_liked')).toBe('heart');
    expect(alertGlyph('post_commented')).toBe('comment');
  });
});
