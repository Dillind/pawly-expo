import { buildReminderDueMessage } from '../../../supabase/functions/send-alerts/message';

// The push is the whole feature on a lock screen, so the wording is locked down
// here -- nothing else runs this file, because the Edge Function is Deno and
// Jest cannot reach it.
const TARGET = { householdId: 'household-1', occurrenceDate: '2026-10-02' };

describe('buildReminderDueMessage', () => {
  it('names the pet and the reminder in one line, with no title', () => {
    const message = buildReminderDueMessage({
      petName: 'Toby',
      title: 'Worming tablet',
      leadDays: 1,
      ...TARGET
    });

    expect(message.title).toBeUndefined();
    expect(message.body).toBe("Toby's worming tablet is due tomorrow");
    expect(message.data.screen).toBe('/home');
  });

  // A Member of two households must land on the right pets, on the day it is due.
  it("opens Home on the due day, in the reminder's own household", () => {
    const message = buildReminderDueMessage({
      petName: 'Toby',
      title: 'Worming tablet',
      leadDays: 2,
      ...TARGET
    });

    expect(message.data).toEqual({
      screen: '/home',
      params: { day: '2026-10-02' },
      householdId: 'household-1'
    });
  });

  // The one kind that still carries text a person typed. Without the title the
  // push says nothing anyone can act on -- see the comment on the builder.
  it('keeps the reminder title, which every other kind would drop', () => {
    expect(
      buildReminderDueMessage({ petName: 'Toby', title: 'Worming tablet', leadDays: 1, ...TARGET })
        .body
    ).toContain('worming tablet');
  });

  it('counts the days when the lead is longer than one', () => {
    const message = buildReminderDueMessage({
      petName: 'Crumpet',
      title: 'Vet appointment',
      leadDays: 3,
      ...TARGET
    });

    expect(message.body).toBe("Crumpet's vet appointment is due in 3 days");
  });

  // A brand or an acronym has a second capital in its first word, and must
  // survive the mid-sentence lowering that "Worming tablet" gets.
  it('leaves a brand name alone', () => {
    expect(
      buildReminderDueMessage({ petName: 'Toby', title: 'NexGard chew', leadDays: 1, ...TARGET })
        .body
    ).toBe("Toby's NexGard chew is due tomorrow");

    expect(
      buildReminderDueMessage({ petName: 'Toby', title: 'RSPCA check-up', leadDays: 1, ...TARGET })
        .body
    ).toBe("Toby's RSPCA check-up is due tomorrow");
  });

  // It fires BEFORE the day, so nothing has been missed yet.
  it('never says the reminder is overdue', () => {
    const message = buildReminderDueMessage({
      petName: 'Toby',
      title: 'Worming tablet',
      leadDays: 2,
      ...TARGET
    });

    expect(message.body).not.toMatch(/overdue|missed|late/i);
  });
});
