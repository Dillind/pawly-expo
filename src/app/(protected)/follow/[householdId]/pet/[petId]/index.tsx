import { useLocalSearchParams } from 'expo-router';

import FollowerPetProfile from '@/components/screens/follow/follower-pet-profile';

export default function FollowerPetScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();

  return <FollowerPetProfile petId={petId} />;
}
