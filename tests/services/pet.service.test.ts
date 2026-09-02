import PetService from '@/services/pet.service';

// An update awaits `.select()`; a delete awaits the `.eq()` itself.
let eqResult: { error: Error | null } = { error: null };
const mockWriteSelect = jest.fn();
const mockEq = jest.fn(() => Object.assign(Promise.resolve(eqResult), { select: mockWriteSelect }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockDelete = jest.fn(() => ({ eq: mockEq }));
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({
  eq: jest.fn(() => ({ single: mockSingle })),
  single: mockSingle
}));
const mockRpcSingle = jest.fn();
const mockRpc = jest.fn(() => ({ single: mockRpcSingle }));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect
    })),
    rpc: (...args: unknown[]) => mockRpc(...(args as [])),
    storage: { from: jest.fn(() => ({ remove: jest.fn() })) }
  }
}));

jest.mock('@/services/pet-photo.service', () => ({
  __esModule: true,
  default: {
    list: jest.fn().mockResolvedValue([]),
    removeByPublicUrl: jest.fn().mockResolvedValue(undefined)
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  eqResult = { error: null };
  mockWriteSelect.mockResolvedValue({ data: [{ id: 'pet-1' }], error: null });
  mockSingle.mockResolvedValue({ data: { photo_url: null }, error: null });
});

describe('PetService.update', () => {
  it('translates the domain shape into column names', async () => {
    await PetService.update('pet-1', {
      name: 'Crumpet',
      breedId: 'breed-1',
      breedFreetext: null,
      birthdateIsApproximate: true
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'Crumpet',
      breed_id: 'breed-1',
      breed_freetext: null,
      birthdate_is_approximate: true
    });
  });

  it('writes only the keys it was given, so a bio edit cannot blank a name', async () => {
    await PetService.update('pet-1', { bio: 'Loves the dog park' });

    expect(mockUpdate).toHaveBeenCalledWith({ bio: 'Loves the dog park' });
  });

  it('keeps an explicit null, which is how a field is cleared', async () => {
    await PetService.update('pet-1', { breedId: null, birthdate: null });

    expect(mockUpdate).toHaveBeenCalledWith({ breed_id: null, birthdate: null });
  });

  it('targets the pet by id', async () => {
    await PetService.update('pet-1', { name: 'Crumpet' });

    expect(mockEq).toHaveBeenCalledWith('id', 'pet-1');
  });

  it('throws when the write is rejected', async () => {
    mockWriteSelect.mockResolvedValue({ data: null, error: new Error('row-level security') });

    await expect(PetService.update('pet-1', { name: 'Crumpet' })).rejects.toThrow(
      'row-level security'
    );
  });

  // RLS filters the row out rather than erroring, so an empty result is the
  // only sign the write never happened.
  it('throws when the policy matched no rows', async () => {
    mockWriteSelect.mockResolvedValue({ data: [], error: null });

    await expect(PetService.update('pet-1', { name: 'Crumpet' })).rejects.toThrow(
      'Only an owner can change this pet'
    );
  });
});

describe('PetService.add', () => {
  beforeEach(() => {
    mockRpcSingle.mockResolvedValue({
      data: { id: 'pet-2', name: 'Miso', photo_url: null },
      error: null
    });
  });

  it('translates the domain shape into the RPC argument names', async () => {
    await PetService.add(
      {
        name: 'Miso',
        breedId: 'breed-9',
        breedFreetext: null,
        sex: 'female',
        birthdate: '2024-02-01',
        birthdateIsApproximate: true,
        photoUrl: null,
        petType: 'cat',
        feedingTimes: [
          { scheduledTime: '07:00', label: 'morning', daysOfWeek: [1, 2, 3], instructions: null }
        ]
      },
      'household-1',
      'Australia/Melbourne'
    );

    expect(mockRpc).toHaveBeenCalledWith('add_pet', {
      pet_name: 'Miso',
      pet_breed: null,
      pet_breed_id: 'breed-9',
      pet_sex: 'female',
      pet_birthdate: '2024-02-01',
      pet_birthdate_is_approximate: true,
      pet_photo_url: null,
      feeding_times: [
        { scheduledTime: '07:00', label: 'morning', daysOfWeek: [1, 2, 3], instructions: null }
      ],
      target_household_id: 'household-1',
      household_timezone: 'Australia/Melbourne',
      pet_pet_type: 'cat'
    });
  });

  // Null is not "unset" -- it is what tells the RPC to create a household and
  // make the caller its owner, which is the whole of onboarding now.
  it('passes a null household through rather than omitting it', async () => {
    await PetService.add(
      {
        name: 'Miso',
        breedId: 'breed-9',
        breedFreetext: null,
        sex: 'female',
        birthdate: '2024-02-01',
        birthdateIsApproximate: true,
        photoUrl: null,
        petType: 'dog',
        feedingTimes: []
      },
      null,
      'Pacific/Auckland'
    );

    expect(mockRpc).toHaveBeenCalledWith(
      'add_pet',
      expect.objectContaining({
        target_household_id: null,
        household_timezone: 'Pacific/Auckland'
      })
    );
  });

  it('maps the returned row back into the domain shape', async () => {
    mockRpcSingle.mockResolvedValue({
      data: { id: 'pet-2', name: 'Miso', photo_url: 'https://example.test/m.jpg' },
      error: null
    });

    await expect(
      PetService.add(
        {
          name: 'Miso',
          breedId: 'breed-9',
          breedFreetext: null,
          sex: 'female',
          birthdate: '2024-02-01',
          birthdateIsApproximate: false,
          photoUrl: null,
          petType: 'dog',
          feedingTimes: []
        },
        'household-1',
        'Australia/Melbourne'
      )
    ).resolves.toEqual({ id: 'pet-2', name: 'Miso', photoUrl: 'https://example.test/m.jpg' });
  });
});

describe('PetService.remove', () => {
  it('targets the pet by id', async () => {
    await PetService.remove('pet-1');

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'pet-1');
  });

  it('still deletes the pet when clearing its storage fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSingle.mockRejectedValue(new Error('network'));

    await expect(PetService.remove('pet-1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

describe('PetService.getDetail', () => {
  it('maps column names back into the domain shape', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'pet-1',
        name: 'Crumpet',
        breed_id: null,
        breed_freetext: 'Toy Cavoodle',
        pet_type: 'dog',
        sex: 'male',
        birthdate: '2026-03-28',
        birthdate_is_approximate: true,
        photo_url: 'https://example.test/a.jpg',
        bio: null
      },
      error: null
    });

    await expect(PetService.getDetail('pet-1')).resolves.toEqual({
      id: 'pet-1',
      name: 'Crumpet',
      breedId: null,
      breedFreetext: 'Toy Cavoodle',
      petType: 'dog',
      sex: 'male',
      birthdate: '2026-03-28',
      birthdateIsApproximate: true,
      photoUrl: 'https://example.test/a.jpg',
      bio: null
    });
  });
});
