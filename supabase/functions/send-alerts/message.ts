// Pure wording. Every push is one sentence with no title, because iOS already draws the app name.
// Nothing a person typed appears, except a Reminder's title -- see buildReminderDueMessage.

export type FeedLoggedInput = {
  authorFirstName: string | null;
  petName: string;
  loggedAt: string;
  householdTimezone: string;
  logId: string;
};

export type ExpoMessage = {
  to: string[];
  title?: string;
  body: string;
  sound: 'default';
  data: { screen: string; params: Record<string, string> };
};

// Must match formatAuthorName in src/utils/members.ts: two names for one person reads as a bug.
const authorName = (firstName: string | null): string => firstName ?? 'Someone';

// The household's timezone, never the recipient's.
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

export const buildFeedLoggedMessage = (input: FeedLoggedInput): Omit<ExpoMessage, 'to'> => ({
  body: `${authorName(input.authorFirstName)} fed ${input.petName} at ${timeOfDay(input.loggedAt, input.householdTimezone)}`,
  sound: 'default',
  // The shape usePushNotifications reads. Redeploy this function whenever the route moves.
  data: { screen: '/home', params: { logId: input.logId } }
});

export type MissedFeedInput = {
  petName: string;
  label: ScheduleLabel;
  scheduledTime: string;
};

// Names the absent log, never the absent meal (ADR 0013). The time tells apart two feeds
// with the same label.
export const buildMissedFeedMessage = (input: MissedFeedInput): Omit<ExpoMessage, 'to'> => ({
  body: `No one has logged ${input.petName}'s ${slotLabelText[input.label]} feed, due ${wallClockTime(input.scheduledTime)}`,
  sound: 'default',
  data: { screen: '/home', params: {} }
});

export type PostInput = {
  authorFirstName: string | null;
  petNames: string[];
  postId: string;
};

// No caption, deliberately (DECISIONS.md). A pet is named only when exactly one is tagged.
export const buildPostMessage = (input: PostInput): Omit<ExpoMessage, 'to'> => {
  const author = authorName(input.authorFirstName);

  return {
    body:
      input.petNames.length === 1
        ? `${author} posted a photo of ${input.petNames[0]}`
        : `${author} posted a photo`,
    sound: 'default',
    data: { screen: '/posts/[postId]', params: { postId: input.postId } }
  };
};

export type PostCommentedInput = {
  authorFirstName: string | null;
  isReplyToRecipient: boolean;
  isPostAuthor: boolean;
  postId: string;
};

// Three cases: a member in the thread who owns neither the post nor the parent is not told "your post".
export const buildPostCommentedMessage = (input: PostCommentedInput): Omit<ExpoMessage, 'to'> => {
  const author = authorName(input.authorFirstName);

  return {
    body: input.isReplyToRecipient
      ? `${author} replied to your comment`
      : input.isPostAuthor
        ? `${author} commented on your post`
        : `${author} also commented`,
    sound: 'default',
    data: { screen: '/posts/[postId]/comments', params: { postId: input.postId } }
  };
};

export type FeedDuePet = {
  name: string;
  label: ScheduleLabel;
};

export type FeedDueInput = {
  pets: FeedDuePet[];
  scheduledTime: string;
};

// slotLabelText reads as a noun on its own for lunch and dinner, and does not
// for the other two: "Crumpet's morning is coming up" is not a sentence.
const dueLabelText: Record<ScheduleLabel, string> = {
  morning: 'morning feed',
  lunch: 'lunch',
  dinner: 'dinner',
  custom: 'scheduled feed'
};

const sentenceCase = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

// Three or more pets are counted, not listed, so the lock screen never truncates the time.
const petsPhrase = (names: string[]): string => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.length} pets`;
};

// One push per household per feed time, however many pets: one event must not become three.
// Pets with mixed labels get a sentence that names no label.
export const buildFeedDueMessage = (input: FeedDueInput): Omit<ExpoMessage, 'to'> => {
  const names = input.pets.map((pet) => pet.name);
  const labels = new Set(input.pets.map((pet) => pet.label));
  const [first] = input.pets;
  const time = wallClockTime(input.scheduledTime);

  const body =
    labels.size > 1
      ? `${petsPhrase(names)} have feeds due at ${time}`
      : names.length === 1
        ? `${first.name}'s ${dueLabelText[first.label]} is due at ${time}`
        : `${sentenceCase(dueLabelText[first.label])} is due at ${time} for ${petsPhrase(names)}`;

  return {
    body,
    sound: 'default',
    // /home, not a pet: a group has no single pet to open.
    data: { screen: '/home', params: {} }
  };
};

export type ReminderDueInput = {
  petName: string;
  title: string;
  leadDays: number;
};

// Lowers the first letter to sit mid-sentence, unless the first word is a brand or an
// acronym such as NexGard or RSPCA.
const midSentence = (title: string): string => {
  const [first = ''] = title.split(' ');

  return first.slice(1) === first.slice(1).toLowerCase()
    ? title.charAt(0).toLowerCase() + title.slice(1)
    : title;
};

// Carries the typed title on purpose: it is the only thing here anyone can act on.
// Never "overdue": this push goes out before the day.
export const buildReminderDueMessage = (input: ReminderDueInput): Omit<ExpoMessage, 'to'> => ({
  body: `${input.petName}'s ${midSentence(input.title)} is due ${input.leadDays === 1 ? 'tomorrow' : `in ${input.leadDays} days`}`,
  sound: 'default',
  data: { screen: '/home', params: {} }
});

export type FollowRequestedInput = {
  requesterFirstName: string | null;
  householdId: string;
};

// A follower is never told anything, not even that they were accepted (ADR 0036).
export const buildFollowRequestedMessage = (
  input: FollowRequestedInput
): Omit<ExpoMessage, 'to'> => ({
  body: `${authorName(input.requesterFirstName)} requested to follow your household`,
  sound: 'default',
  data: {
    screen: '/home/household/[householdId]/followers/requests',
    params: { householdId: input.householdId }
  }
});

// Only to the Crumpet team. The typed title stays out of the push.
export const buildFeatureRequestReportedMessage = (): Omit<ExpoMessage, 'to'> => ({
  body: 'A feature request was reported',
  sound: 'default',
  data: {
    screen: '/profile/settings/feature-requests',
    params: { reported: '1' }
  }
});
