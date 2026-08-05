import { supabase } from '@/lib/supabase/client';
import type { PetSex } from '@/types/core';

export type CreateHouseholdAndPetInput = {
  timezone: string;
  pet: {
    name: string;
    breed: string;
    sex: PetSex;
    birthdate: string;
    birthdateIsApproximate: boolean;
    photoUrl: string | null;
  };
  feedingTimes: { scheduledTime: string; label: string }[];
};

namespace OnboardingService {
  /**
   * One RPC, not a sequence of inserts: the household, its owner membership,
   * the pet and its schedule are created in a single transaction, so a failure
   * part-way cannot leave a user with a household they are not a member of.
   */
  export async function createHouseholdAndPet(input: CreateHouseholdAndPetInput): Promise<void> {
    const { error } = await supabase.rpc('create_household_and_pet', {
      household_timezone: input.timezone,
      pet_name: input.pet.name,
      pet_breed: input.pet.breed,
      pet_sex: input.pet.sex,
      pet_birthdate: input.pet.birthdate,
      pet_birthdate_is_approximate: input.pet.birthdateIsApproximate,
      pet_photo_url: input.pet.photoUrl,
      feeding_times: input.feedingTimes
    });

    if (error) throw error;
  }
}

export default OnboardingService;
