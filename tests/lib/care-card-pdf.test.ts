import { buildCareCardHtml, careCardFileName, type CareCardPdfPet } from '@/lib/care-card-pdf';
import type { CareCard, Medication } from '@/services/care-card.service';

const emptyCard = (petId = 'pet-1'): CareCard => ({
  petId,
  updatedAt: null,
  allergies: null,
  behaviourNotes: null,
  vetName: null,
  vetPhone: null,
  emergencyVetName: null,
  emergencyVetPhone: null,
  microchipNumber: null,
  insuranceProvider: null,
  insurancePolicyNumber: null,
  feedingNotes: null,
  walkRoutine: null,
  whereThingsAre: null,
  notes: null
});

const medication = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'med-1',
  petId: 'pet-1',
  name: 'Apoquel',
  dose: '16mg, one tablet',
  scheduleText: 'Every morning with food',
  instructions: null,
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00.000Z',
  ...overrides
});

const pet = (overrides: Partial<CareCardPdfPet> = {}): CareCardPdfPet => ({
  name: 'Crumpet',
  breed: 'Cavoodle',
  ageLabel: '3 years',
  card: emptyCard(),
  medications: [],
  ...overrides
});

const GENERATED_ON = '7 August 2026';
const build = (pets: CareCardPdfPet[]) => buildCareCardHtml(pets, { generatedOn: GENERATED_ON });

describe('buildCareCardHtml', () => {
  it('omits fields that were never filled in', () => {
    const html = build([pet({ card: { ...emptyCard(), vetPhone: '03 9482 1234' } })]);

    expect(html).toContain('03 9482 1234');
    expect(html).not.toContain('Microchip number');
    expect(html).not.toContain('Walks and toileting');
  });

  it('stamps the generated date on every page', () => {
    const html = build([pet({ name: 'Crumpet' }), pet({ name: 'Biscuit' })]);

    // Once in each page header and once in each footer.
    expect(html.split(GENERATED_ON)).toHaveLength(5);
  });

  it('breaks between pets but not after the last one', () => {
    const two = build([pet({ name: 'Crumpet' }), pet({ name: 'Biscuit' })]);
    const one = build([pet()]);

    expect(two.split('class="page break"')).toHaveLength(2);
    expect(one).not.toContain('class="page break"');
  });

  it('lifts the emergency numbers above everything else', () => {
    const html = build([
      pet({
        card: {
          ...emptyCard(),
          vetPhone: '03 9482 1234',
          notes: 'Nervous around bikes'
        }
      })
    ]);

    expect(html.indexOf('03 9482 1234')).toBeLessThan(html.indexOf('Nervous around bikes'));
  });

  it('never repeats an emergency field further down the page', () => {
    const html = build([pet({ card: { ...emptyCard(), vetPhone: '03 9482 1234' } })]);

    expect(html.split('03 9482 1234')).toHaveLength(2);
  });

  it('escapes anything the owner typed', () => {
    const html = build([
      pet({
        name: '<script>alert(1)</script>',
        card: { ...emptyCard(), notes: 'Fish & chips <b>only</b>' }
      })
    ]);

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>only</b>');
    expect(html).toContain('Fish &amp; chips');
  });

  it('keeps the line breaks an owner typed into a long field', () => {
    const html = build([pet({ card: { ...emptyCard(), notes: 'First line\nSecond line' } })]);

    expect(html).toContain('First line<br />Second line');
  });

  it('renders a medication with its dose and schedule', () => {
    const html = build([pet({ medications: [medication()] })]);

    expect(html).toContain('Apoquel');
    expect(html).toContain('16mg, one tablet');
    expect(html).toContain('Every morning with food');
  });

  it('leaves out the medications heading when there are none', () => {
    expect(build([pet()])).not.toContain('Medications');
  });

  it('says so rather than printing a blank page when a card is empty', () => {
    const html = build([pet({ name: 'Crumpet' })]);

    expect(html).toContain('This Care Card is empty');
  });

  it('drops a whitespace-only value the same as an empty one', () => {
    const html = build([pet({ card: { ...emptyCard(), notes: '   ' } })]);

    expect(html).toContain('This Care Card is empty');
  });

  it('names the pet in each footer, not the app', () => {
    // Regression: the footer said "Crumpet" (the app) on every page, so on a
    // multi-pet PDF a continuation page named the wrong animal.
    const html = build([pet({ name: 'Biscuit' })]);

    expect(html).toContain('<footer>Biscuit &middot; 7 August 2026');
  });
});

describe('careCardFileName', () => {
  it('names the pet when there is only one', () => {
    expect(careCardFileName([{ name: 'Crumpet' }])).toBe('Care Card - Crumpet.pdf');
  });

  it('stays generic for several pets', () => {
    expect(careCardFileName([{ name: 'Crumpet' }, { name: 'Biscuit' }])).toBe('Care Cards.pdf');
  });

  it('strips characters that break a file name', () => {
    expect(careCardFileName([{ name: 'Fish/Chips' }])).toBe('Care Card - Fish Chips.pdf');
  });
});
