import {
  buildFeedDueMessage,
  buildFeedLoggedMessage,
  buildMissedFeedMessage,
  buildPostCommentedMessage,
  buildPostMessage
} from '../../../supabase/functions/send-alerts/message';

// The push is the whole feature on a lock screen, so the wording is locked down
// here -- nothing else runs this file, because the Edge Function is Deno and
// Jest cannot reach it.
//
// Every kind is one line and no title (CRU-095). The two assertions repeated
// across these blocks -- a body that is set and a title that is not -- are the
// shape itself, not boilerplate.

describe('the shape every kind shares', () => {
  it('sets no title, so iOS draws the app name alone on the top line', () => {
    const messages = [
      buildFeedLoggedMessage({
        authorFirstName: 'Ben',
        authorUsername: 'ben_dog',
        petName: 'Crumpet',
        loggedAt: '2026-09-08T21:12:00.000Z',
        householdTimezone: 'Australia/Melbourne',
        logId: 'log-1'
      }),
      buildMissedFeedMessage({ petName: 'Crumpet', label: 'morning', scheduledTime: '07:00:00' }),
      buildPostMessage({
        authorFirstName: 'Sarah',
        authorUsername: 'sarah_c',
        petNames: ['Crumpet'],
        postId: 'post-1'
      }),
      buildPostCommentedMessage({
        authorFirstName: 'Lisa',
        authorUsername: 'lisa_h',
        isReplyToRecipient: false,
        isPostAuthor: true,
        postId: 'post-1'
      }),
      buildFeedDueMessage({
        pets: [{ name: 'Crumpet', label: 'dinner' }],
        scheduledTime: '17:00:00'
      })
    ];

    for (const message of messages) {
      expect(message.title).toBeUndefined();
      expect(message.body.length).toBeGreaterThan(0);
    }
  });
});

describe('buildFeedLoggedMessage', () => {
  it('names the author, the pet and the time, and never the notes', () => {
    const message = buildFeedLoggedMessage({
      authorFirstName: 'Ben',
      authorUsername: 'ben_dog',
      petName: 'Crumpet',
      // 7:12 am in Melbourne.
      loggedAt: '2026-09-07T21:12:00.000Z',
      householdTimezone: 'Australia/Melbourne',
      logId: 'log-1'
    });

    expect(message.body).toBe('ben_dog fed Crumpet at 7:12 am');
    expect(message.data).toEqual({ screen: '/home', params: { logId: 'log-1' } });
  });

  it('falls back to the first name when a signup collision wrote no handle', () => {
    expect(
      buildFeedLoggedMessage({
        authorFirstName: 'Ben',
        authorUsername: null,
        petName: 'Crumpet',
        loggedAt: '2026-09-07T21:12:00.000Z',
        householdTimezone: 'Australia/Melbourne',
        logId: 'log-1'
      }).body
    ).toBe('Ben fed Crumpet at 7:12 am');
  });

  it('says A member when the author account has gone', () => {
    expect(
      buildFeedLoggedMessage({
        authorFirstName: null,
        authorUsername: null,
        petName: 'Crumpet',
        loggedAt: '2026-09-07T21:12:00.000Z',
        householdTimezone: 'Australia/Melbourne',
        logId: 'log-1'
      }).body
    ).toBe('A member fed Crumpet at 7:12 am');
  });

  it('reads the household timezone, not the machine running this', () => {
    expect(
      buildFeedLoggedMessage({
        authorFirstName: null,
        authorUsername: 'ben',
        petName: 'Crumpet',
        loggedAt: '2026-09-07T21:12:00.000Z',
        householdTimezone: 'America/New_York',
        logId: 'log-1'
      }).body
    ).toBe('ben fed Crumpet at 5:12 pm');
  });
});

describe('buildMissedFeedMessage', () => {
  it('keeps the label and the time in one sentence', () => {
    const message = buildMissedFeedMessage({
      petName: 'Crumpet',
      label: 'morning',
      scheduledTime: '07:00:00'
    });

    expect(message.body).toBe("No one has logged Crumpet's morning feed, due 7:00 am");
    expect(message.data.screen).toBe('/home');
  });

  // ADR 0013: it names the absent log, not the absent meal.
  it('never blames anyone for not feeding the pet', () => {
    expect(
      buildMissedFeedMessage({ petName: 'Crumpet', label: 'dinner', scheduledTime: '17:00:00' })
        .body
    ).toBe("No one has logged Crumpet's dinner feed, due 5:00 pm");
  });
});

