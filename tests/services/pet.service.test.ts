import PetService from '@/services/pet.service';

const mockEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({
  eq: jest.fn(() => ({ single: mockSingle })),
  single: mockSingle
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: mockUpdate,
      select: mockSelect
    }))
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEq.mockResolvedValue({ error: null });
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
