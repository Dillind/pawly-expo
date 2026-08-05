import PetService from '@/services/pet.service';

const mockEq = jest.fn();
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
  mockEq.mockResolvedValue({ error: null });
  mockSingle.mockResolvedValue({ data: { photo_url: null }, error: null });
});

describe('PetService.update', () => {
  it('translates the domain shape into column names', async () => {
    await PetService.update('pet-1', {
      name: 'Crumpet',
      breed: 'Toy Cavoodle',
      birthdateIsApproximate: true
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'Crumpet',
      breed: 'Toy Cavoodle',
      birthdate_is_approximate: true
    });
  });

  it('writes only the keys it was given, so a bio edit cannot blank a name', async () => {
    await PetService.update('pet-1', { bio: 'Loves the dog park' });

    expect(mockUpdate).toHaveBeenCalledWith({ bio: 'Loves the dog park' });
  });

  it('keeps an explicit null, which is how a field is cleared', async () => {
    await PetService.update('pet-1', { breed: null, birthdate: null });

    expect(mockUpdate).toHaveBeenCalledWith({ breed: null, birthdate: null });
  });

  it('targets the pet by id', async () => {
    await PetService.update('pet-1', { name: 'Crumpet' });

    expect(mockEq).toHaveBeenCalledWith('id', 'pet-1');
  });

  it('throws when the write is rejected', async () => {
    mockEq.mockResolvedValue({ error: new Error('row-level security') });

    await expect(PetService.update('pet-1', { name: 'Crumpet' })).rejects.toThrow(
      'row-level security'
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
    await PetService.add({
      name: 'Miso',
      breed: 'Ragdoll',
      sex: 'female',
      birthdate: '2024-02-01',
      birthdateIsApproximate: true,
      photoUrl: null,
      feedingTimes: [{ scheduledTime: '07:00', label: 'morning' }]
    });

    expect(mockRpc).toHaveBeenCalledWith('add_pet', {
      pet_name: 'Miso',
      pet_breed: 'Ragdoll',
      pet_sex: 'female',
      pet_birthdate: '2024-02-01',
      pet_birthdate_is_approximate: true,
      pet_photo_url: null,
      feeding_times: [{ scheduledTime: '07:00', label: 'morning' }]
    });
  });

  it('maps the returned row back into the domain shape', async () => {
    mockRpcSingle.mockResolvedValue({
      data: { id: 'pet-2', name: 'Miso', photo_url: 'https://example.test/m.jpg' },
      error: null
    });

    await expect(
      PetService.add({
        name: 'Miso',
        breed: 'Ragdoll',
        sex: 'female',
        birthdate: '2024-02-01',
        birthdateIsApproximate: false,
        photoUrl: null,
        feedingTimes: []
      })
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
        breed: 'Toy Cavoodle',
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
      breed: 'Toy Cavoodle',
      sex: 'male',
      birthdate: '2026-03-28',
      birthdateIsApproximate: true,
      photoUrl: 'https://example.test/a.jpg',
      bio: null
    });
  });
});
