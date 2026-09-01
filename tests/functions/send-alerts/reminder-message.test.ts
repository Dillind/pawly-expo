import { buildReminderDueMessage } from '../../../supabase/functions/send-alerts/message';

// The push is the whole feature on a lock screen, so the wording is locked down
// here -- nothing else runs this file, because the Edge Function is Deno and
// Jest cannot reach it.
describe('buildReminderDueMessage', () => {
  it('names the pet and the reminder', () => {
    const message = buildReminderDueMessage({
      petName: 'Toby',
      title: 'Worming tablet',
      leadDays: 1
    });

    expect(message.title).toBe('Toby: Worming tablet');
    expect(message.body).toBe('Due tomorrow');
    expect(message.data.screen).toBe('/home');
  });

  it('counts the days when the lead is longer than one', () => {
    const message = buildReminderDueMessage({
      petName: 'Crumpet',
      title: 'Vet appointment',
      leadDays: 3
    });

    expect(message.body).toBe('Due in 3 days');
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
