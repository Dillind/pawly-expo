import type { HelpTopic } from '@/constants/care-card-help';

export const TRAVEL_HELP: HelpTopic = {
  glyph: 'luggage',
  title: 'What is a Travel Checklist?',
  subtitle: 'Pack once, remember every time',
  body: [
    {
      kind: 'paragraph',
      text: 'A Travel Checklist holds what your pets need when you take them away. Food, bed, leads, the teddy. Write it once, and the next trip is packed from the list instead of from memory.'
    },
    { kind: 'heading', text: 'Who sees it' },
    {
      kind: 'paragraph',
      text: 'Everyone in the household. Anyone can tick things off at the door, and a tick shows on every phone, so two of you never pack the same bowl. Owners write and change the list.'
    },
    { kind: 'heading', text: 'Reset for the next trip' },
    {
      kind: 'paragraph',
      text: 'Reset clears every tick and keeps the items. Tag an item with a pet when it is for one of them, like a medication. An item with no tag is for the whole trip.'
    },
    { kind: 'heading', text: 'Free and Pro' },
    {
      kind: 'paragraph',
      text: 'Free holds one checklist for your household. Pro holds as many as you need, and everyone in the household gets it when one of you subscribes.'
    }
  ]
};
