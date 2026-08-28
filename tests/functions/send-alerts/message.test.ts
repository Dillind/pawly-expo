import { buildFeedDueMessage } from '../../../supabase/functions/send-alerts/message';

// The four shapes in the CRU-086 copy table. The push is the whole feature on a
// lock screen, so the wording is worth locking down here -- nothing else runs
// this file, because the Edge Function is Deno and Jest cannot reach it.
describe('buildFeedDueMessage', () => {
  it('names the pet and the feed when one pet is due', () => {
    const message = buildFeedDueMessage({
      pets: [{ name: 'Crumpet', label: 'dinner' }],
      scheduledTime: '17:00:00'
    });

    expect(message.title).toBe("Crumpet's dinner is coming up");
    expect(message.body).toBe('Due 5:00 pm');
    expect(message.data.screen).toBe('/home');
  });

  it('leads with the shared label when two pets share one', () => {
    const message = buildFeedDueMessage({
      pets: [
        { name: 'Crumpet', label: 'dinner' },
        { name: 'Luna', label: 'dinner' }
      ],
      scheduledTime: '17:00:00'
    });

    expect(message.title).toBe('Dinner is coming up for Crumpet and Luna');
  });

  it('counts the rest from the fourth pet', () => {
    const message = buildFeedDueMessage({
      pets: [
        { name: 'Crumpet', label: 'dinner' },
        { name: 'Luna', label: 'dinner' },
        { name: 'Toby', label: 'dinner' },
        { name: 'Brownie', label: 'dinner' }
      ],
      scheduledTime: '17:00:00'
    });

    expect(message.title).toBe('Dinner is coming up for Crumpet, Luna and 2 more');
  });

  it('names the pets instead when the labels differ', () => {
    const message = buildFeedDueMessage({
      pets: [
        { name: 'Crumpet', label: 'dinner' },
        { name: 'Luna', label: 'lunch' }
      ],
      scheduledTime: '17:00:00'
    });

    expect(message.title).toBe('Crumpet and Luna have feeds coming up');
  });

  it('reads as a sentence for the labels that are not nouns', () => {
    expect(
      buildFeedDueMessage({
        pets: [{ name: 'Crumpet', label: 'morning' }],
        scheduledTime: '07:00:00'
      }).title
    ).toBe("Crumpet's morning feed is coming up");

    expect(
      buildFeedDueMessage({
        pets: [{ name: 'Crumpet', label: 'custom' }],
        scheduledTime: '12:00:00'
      }).title
    ).toBe("Crumpet's scheduled feed is coming up");
  });
});
