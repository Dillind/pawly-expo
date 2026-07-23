import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';

namespace StorageService {
  export async function uploadPetPhoto(params: {
    userId: string;
    localUri: string;
  }): Promise<string> {
    const response = await fetch(params.localUri);
    const arrayBuffer = await response.arrayBuffer();
    const path = `${params.userId}/${Crypto.randomUUID()}.jpg`;

    const { error } = await supabase.storage.from('pet-photos').upload(path, arrayBuffer, {
      contentType: 'image/jpeg'
    });

    if (error) throw error;

    const {
      data: { publicUrl }
    } = supabase.storage.from('pet-photos').getPublicUrl(path);

    return publicUrl;
  }
}

export default StorageService;
