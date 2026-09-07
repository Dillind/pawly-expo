import { buildReminderDueMessage } from '../../../supabase/functions/send-alerts/message';

// The push is the whole feature on a lock screen, so the wording is locked down
// here -- nothing else runs this file, because the Edge Function is Deno and
// Jest cannot reach it.
describe('buildReminderDueMessage', () => {
  it('names the pet and the reminder in one line, with no title', () => {
    const message = buildReminderDueMessage({
      petName: 'Toby',
      title: 'Worming tablet',
      leadDays: 1
    });

    expect(message.title).toBeUndefined();
    expect(message.body).toBe("Toby's Worming tablet is due tomorrow");
    expect(message.data.screen).toBe('/home');
  });

  // The one kind that still carries text a person typed. Without the title the
  // push says nothing anyone can act on -- see the comment on the builder.
  it('keeps the reminder title, which every other kind would drop', () => {
    expect(
      buildReminderDueMessage({ petName: 'Toby', title: 'Worming tablet', leadDays: 1 }).body
    ).toContain('Worming tablet');
  });

  it('counts the days when the lead is longer than one', () => {
    const message = buildReminderDueMessage({
      petName: 'Crumpet',
      title: 'Vet appointment',
      leadDays: 3
    });

    expect(message.body).toBe("Crumpet's Vet appointment is due in 3 days");
  });

  // It fires BEFORE the day, so nothing has been missed yet.
  it('never says the reminder is overdue', () => {
    const message = buildReminderDueMessage({
      petName: 'Toby',
      title: 'Worming tablet',
      leadDays: 2
    });

    expect(message.body).not.toMatch(/overdue|missed|late/i);
  });
});
