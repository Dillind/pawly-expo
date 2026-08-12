import { supabase } from '@/lib/supabase/client';
import PetPhotoService from '@/services/pet-photo.service';
import type { FeedingScheduleLabel, Pet, PetSex } from '@/types/core';

export type PetDetail = {
  id: string;
  name: string;
  breed: string | null;
  sex: PetSex | null;
  birthdate: string | null;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
  bio: string | null;
};

export type AddPetInput = {
  name: string;
  breed: string;
  sex: PetSex;
  birthdate: string;
  birthdateIsApproximate: boolean;
  photoUrl: string | null;
  feedingTimes: { scheduledTime: string; label: FeedingScheduleLabel }[];
};

export type PetPatch = {
  name?: string;
  breed?: string | null;
  bio?: string | null;
  sex?: PetSex;
  birthdate?: string | null;
  birthdateIsApproximate?: boolean;
};

const LIST_COLUMNS = 'id, name, photo_url';

const DETAIL_COLUMNS = 'id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url, bio';

namespace PetService {
  export async function listForHousehold(householdId: string): Promise<Pet[]> {
    const { data, error } = await supabase
      .from('pets')
      .select(LIST_COLUMNS)
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map((row) => ({ id: row.id, name: row.name, photoUrl: row.photo_url }));
  }

  export async function getDetail(petId: string): Promise<PetDetail> {
    const { data, error } = await supabase
      .from('pets')
      .select(DETAIL_COLUMNS)
      .eq('id', petId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      breed: data.breed,
      sex: data.sex,
      birthdate: data.birthdate,
      birthdateIsApproximate: data.birthdate_is_approximate,
      photoUrl: data.photo_url,
      bio: data.bio
    };
  }

  export async function update(petId: string, patch: PetPatch): Promise<void> {
    const row: Record<string, unknown> = {};

    if (patch.name !== undefined) row.name = patch.name;
    if (patch.breed !== undefined) row.breed = patch.breed;
    if (patch.bio !== undefined) row.bio = patch.bio;
    if (patch.sex !== undefined) row.sex = patch.sex;
    if (patch.birthdate !== undefined) row.birthdate = patch.birthdate;
    if (patch.birthdateIsApproximate !== undefined) {
      row.birthdate_is_approximate = patch.birthdateIsApproximate;
    }

    const { error } = await supabase.from('pets').update(row).eq('id', petId);
    if (error) throw error;
  }

  export async function setPhotoUrl(petId: string, publicUrl: string): Promise<void> {
    const { error } = await supabase.from('pets').update({ photo_url: publicUrl }).eq('id', petId);
    if (error) throw error;
  }

  /**
   * `householdId` is passed explicitly rather than derived, because the caller
   * knows which household is active and the RPC used to guess with an unordered
   * `limit 1`. Passing `null` means the user has none, and the RPC creates one
   * with them as its owner — which is how a first pet and a fifth take the same
   * path.
   */
  export async function add(
    input: AddPetInput,
    householdId: string | null,
    timezone: string
  ): Promise<Pet> {
    const { data, error } = await supabase
      .rpc('add_pet', {
        pet_name: input.name,
        pet_breed: input.breed,
        pet_sex: input.sex,
        pet_birthdate: input.birthdate,
        pet_birthdate_is_approximate: input.birthdateIsApproximate,
        pet_photo_url: input.photoUrl,
        feeding_times: input.feedingTimes,
        target_household_id: householdId,
        household_timezone: timezone
      })
      .single();

    if (error) throw error;

    // The RPC returns a pets row, which supabase-js types as unknown without
    // generated database types. Same treatment as mapLogFeedResult.
    const row = data as { id: string; name: string; photo_url: string | null };

    return { id: row.id, name: row.name, photoUrl: row.photo_url };
  }

  /**
   * Schedules, feed logs, the Care Card and photo rows all cascade with the pet.
   * The files those photo rows point at do not, and once the rows are gone
   * nothing knows the paths -- so storage is cleared first, while they are still
   * readable. Every step of that is best effort: an orphaned file is a cost, a
   * pet that cannot be removed is a bug.
   */
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

    const { error } = await supabase.from('pets').delete().eq('id', petId);
    if (error) throw error;
  }
}

export default PetService;
