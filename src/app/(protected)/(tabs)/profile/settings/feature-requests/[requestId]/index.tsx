import { useLocalSearchParams } from 'expo-router';

import FeatureRequestDetail from '@/components/screens/feature-requests/feature-request-detail';

export default function FeatureRequestScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  return <FeatureRequestDetail requestId={requestId} />;
}
