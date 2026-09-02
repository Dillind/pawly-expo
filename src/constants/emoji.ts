/**
 * The emoji an Occasion can wear.
 *
 * A curated list, not a library. `ios/Podfile` pins the deployment target to
 * 16.4, and iOS 16.4 ships Emoji 15.0, so every glyph below draws on every
 * device that can run Crumpet -- the newest here is Emoji 14.0. A keyboard
 * package would carry a font table, a search index and a 2022 data set to
 * solve a rendering problem this app does not have.
 *
 * Grouped rather than flat: a member looking for "vet" is looking in a
 * category, and 200 undifferentiated glyphs is a wall.
 */

export type EmojiGroup = {
  /** The section heading, and what the search matches on besides the keywords. */
  title: string;
  emoji: { char: string; keywords: string }[];
};

const group = (title: string, entries: [string, string][]): EmojiGroup => ({
  title,
  emoji: entries.map(([char, keywords]) => ({ char, keywords }))
});

export const EMOJI_GROUPS: EmojiGroup[] = [
  group('Pets', [
    ['🐶', 'dog puppy'],
    ['🐕', 'dog'],
    ['🐩', 'poodle dog'],
    ['🐱', 'cat kitten'],
    ['🐈', 'cat'],
    ['🐰', 'rabbit bunny'],
    ['🐹', 'hamster'],
    ['🐭', 'mouse'],
    ['🐦', 'bird'],
    ['🦜', 'parrot bird'],
    ['🐠', 'fish'],
    ['🐟', 'fish'],
    ['🐢', 'turtle tortoise'],
    ['🦎', 'lizard reptile'],
    ['🐴', 'horse pony'],
    ['🐾', 'paws prints']
  ]),
  group('Occasions', [
    ['🎉', 'party celebrate milestone'],
    ['🎊', 'party confetti'],
    ['🎂', 'birthday cake'],
    ['🎈', 'balloon party'],
    ['🎁', 'gift present'],
    ['🏡', 'home house adoption'],
    ['🏥', 'vet hospital'],
    ['🎓', 'training graduation school'],
    ['🛁', 'bath wash groom'],
    ['✂️', 'groom clip trim haircut'],
    ['💊', 'medication tablet worming'],
    ['💉', 'vaccination needle jab'],
    ['🩺', 'checkup vet stethoscope'],
    ['🦷', 'dental teeth'],
    ['⭐', 'star special'],
    ['❤️', 'love heart']
  ]),
  group('Out and about', [
    ['🚗', 'car drive trip'],
    ['🏖️', 'beach sand sea'],
    ['🌊', 'sea swim water'],
    ['🌲', 'forest bush walk'],
    ['🏕️', 'camping tent'],
    ['⛰️', 'mountain hike'],
    ['🏞️', 'park walk'],
    ['🥾', 'hike walk boots'],
    ['🦮', 'walk lead guide'],
    ['🎾', 'ball fetch tennis'],
    ['🥏', 'frisbee fetch'],
    ['🏀', 'ball play'],
    ['🛝', 'play park'],
    ['☀️', 'sunny summer'],
    ['❄️', 'snow winter cold'],
    ['🌧️', 'rain wet']
  ]),
  group('Food and rest', [
    ['🍖', 'meat food dinner'],
    ['🍗', 'chicken food'],
    ['🦴', 'bone treat chew'],
    ['🥣', 'bowl food feed'],
    ['🍪', 'treat biscuit'],
    ['🥕', 'carrot veg treat'],
    ['🍎', 'apple fruit treat'],
    ['💧', 'water drink'],
    ['☕', 'coffee morning'],
    ['🛌', 'sleep nap bed'],
    ['😴', 'sleep nap tired'],
    ['🧺', 'basket bed washing'],
    ['🧸', 'toy teddy'],
    ['🪥', 'toothbrush teeth clean'],
    ['🧼', 'soap wash clean'],
    ['🚿', 'shower wash']
  ]),
  group('Feelings', [
    ['😀', 'happy smile'],
    ['🥰', 'love adore'],
    ['😍', 'love adore'],
    ['🤣', 'funny laugh'],
    ['😂', 'funny laugh'],
    ['🥹', 'proud emotional'],
    ['😭', 'sad cry'],
    ['😢', 'sad cry'],
    ['😮', 'surprise wow'],
    ['🙄', 'unimpressed eye roll'],
    ['😤', 'grumpy cross'],
    ['🤒', 'poorly sick unwell'],
    ['🤕', 'hurt injury'],
    ['😇', 'good angel behaved'],
    ['😈', 'naughty trouble mischief'],
    ['🫶', 'love hands heart']
  ]),
  group('Milestones', [
    ['🥇', 'first win prize'],
    ['🏆', 'win trophy prize'],
    ['🎖️', 'award medal'],
    ['📏', 'growth measure size'],
    ['⚖️', 'weight scales'],
    ['📸', 'photo picture'],
    ['📅', 'date calendar'],
    ['⏰', 'time alarm'],
    ['🗓️', 'anniversary calendar'],
    ['🔟', 'ten count number'],
    ['🎯', 'goal target'],
    ['✅', 'done complete tick'],
    ['🆕', 'new first'],
    ['🔑', 'key home new'],
    ['📝', 'note record'],
    ['💡', 'idea learnt']
  ])
];

/** Flat, for a lookup by character. */
export const EMOJI_OPTIONS = EMOJI_GROUPS.flatMap((section) => section.emoji);
