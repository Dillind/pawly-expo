import { supabase } from '@/lib/supabase/client';
import type { Pet, PetSex } from '@/types/core';

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
  export async function getForHousehold(householdId: string): Promise<Pet> {
    const { data, error } = await supabase
      .from('pets')
      .select(LIST_COLUMNS)
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) throw error;

    return { id: data.id, name: data.name, photoUrl: data.photo_url };
  }

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
}

export default PetService;
