import { alertGlyph, alertSentence } from '@/lib/alert-copy';
import type { Alert } from '@/services/alert.service';

const alert = (overrides: Partial<Alert>): Alert => ({
  id: 'a1',
  kind: 'feed_logged',
  createdAt: '2026-08-14T07:00:00.000Z',
  isRead: false,
  wasSuppressed: false,
  actorName: 'Sarah Smith',
  petId: 'p1',
  petName: 'Crumpet',
  slotLabel: null,
  feedLogId: 'f1',
  postId: null,
  postCaption: null,
  subjectName: null,
  subjectIsMe: false,
  ...overrides
});

describe('alertSentence', () => {
  it('names the actor and the pet for a logged feed', () => {
    expect(alertSentence(alert({}))).toBe('Sarah Smith fed Crumpet');
  });

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

  it('falls back when a liked post has no caption', () => {
    const sentence = alertSentence(alert({ kind: 'post_liked', postCaption: null, petName: null }));

    expect(sentence).toBe('Sarah Smith liked your photo');
  });

  // The row outlives its subject, so a deleted feed log must still read.
  it('says less rather than breaking when the pet is gone', () => {
    expect(alertSentence(alert({ petName: null }))).toBe('Sarah Smith logged a feed');
    expect(alertSentence(alert({ kind: 'missed_feed', petName: null }))).toBe('A feed was missed');
  });

  it('addresses the reader directly when they are the subject', () => {
    expect(alertSentence(alert({ kind: 'member_removed', subjectIsMe: true }))).toBe(
      'Sarah Smith removed you from the household'
    );
    expect(alertSentence(alert({ kind: 'member_role_changed', subjectIsMe: true }))).toBe(
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
    expect(alertSentence(alert({ actorName: null }))).toBe('Member fed Crumpet');
  });
});

describe('alertGlyph', () => {
  it('gives the three membership kinds one shared glyph', () => {
    expect(alertGlyph('member_removed')).toBe('users');
    expect(alertGlyph('member_role_changed')).toBe('users');
    expect(alertGlyph('member_left')).toBe('users');
  });

  it('distinguishes the rest', () => {
    expect(alertGlyph('feed_logged')).toBe('utensils');
    expect(alertGlyph('missed_feed')).toBe('circleAlert');
    expect(alertGlyph('post')).toBe('image');
    expect(alertGlyph('post_liked')).toBe('heart');
  });
});
