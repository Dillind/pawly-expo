import type { HelpTopic } from '@/constants/care-card-help';

export const REMINDERS_HELP: HelpTopic = {
  glyph: 'bell',
  title: 'What is a Reminder?',
  subtitle: 'The dated jobs that are not feeds',
  body: [
    {
      kind: 'paragraph',
      text: 'A Reminder is anything your pet needs on a date. A worming tablet, a vet appointment, a nail trim. Feeds have their own place, so a Reminder is everything else.'
    },
    { kind: 'heading', text: 'Who sees it' },
    {
      kind: 'paragraph',
      text: 'Everyone in the household. When one of you ticks it off, the rest see it straight away, so nobody does it twice.'
    },
    { kind: 'heading', text: 'Today only' },
    {
      kind: 'paragraph',
      text: 'This card shows what is due today. A Reminder that repeats keeps coming back on its own, and the week strip on Home is where you look at another day.'
    }
  ]
};
