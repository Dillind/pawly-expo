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
  data: { screen: string; params: Record<string, string> };
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

export type ScheduleLabel = 'morning' | 'lunch' | 'dinner' | 'custom';

// Matches slotLabelText in log-feed-sheet.tsx.
const slotLabelText: Record<ScheduleLabel, string> = {
  morning: 'morning',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'scheduled'
};

// A Postgres `time` is already wall-clock in the household timezone, so
// timeOfDay would apply a second one.
const wallClockTime = (time: string): string => {
  const [hoursText, minutes = '00'] = time.split(':');
  const hours = Number(hoursText);
  const period = hours < 12 ? 'am' : 'pm';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${minutes} ${period}`;
};

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
    // reads, and /home/activity?logId=... is a deep link home/activity.tsx
    // already handles -- so a tap lands on the correction sheet with no new
    // routing. This path must be redeployed whenever the route moves.
    data: { screen: '/home/activity', params: { logId: input.logId } }
  };
};

export type MissedFeedInput = {
  petName: string;
  label: ScheduleLabel;
  scheduledTime: string;
};

// Names the absent log, never the absent meal -- see ADR 0013 and CONTEXT.md.
export const buildMissedFeedMessage = (input: MissedFeedInput): Omit<ExpoMessage, 'to'> => ({
  title: `No one has logged ${input.petName}'s ${slotLabelText[input.label]} feed`,
  sound: 'default',
  body: `Due ${wallClockTime(input.scheduledTime)}`,
  data: { screen: '/home', params: {} }
});

// Roughly what fits on a lock screen before iOS truncates it anyway. Cutting it
// here means the ellipsis lands on a word boundary rather than mid-syllable.
const CAPTION_PREVIEW_LIMIT = 100;

const truncate = (text: string, limit: number): string => {
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

export type PostInput = {
  authorFirstName: string | null;
  caption: string | null;
  petNames: string[];
  postId: string;
};

/**
 * Caption first, deliberately.
 *
 * "Sarah posted a photo" makes you open the app to find out whether anything is
 * wrong, which is the opposite of the reassurance this feature exists to give.
 * Seeing "Sarah: beach day, he's shattered" on the lock screen IS the feature --
 * the person who is away has what they wanted without unlocking anything.
 *
 * Only without a caption does a pet name earn its place, and only when exactly
 * one pet is tagged: "a photo of Crumpet and Bailey" is worse than saying
 * nothing, and tags are optional anyway.
 */
export const buildPostMessage = (input: PostInput): Omit<ExpoMessage, 'to'> => {
  const author = authorName(input.authorFirstName);
  const caption = input.caption?.trim();

  const title = caption
    ? `${author}: ${truncate(caption, CAPTION_PREVIEW_LIMIT)}`
    : input.petNames.length === 1
      ? `${author} posted a photo of ${input.petNames[0]}`
      : `${author} posted a photo`;

  return {
    title,
    sound: 'default',
    // Empty rather than restating the title. iOS renders a lone title cleanly,
    // and there is nothing second-tier to say -- the photo is the content and
    // it is one tap away.
    body: '',
    data: { screen: '/posts/[postId]', params: { postId: input.postId } }
  };
};
