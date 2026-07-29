// Pure: no network, no database. Everything here is a decision about wording,
// which is the part worth reasoning about on its own -- and the part a future
// missed_feed kind will extend rather than rewrite.

export type FeedLoggedInput = {
  authorFirstName: string | null;
  petName: string;
  loggedAt: string;
  householdTimezone: string;
  notes: string | null;
  logId: string;
};

export type ExpoMessage = {
  to: string[];
  title: string;
  body: string;
  sound: 'default';
  data: { screen: string; params: { logId: string } };
};

// Matches formatAuthorName in src/hooks/use-household-members.ts. Every surface
// must agree -- the Home slot row, the Activity row, the detail sheet and this
// notification all render the same feed log, and three different names for one
// person reads as a bug.
const authorName = (firstName: string | null): string => firstName ?? 'Member';

// The household's timezone, never the recipient's device timezone -- the same
// rule every other surface follows.
const timeOfDay = (loggedAt: string, timezone: string): string =>
  new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  })
    .format(new Date(loggedAt))
    .replace(/\s/g, ' ')
    .toLowerCase();

export const buildFeedLoggedMessage = (input: FeedLoggedInput): Omit<ExpoMessage, 'to'> => {
  const time = timeOfDay(input.loggedAt, input.householdTimezone);
  const trimmedNotes = input.notes?.trim();

  return {
    title: `${authorName(input.authorFirstName)} fed ${input.petName}`,
    sound: 'default',
    // The " · notes" half drops entirely when there are no notes. Whitespace-
    // only notes count as none.
    body: trimmedNotes ? `${time} · ${trimmedNotes}` : time,
    // data.screen and data.params are the exact shape usePushNotifications
    // reads, and /activity?logId=... is a deep link activity/index.tsx already
    // handles -- so a tap lands on the correction sheet with no new routing.
    data: { screen: '/activity', params: { logId: input.logId } }
  };
};