describe('buildPostMessage', () => {
  it('names the pet when exactly one is tagged, and never the caption', () => {
    expect(
      buildPostMessage({
        authorFirstName: 'Sarah',
        authorUsername: 'sarah_c',
        petNames: ['Crumpet'],
        postId: 'post-1'
      }).body
    ).toBe('sarah_c posted a photo of Crumpet');
  });

  it('says nothing about pets when two are tagged', () => {
    expect(
      buildPostMessage({
        authorFirstName: 'Sarah',
        authorUsername: 'sarah_c',
        petNames: ['Crumpet', 'Bailey'],
        postId: 'post-1'
      }).body
    ).toBe('sarah_c posted a photo');
  });

  it('says nothing about pets when none are tagged', () => {
    expect(
      buildPostMessage({
        authorFirstName: 'Sarah',
        authorUsername: 'sarah_c',
        petNames: [],
        postId: 'post-1'
      }).body
    ).toBe('sarah_c posted a photo');
  });
});

describe('buildPostCommentedMessage', () => {
  const base = {
    authorFirstName: 'Lisa',
    authorUsername: 'lisa_h',
    postId: 'post-1'
  };

  it('tells the parent comment author it was a reply', () => {
    expect(
      buildPostCommentedMessage({ ...base, isReplyToRecipient: true, isPostAuthor: false }).body
    ).toBe('lisa_h replied to your comment');
  });

  it('tells the post author it was their post', () => {
    expect(
      buildPostCommentedMessage({ ...base, isReplyToRecipient: false, isPostAuthor: true }).body
    ).toBe('lisa_h commented on your post');
  });

  // The third case: in the thread, but owns neither the post nor the parent.
  it('does not claim the post belongs to a bystander', () => {
    expect(
      buildPostCommentedMessage({ ...base, isReplyToRecipient: false, isPostAuthor: false }).body
    ).toBe('lisa_h also commented');
  });

  it('prefers the reply wording when the recipient is both', () => {
    expect(
      buildPostCommentedMessage({ ...base, isReplyToRecipient: true, isPostAuthor: true }).body
    ).toBe('lisa_h replied to your comment');
  });
});

describe('buildFeedDueMessage', () => {
  it('names the pet and the feed when one pet is due', () => {
    const message = buildFeedDueMessage({
      pets: [{ name: 'Crumpet', label: 'dinner' }],
      scheduledTime: '17:00:00'
    });

    expect(message.body).toBe("Crumpet's dinner is due at 5:00 pm");
    expect(message.data.screen).toBe('/home');
  });

  it('leads with the shared label when two pets share one', () => {
    expect(
      buildFeedDueMessage({
        pets: [
          { name: 'Crumpet', label: 'dinner' },
          { name: 'Luna', label: 'dinner' }
        ],
        scheduledTime: '17:00:00'
      }).body
    ).toBe('Dinner is due at 5:00 pm for Crumpet and Luna');
  });

  // Three pets is where the list stops and the count starts: the time has to fit.
  it('counts the pets from the third rather than listing them', () => {
    expect(
      buildFeedDueMessage({
        pets: [
          { name: 'Crumpet', label: 'dinner' },
          { name: 'Luna', label: 'dinner' },
          { name: 'Toby', label: 'dinner' }
        ],
        scheduledTime: '17:00:00'
      }).body
    ).toBe('Dinner is due at 5:00 pm for 3 pets');
  });

  it('counts the pets when the labels differ', () => {
    expect(
      buildFeedDueMessage({
        pets: [
          { name: 'Crumpet', label: 'dinner' },
          { name: 'Luna', label: 'lunch' }
        ],
        scheduledTime: '17:00:00'
      }).body
    ).toBe('Crumpet and Luna have feeds due at 5:00 pm');
  });

  it('reads as a sentence for the labels that are not nouns', () => {
    expect(
      buildFeedDueMessage({
        pets: [{ name: 'Crumpet', label: 'morning' }],
        scheduledTime: '07:00:00'
      }).body
    ).toBe("Crumpet's morning feed is due at 7:00 am");

    expect(
      buildFeedDueMessage({
        pets: [{ name: 'Crumpet', label: 'custom' }],
        scheduledTime: '12:00:00'
      }).body
    ).toBe("Crumpet's scheduled feed is due at 12:00 pm");
  });
});
