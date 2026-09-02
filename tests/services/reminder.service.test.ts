import ReminderService from '@/services/reminder.service';

const mockRpc = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...(args as [])),
    from: jest.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    })),
    auth: { getSession: () => mockGetSession() }
  }
}));

/** An insert reads back an id; an update and a delete resolve on the last `.eq()`. */
const eqChain = (result: unknown = { error: null }) => {
  const eq: jest.Mock = jest.fn(() => Object.assign(Promise.resolve(result), { eq }));

  return eq;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });
  mockInsert.mockReturnValue({
    select: jest.fn(() => ({
      single: jest.fn().mockResolvedValue({ data: { id: 'rem-1' }, error: null })
    }))
  });
  mockUpdate.mockReturnValue({ eq: eqChain() });
  mockDelete.mockReturnValue({ eq: eqChain() });
});

describe('ReminderService.listForDay', () => {
  it('maps the row onto the domain shape and trims the seconds off the time', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          reminder_id: 'rem-1',
          title: 'Worming tablet',
          kind: 'medication',
          local_time: '08:30:00',
          state: 'due',
          done_by: null,
          done_at: null
        }
      ],
      error: null
    });

    const [occurrence] = await ReminderService.listForDay('pet-1', '2026-09-01');

    expect(occurrence).toEqual({
      reminderId: 'rem-1',
      occurrenceDate: '2026-09-01',
      title: 'Worming tablet',
      kind: 'medication',
      localTime: '08:30',
      state: 'due',
      doneBy: null,
      doneAt: null
    });
  });

  it('leaves an HH:mm time alone', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          reminder_id: 'rem-1',
          title: 'Vet checkup',
          kind: 'vet',
          local_time: '17:05',
          state: 'done',
          done_by: 'user-2',
          done_at: '2026-09-01T07:05:00.000Z'
        }
      ],
      error: null
    });

    const [occurrence] = await ReminderService.listForDay('pet-1', '2026-09-01');

    expect(occurrence.localTime).toBe('17:05');
  });

  it('throws the driver error rather than returning an empty day', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('permission denied') });

    await expect(ReminderService.listForDay('pet-1', '2026-09-01')).rejects.toThrow(
      'permission denied'
    );
  });
});

describe('ReminderService.daysWithReminders', () => {
  it('keys the kinds by day', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { day: '2026-09-01', kinds: ['medication', 'vet'] },
        { day: '2026-09-04', kinds: ['feed'] }
      ],
      error: null
    });

    await expect(
      ReminderService.daysWithReminders('house-1', '2026-08-31', '2026-09-06')
    ).resolves.toEqual({
      '2026-09-01': ['medication', 'vet'],
      '2026-09-04': ['feed']
    });
  });

  it('returns an empty map when the week has none', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await expect(
      ReminderService.daysWithReminders('house-1', '2026-08-31', '2026-09-06')
    ).resolves.toEqual({});
  });
});

describe('ReminderService.create', () => {
  it('translates the domain shape into column names', async () => {
    await ReminderService.create({
      petId: 'pet-1',
      title: 'Worming tablet',
      kind: 'medication',
      startsOn: '2026-09-01',
      localTime: '08:30',
      repeat: 'monthly',
      leadDays: 1
    });

    expect(mockInsert).toHaveBeenCalledWith({
      pet_id: 'pet-1',
      title: 'Worming tablet',
      kind: 'medication',
      starts_on: '2026-09-01',
      local_time: '08:30',
      repeat: 'monthly',
      lead_days: 1,
      created_by: 'user-1'
    });
  });

  it('trims the title, so a stray space is not stored', async () => {
    await ReminderService.create({
      petId: 'pet-1',
      title: '  Vet checkup  ',
      kind: 'vet',
      startsOn: '2026-09-01',
      localTime: '09:00',
      repeat: 'once',
      leadDays: 1
    });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vet checkup' }));
  });

  it('refuses to write without a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(
      ReminderService.create({
        petId: 'pet-1',
        title: 'Worming tablet',
        kind: 'medication',
        startsOn: '2026-09-01',
        localTime: '08:30',
        repeat: 'monthly',
        leadDays: 1
      })
    ).rejects.toThrow('Not signed in');

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('ReminderService.remove', () => {
  it('is soft, so the completions survive', async () => {
    await ReminderService.remove('rem-1');

    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
  });
});

describe('ReminderService.complete', () => {
  it('records who ticked it, on the occurrence date', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await ReminderService.complete('rem-1', '2026-09-01');

    expect(mockInsert).toHaveBeenCalledWith({
      reminder_id: 'rem-1',
      occurrence_date: '2026-09-01',
      done_by: 'user-1'
    });
  });

  it('refuses to write without a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockInsert.mockResolvedValue({ error: null });

    await expect(ReminderService.complete('rem-1', '2026-09-01')).rejects.toThrow('Not signed in');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('ReminderService.removeCompletion', () => {
  it('unticks by deleting the completion, not by writing a state', async () => {
    await ReminderService.removeCompletion('rem-1', '2026-09-01');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
