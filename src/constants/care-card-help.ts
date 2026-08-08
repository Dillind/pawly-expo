import type { InfoBlock } from '@/components/bottom-sheets/info-sheet';
import type { IconName } from '@/constants/icon-map';

export type HelpTopic = {
  glyph: IconName;
  title: string;
  subtitle: string;
  body: InfoBlock[];
};

export const CARE_CARD_HELP: HelpTopic = {
  glyph: 'clipboardList',
  title: 'What is a Care Card?',
  subtitle: 'What it holds, and who to hand it to',
  body: [
    {
      kind: 'paragraph',
      text: 'A Care Card is everything someone needs to look after your pet while you are away. Vet numbers, allergies, medications, how they eat, and where their things are kept.'
    },
    { kind: 'heading', text: 'Who it is for' },
    {
      kind: 'paragraph',
      text: 'Anyone standing in for you — a sitter, a neighbour, a family member. You share it as a PDF, so they can read it on any phone. They do not need Crumpet, and they do not need an account.'
    },
    { kind: 'heading', text: 'Filling it in' },
    {
      kind: 'paragraph',
      text: 'Nine short steps, and each one saves as you go. You can stop partway and come back. A half-filled card is still worth handing over.'
    }
  ]
};

export const SHARING_HELP: HelpTopic = {
  glyph: 'share',
  title: 'Sharing a Care Card',
  subtitle: 'What you send, and what it does not do',
  body: [
    {
      kind: 'paragraph',
      text: 'Sharing makes a PDF from whatever the card holds right now, and stamps it with the date. It opens the normal share sheet, so you can send it however you like.'
    },
    { kind: 'heading', text: 'It is a snapshot' },
    {
      kind: 'paragraph',
      text: 'The PDF does not update after you send it. If you change a vet number next month, the copy they are holding still has the old one. Send a fresh one whenever something important changes.'
    }
  ]
};
