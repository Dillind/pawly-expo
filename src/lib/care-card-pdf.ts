import { careCardBlocks, hasValue, type CareCardBlock } from '@/lib/care-card-view';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';

export type CareCardPdfPet = {
  name: string;
  breed: string | null;
  /** Already read from the birthdate by the caller -- see formatAge. */
  ageLabel: string | null;
  card: CareCard;
  medications: Medication[];
  contacts?: CareCardContact[];
};

export type CareCardPdfOptions = {
  /** Pre-formatted by the caller so this stays pure and timezone-free. */
  generatedOn: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Escaped first, so the <br> this introduces is the only markup that survives. */
const escapeMultiline = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, '<br />');

const fieldRow = (label: string, value: string): string =>
  `<div class="row"><div class="label">${escapeHtml(label)}</div>` +
  `<div class="value">${escapeMultiline(value)}</div></div>`;

const renderBlock = (block: CareCardBlock): string => {
  if (block.kind === 'medications') {
    const items = block.items
      .map(
        (medication) =>
          `<div class="med"><div class="med-name">${escapeHtml(medication.name)}</div>` +
          (medication.detail
            ? `<div class="med-detail">${escapeHtml(medication.detail).replace(/ · /g, ' &middot; ')}</div>`
            : '') +
          (medication.instructions
            ? `<div class="value">${escapeMultiline(medication.instructions)}</div>`
            : '') +
          `</div>`
      )
      .join('');

    return `<section class="block"><h2>${escapeHtml(block.title)}</h2>${items}</section>`;
  }

  const rows = block.rows.map((row) => fieldRow(row.label, row.value)).join('');
  const className = block.isEmergency ? 'panel' : 'block';

  return `<section class="${className}"><h2>${escapeHtml(block.title)}</h2>${rows}</section>`;
};

const petPage = (pet: CareCardPdfPet, generatedOn: string, isLast: boolean): string => {
  const subtitle = [pet.breed, pet.ageLabel].filter(hasValue).map(escapeHtml).join(' &middot; ');

  const body = careCardBlocks(pet.card, pet.medications, pet.contacts).map(renderBlock).join('');

  const empty = body
    ? ''
    : `<p class="empty">This Care Card is empty. Fill it in from ${escapeHtml(pet.name)}'s page in Crumpet.</p>`;

  return (
    `<article class="page${isLast ? '' : ' break'}">` +
    `<header><div><h1>${escapeHtml(pet.name)}</h1>` +
    (subtitle ? `<p class="subtitle">${subtitle}</p>` : '') +
    `</div><div class="stamp"><p>Care Card</p><p>${escapeHtml(generatedOn)}</p></div></header>` +
    body +
    empty +
    // Names the pet, not the app. On a multi-pet PDF this is the only thing on
    // a continuation page saying whose card you are holding.
    `<footer>${escapeHtml(pet.name)} &middot; ${escapeHtml(generatedOn)} &middot; ` +
    `Check with the owner before relying on anything here.</footer>` +
    `</article>`
  );
};

// Black on white with one accent, because this document's job ends on a fridge
// door or in a mono office printer, not on a screen.
const STYLES = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111111;
    -webkit-text-size-adjust: 100%;
  }
  .page { padding-bottom: 8mm; }
  .break { page-break-after: always; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #0F7173;
    padding-bottom: 6px;
    margin-bottom: 16px;
  }
  h1 { font-size: 26pt; margin: 0; letter-spacing: -0.5px; }
  .subtitle { margin: 2px 0 0; color: #60646C; font-size: 10.5pt; }
  .stamp { text-align: right; color: #60646C; font-size: 9pt; }
  .stamp p { margin: 0; }
  .stamp p:first-child {
    color: #0F7173;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
  }
  h2 {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: #0F7173;
    margin: 0 0 8px;
  }
  .panel {
    border: 1.5pt solid #0F7173;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 18px;
    page-break-inside: avoid;
  }
  .panel .value { font-weight: 600; }
  /* No page-break-inside here on purpose: forbidding it pushed whole sections
     to the next page and left a third of the first one blank. A section may
     split; the emergency panel and a single medication may not. */
  .block { margin-bottom: 18px; }
  .block h2 { page-break-after: avoid; }
  .row { display: flex; gap: 12px; padding: 3px 0; align-items: baseline; page-break-inside: avoid; }
  .label { flex: 0 0 34%; color: #60646C; font-size: 9.5pt; }
  .value { flex: 1; }
  .med { padding: 5px 0; border-top: 0.5pt solid #DDDDDD; page-break-inside: avoid; }
  .med:first-of-type { border-top: none; }
  .med-name { font-weight: 700; }
  .med-detail { color: #60646C; font-size: 10pt; }
  .empty { color: #60646C; }
  footer {
    margin-top: 20px;
    padding-top: 6px;
    border-top: 0.5pt solid #DDDDDD;
    color: #60646C;
    font-size: 8.5pt;
  }
`;

/**
 * The whole document, as a string. Pure by design: no file system, no network,
 * no clock -- the caller formats `generatedOn` and hands it in, which is what
 * makes this testable and what stops a PDF's date depending on the device's.
 */
export function buildCareCardHtml(
  pets: CareCardPdfPet[],
  { generatedOn }: CareCardPdfOptions
): string {
  const pages = pets
    .map((pet, index) => petPage(pet, generatedOn, index === pets.length - 1))
    .join('');

  return (
    `<!DOCTYPE html><html lang="en-AU"><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<title>Care Card</title><style>${STYLES}</style></head><body>${pages}</body></html>`
  );
}

/** What the sitter sees the file called in Messages, Mail or Files. */
export function careCardFileName(pets: { name: string }[]): string {
  if (pets.length === 1) {
    // Slashes and colons break a file name on some destinations; nothing else
    // in a pet's name needs stripping.
    const safeName = pets[0].name.replace(/[/\\:]/g, ' ').trim();
    return safeName ? `Care Card - ${safeName}.pdf` : 'Care Card.pdf';
  }

  return 'Care Cards.pdf';
}
