import { assertWrote } from '@/lib/supabase/assert-wrote';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/unwrap';
import PetPhotoService from '@/services/pet-photo.service';
import type { FeedingScheduleLabel, Pet, PetSex, PetType } from '@/types/core';
import type { TablesUpdate } from '@/types/database';

export type PetDetail = {
  id: string;
  name: string;
  breedId: string | null;
  // Free text from before the list existed, and the live value for type
  // `other`. A pet carries one of the two, never both.
  breedFreetext: string | null;
  sex: PetSex | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
  bio: string | null;
  petType: PetType;
};

export type AddPetInput = {
  name: string;
  breedId: string | null;
  breedFreetext: string | null;
  sex: PetSex;
  birthdate: string;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
  petType: PetType;
  feedingTimes: {
    scheduledTime: string;
    label: FeedingScheduleLabel;
    daysOfWeek: number[];
    instructions: string | null;
  }[];
};

export type PetPatch = {
  name?: string;
  breedId?: string | null;
  breedFreetext?: string | null;
  bio?: string | null;
  sex?: PetSex;
  birthdate?: string | null;
  birthdateIsApproximate?: boolean;
  petType?: PetType;
};

const DETAIL_COLUMNS =
  'id, name, breed_id, breed_freetext, sex, birthdate, birthdate_is_approximate, photo_url, bio, pet_type';

namespace PetService {
  export async function getDetail(petId: string): Promise<PetDetail> {
    const data = await unwrap(
      supabase.from('pets').select(DETAIL_COLUMNS).eq('id', petId).single()
    );

    return {
      id: data.id,
      name: data.name,
      breedId: data.breed_id,
      breedFreetext: data.breed_freetext,
      sex: data.sex,
      birthdate: data.birthdate,
      birthdateIsApproximate: data.birthdate_is_approximate,
      photoUrl: data.photo_url,
      bio: data.bio,
      petType: data.pet_type
    };
  }

  export async function update(petId: string, patch: PetPatch): Promise<void> {
    const row: TablesUpdate<'pets'> = {};

    if (patch.name !== undefined) row.name = patch.name;
    if (patch.breedId !== undefined) row.breed_id = patch.breedId;
    if (patch.breedFreetext !== undefined) row.breed_freetext = patch.breedFreetext;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.sex !== undefined) row.sex = patch.sex;
    if (patch.birthdate !== undefined) row.birthdate = patch.birthdate;
    if (patch.birthdateIsApproximate !== undefined) {
      row.birthdate_is_approximate = patch.birthdateIsApproximate;
    }
    if (patch.petType !== undefined) row.pet_type = patch.petType;

    const data = await unwrap(supabase.from('pets').update(row).eq('id', petId).select('id'));

    assertWrote(data, 'Only an owner can change this pet');
  }

  export async function setPhotoUrl(petId: string, publicUrl: string): Promise<void> {
    const data = await unwrap(
      supabase.from('pets').update({ photo_url: publicUrl }).eq('id', petId).select('id')
    );

    assertWrote(data, 'Only an owner can change this pet');
  }

  // `null` means the user has no household, and the RPC creates one with them
  // as owner, so a first pet and a fifth take the same path.
  export async function add(
    input: AddPetInput,
    householdId: string | null,
    timezone: string
  ): Promise<Pet> {
    const data = await unwrap(
      supabase
        .rpc('add_pet', {
          pet_name: input.name,
          pet_breed: input.breedFreetext,
          pet_breed_id: input.breedId,
          pet_sex: input.sex,
          pet_birthdate: input.birthdate,
          pet_birthdate_is_approximate: input.birthdateIsApproximate,
          pet_photo_url: input.photoUrl,
          feeding_times: input.feedingTimes,
          target_household_id: householdId,
          household_timezone: timezone,
          pet_pet_type: input.petType
        })
        .single()
    );

    // supabase-js types the row as unknown without generated database types.
    const row = data as { id: string; name: string; photo_url: string | null };

    return { id: row.id, name: row.name, photoUrl: row.photo_url };
  }

  // The photo rows cascade but their files do not, and once the rows are gone
  // nothing knows the paths. Storage is cleared first, best effort: an orphan
  // is a cost, a pet that cannot be removed is a bug.
  export async function remove(petId: string): Promise<void> {
    try {
      const [cover, photos] = await Promise.all([
        supabase.from('pets').select('photo_url').eq('id', petId).single(),
        PetPhotoService.list(petId)
      ]);

      await Promise.all([
        PetPhotoService.removeByPublicUrl(cover.data?.photo_url ?? null),
        ...photos.map((photo) => PetPhotoService.removeByPublicUrl(photo.url))
      ]);
    } catch (error) {
      console.error(error);
    }

    await unwrap(supabase.from('pets').delete().eq('id', petId));
  }
}

export default PetService;
