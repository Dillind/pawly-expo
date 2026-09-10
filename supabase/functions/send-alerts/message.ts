// Pure: no network, no database. Everything here is a decision about wording,
// which is the part worth reasoning about on its own.
//
// Every kind is one sentence and no title. iOS draws the app name on the top
// line by itself, so the sentence below it is the `body` -- a title would put a
// second, bolder line above it and break the shape.
//
// Nothing a person typed ever appears: no captions, no feed notes, no comment
// bodies. A time is not content, so where a time is the reason the push exists
// it joins the sentence rather than sitting under it. The one exception is a
// Reminder's title, which is free text and is also the only thing in that push
// a person can act on -- see buildReminderDueMessage.

export type FeedLoggedInput = {
  authorFirstName: string | null;
  petName: string;
  loggedAt: string;
  householdTimezone: string;
  logId: string;
};

export type ExpoMessage = {
  to: string[];
  /** Omitted on purpose. iOS draws the app name; a title would add a line. */
  title?: string;
  body: string;
  sound: 'default';
  data: { screen: string; params: Record<string, string> };
};

// Matches formatAuthorName in src/utils/members.ts. Every surface must agree --
// the Home occurrence row, the detail sheet and this notification all render the
// same feed log, and two different names for one person reads as a bug.
//
const authorName = (firstName: string | null): string => firstName ?? 'Someone';

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

export const buildFeedLoggedMessage = (input: FeedLoggedInput): Omit<ExpoMessage, 'to'> => ({
  body: `${authorName(input.authorFirstName)} fed ${input.petName} at ${timeOfDay(input.loggedAt, input.householdTimezone)}`,
  sound: 'default',
  // data.screen and data.params are the exact shape usePushNotifications reads,
  // and /home?logId=... is a deep link home/index.tsx already handles -- so a
  // tap lands on the correction sheet with no new routing. This path must be
  // redeployed whenever the route moves.
  data: { screen: '/home', params: { logId: input.logId } }
});

export type MissedFeedInput = {
  petName: string;
  label: ScheduleLabel;
  scheduledTime: string;
};

// Names the absent log, never the absent meal -- see ADR 0013 and CONTEXT.md.
// Keeps the label as well as the time: the label is the word the schedule card
// and the log sheet use, and the time is what says which one was missed when a
// pet has two feeds with the same label on different days.
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

/**
 * The caption used to be the whole line, on the argument that seeing
 * "Sarah: beach day, he's shattered" on the lock screen IS the feature for the
 * member who is away. That was reversed deliberately -- see DECISIONS.md. A
 * push now says what happened and nothing else, and the photo is one tap away.
 *
 * A pet name earns its place only when exactly one pet is tagged: "a photo of
 * Crumpet and Bailey" is worse than saying nothing, and tags are optional.
 */
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
  /** True when the recipient wrote the comment being replied to. */
  isReplyToRecipient: boolean;
  /** True when the recipient wrote the post being commented on. */
  isPostAuthor: boolean;
  postId: string;
};

/**
 * Three cases, not two: the third is the member who is in the thread but owns
 * neither the post nor the parent, and "your post" would be a lie to them.
 */
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
  /** Wall-clock time in the household timezone, as Postgres stores it. */
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

// Not a list past two: three or more are counted, so the time always fits. A
// lock screen truncates a long list, and the time is the fact a person acts on
// where a list of their own pets is not.
const petsPhrase = (names: string[]): string => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;

  return `${names.length} pets`;
};

/**
 * One push per household per feed instant, however many pets it covers. Three
 * notifications for what a person experiences as one event is how this app
 * gets muted, and the volume scales with pet count -- so it lands hardest on
 * exactly the households the multi-pet work is for.
 *
 * Two shapes, decided by whether the pets share a label. They do share one
 * almost always, because a household feeds its pets together; the mixed case
 * cannot name a single label that is true of all of them.
 */
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
  /** How many days until it is due: 1, 2 or 3. */
  leadDays: number;
};

// A Reminder title is free text and sits mid-sentence, so "Worming tablet"
// would read as "Toby's Worming tablet". Only the plain case is lowered: a
// second capital anywhere in the first word means a brand or an acronym --
// NexGard, RSPCA -- which must survive untouched.
const midSentence = (title: string): string => {
  const [first = ''] = title.split(' ');

  return first.slice(1) === first.slice(1).toLowerCase()
    ? title.charAt(0).toLowerCase() + title.slice(1)
    : title;
};

/**
 * The one kind that still carries text a person typed, deliberately. A
 * Reminder's title is the only thing in this push anyone can act on -- "Crumpet
 * has a reminder tomorrow" says nothing. Do not remove it later as an oversight.
 *
 * It never says "overdue": the push goes out BEFORE the day, so nothing has
 * been missed yet.
 */
export const buildReminderDueMessage = (input: ReminderDueInput): Omit<ExpoMessage, 'to'> => ({
  body: `${input.petName}'s ${midSentence(input.title)} is due ${input.leadDays === 1 ? 'tomorrow' : `in ${input.leadDays} days`}`,
  sound: 'default',
  data: { screen: '/home', params: {} }
});

export type FollowRequestedInput = {
  requesterFirstName: string | null;
  householdId: string;
};

/**
 * The only alert the follow feature adds, and it runs towards the household. A
 * follower is never told anything -- not even that they were accepted. See ADR
 * 0036.
 *
 * It names the household rather than "your household": an Owner can own more
 * than one, and the tap has to land on the right Requests screen anyway.
 */
export const buildFollowRequestedMessage = (
  input: FollowRequestedInput
): Omit<ExpoMessage, 'to'> => ({
  body: `${authorName(input.requesterFirstName)} asked to follow your household`,
  sound: 'default',
  data: {
    screen: '/profile/household/[householdId]/followers/requests',
    params: { householdId: input.householdId }
  }
});
