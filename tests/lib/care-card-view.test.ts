import { emptyCareCard } from '@/constants/care-card-fields';
import {
  careCardBackRows,
  careCardBlocks,
  emergencyNumber,
  firstStepForSection
} from '@/lib/care-card-view';
import type { CareCard, CareCardContact, Medication } from '@/services/care-card.service';

const card = (overrides: Partial<CareCard> = {}): CareCard => ({
  ...emptyCareCard('pet-1'),
  ...overrides
});

const medication = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'med-1',
  petId: 'pet-1',
  name: 'Apoquel',
  dose: '16mg',
  scheduleText: 'Every morning',
  instructions: null,
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00Z',
  ...overrides
});

const contact = (overrides: Partial<CareCardContact> = {}): CareCardContact => ({
  id: 'contact-1',
  petId: 'pet-1',
  name: 'Priya next door',
  phone: '0433 221 100',
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00Z',
  ...overrides
});

describe('careCardBlocks', () => {
  it('returns nothing for an untouched card', () => {
    expect(careCardBlocks(card(), [])).toEqual([]);
  });

  it('puts the emergency panel first, before medications and the sections', () => {
    const blocks = careCardBlocks(
      card({ vetPhone: '03 9482 1234', feedingNotes: 'Half a scoop' }),
      [medication()]
    );

    expect(blocks.map((block) => block.id)).toEqual(['emergency', 'medications', 'eating']);
    expect(blocks[0]).toMatchObject({ kind: 'fields', isEmergency: true });
  });

  it('drops empty fields instead of rendering them as blanks', () => {
    const blocks = careCardBlocks(card({ allergies: 'Chicken', behaviourNotes: '   ' }), []);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ rows: [{ label: 'Allergies', value: 'Chicken' }] });
  });

  it('joins a medication dose and schedule, and keeps instructions separate', () => {
    const [block] = careCardBlocks(card(), [medication({ instructions: 'Hide it in cheese.' })]);

    expect(block).toMatchObject({
      kind: 'medications',
      items: [
        { name: 'Apoquel', detail: '16mg · Every morning', instructions: 'Hide it in cheese.' }
      ]
    });
  });

  it('leaves detail null when a medication has neither dose nor schedule', () => {
    const [block] = careCardBlocks(card(), [medication({ dose: null, scheduleText: null })]);

    expect(block).toMatchObject({ items: [{ name: 'Apoquel', detail: null }] });
  });
});

describe('careCardBlocks with contacts', () => {
  it('leads the emergency panel with contacts, before the vet details', () => {
    const [block] = careCardBlocks(card({ vetPhone: '03 9482 1234' }), [], [contact()]);

    expect(block).toMatchObject({
      id: 'emergency',
      isEmergency: true,
      rows: [
        { label: 'Priya next door', value: '0433 221 100' },
        { label: 'Vet phone', value: '03 9482 1234' }
      ]
    });
  });

  it('opens the panel on contacts alone when no other emergency field is set', () => {
    const blocks = careCardBlocks(card(), [], [contact()]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe('emergency');
  });

  it('says so rather than printing a blank when a contact has no number', () => {
    const [block] = careCardBlocks(card(), [], [contact({ phone: null })]);

    expect(block).toMatchObject({ rows: [{ label: 'Priya next door', value: 'No number given' }] });
  });

  it('keeps the order the contacts were given in', () => {
    const [block] = careCardBlocks(
      card(),
      [],
      [contact({ id: 'a', name: 'Priya' }), contact({ id: 'b', name: 'Sam' })]
    );

    expect(block).toMatchObject({
      rows: [{ label: 'Priya' }, { label: 'Sam' }]
    });
  });
});

describe('careCardBackRows', () => {
  it('lists every section, filled or not, so nothing hides behind a second tap', () => {
    const rows = careCardBackRows(card(), [], []);

    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.summary === null)).toBe(true);
    expect(rows[0].id).toBe('reaching-you');
  });

  it('summarises a section from the fields that have answers', () => {
    const rows = careCardBackRows(
      card({ allergies: 'Chicken', behaviourNotes: 'Bolts at the door' }),
      [medication()],
      [contact()]
    );

    expect(rows.find((row) => row.id === 'watch-for')?.summary).toBe('Chicken · Bolts at the door');
    expect(rows.find((row) => row.id === 'medications')?.summary).toBe('Apoquel');
    expect(rows.find((row) => row.id === 'reaching-you')?.summary).toBe('Priya next door');
  });
});

describe('emergencyNumber', () => {
  it('prefers the emergency vet, then the vet, then the first contact with a number', () => {
    expect(
      emergencyNumber(
        card({ emergencyVetName: 'Melbourne AE', emergencyVetPhone: '03 9370 5555' }),
        [contact()]
      )
    ).toEqual({ label: 'Melbourne AE', value: '03 9370 5555' });

    expect(emergencyNumber(card({ vetPhone: '03 9482 1234' }), [contact()])).toEqual({
      label: 'Vet',
      value: '03 9482 1234'
    });

    expect(emergencyNumber(card(), [contact()])).toEqual({
      label: 'Priya next door',
      value: '0433 221 100'
    });

    expect(emergencyNumber(card(), [])).toBeNull();
  });
});

describe('firstStepForSection', () => {
  const stepIds = [
    'reaching-you',
    'emergency',
    'watch-for:allergies',
    'watch-for:behaviourNotes',
    'medications'
  ];

  it('finds a section that is one step', () => {
    expect(firstStepForSection(stepIds, 'emergency')).toBe('emergency');
  });

  it('finds the first step of a split section', () => {
    expect(firstStepForSection(stepIds, 'watch-for')).toBe('watch-for:allergies');
  });

  it('does not match a section whose id is only a prefix', () => {
    expect(firstStepForSection(['watch-for-more'], 'watch-for')).toBeUndefined();
  });

  it('returns undefined when no section is asked for', () => {
    expect(firstStepForSection(stepIds, undefined)).toBeUndefined();
  });
});
