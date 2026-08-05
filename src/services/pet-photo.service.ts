import { UserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';

export type PetPhoto = { id: string; url: string; sortOrder: number };

const BUCKET = 'pet-photos';

/**
 * A public URL is `.../object/public/pet-photos/<path>`. Returns null for
 * anything that is not one of ours, so a hand-set or external URL is left alone.
 */
const storagePathFromPublicUrl = (url: string | null): string | null => {
  if (!url) return null;

  const marker = `/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const path = url.slice(index + marker.length).split('?')[0];
  return path.length > 0 ? decodeURIComponent(path) : null;
};

namespace PetPhotoService {
  export async function list(petId: string): Promise<PetPhoto[]> {
    const { data, error } = await supabase
      .from('pet_photos')
      .select('id, storage_path, sort_order')
      .eq('pet_id', petId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      url: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
      sortOrder: row.sort_order
    }));
  }

  export async function add(params: {
    petId: string;
    userId: string;
    localUri: string;
  }): Promise<void> {
    const response = await fetch(params.localUri);
    if (!response.ok) throw new UserFacingError('Could not read the selected photo');

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new UserFacingError('The selected photo is empty');

    const path = `${params.userId}/${params.petId}/${Crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.rpc('add_pet_photo', {
      p_pet_id: params.petId,
      p_storage_path: path
    });

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw insertError;
    }
  }

  export async function remove(params: { photoId: string; photoUrl: string }): Promise<void> {
    // The RPC returns the row's storage_path. Trust that over anything the
    // client is holding: it is read inside the same transaction as the delete.
    const { data: storagePath, error: deleteRowError } = await supabase.rpc('delete_pet_photo', {
      p_photo_id: params.photoId,
      p_photo_url: params.photoUrl
    });
    if (deleteRowError) throw deleteRowError;

    const { error: deleteObjectError } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (deleteObjectError) {
      throw new UserFacingError('The photo was removed, but its file could not be cleaned up');
    }
  }

  export async function uploadCover(params: { userId: string; localUri: string }): Promise<string> {
    const response = await fetch(params.localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${params.userId}/${Crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg' });

    if (error) throw error;

    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Best effort by design: a member who did not upload the old file cannot
   * delete it under the storage policy, and failing the whole photo change over
   * a leftover object would be worse than the leftover.
   */
  export async function removeByPublicUrl(url: string | null): Promise<void> {
    const path = storagePathFromPublicUrl(url);
    if (!path) return;

    await supabase.storage.from(BUCKET).remove([path]);
  }
}

export default PetPhotoService;
