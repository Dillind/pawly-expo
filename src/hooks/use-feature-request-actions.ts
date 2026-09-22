import { Alert } from 'react-native';

import {
  useDeleteFeatureRequest,
  useHideFeatureRequestAuthor,
  useReportFeatureRequest,
  useRestoreFeatureRequest,
  useSetFeatureRequestStatus
} from '@/hooks/queries/feature-requests/use-feature-request-mutations';
import type { FeatureRequest, FeatureRequestStatus } from '@/services/feature-request.service';

// One set of handlers for the card's context menu and the detail screen's ⋯ menu.
export function useFeatureRequestActions(onDeleted?: () => void) {
  const { mutate: deleteRequest } = useDeleteFeatureRequest();
  const { mutate: report } = useReportFeatureRequest();
  const { mutate: hideAuthor } = useHideFeatureRequestAuthor();
  const { mutate: setStatus } = useSetFeatureRequestStatus();
  const { mutate: restore } = useRestoreFeatureRequest();

  const confirmDelete = (request: FeatureRequest) => {
    Alert.alert('Delete this request?', 'Its votes are removed too.', [
      { text: 'Cancel', style: 'cancel', isPreferred: true },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRequest(request.id, { onSuccess: onDeleted })
      }
    ]);
  };

  return {
    confirmDelete,
    report: (request: FeatureRequest) => report(request.id),
    hideAuthor: (request: FeatureRequest) => hideAuthor(request.id),
    setStatus: (request: FeatureRequest, status: FeatureRequestStatus) =>
      setStatus({ requestId: request.id, status }),
    restore: (request: FeatureRequest) => restore(request.id)
  };
}
