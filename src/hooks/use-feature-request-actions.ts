import { Alert } from 'react-native';

import {
  useDeleteFeatureRequest,
  useHideFeatureRequestAuthor,
  useReportFeatureRequest,
  useRestoreFeatureRequest,
  useSetFeatureRequestStatus,
  useToggleVote
} from '@/hooks/queries/feature-requests/use-feature-request-mutations';
import type { FeatureRequest, FeatureRequestStatus } from '@/services/feature-request.service';

type Viewer = { isTeam: boolean; isBanned: boolean };

export type FeatureRequestPermissions = {
  canVote: boolean;
  canReport: boolean;
  canHideAuthor: boolean;
  canDeleteOwn: boolean;
  canModerate: boolean;
  canRestore: boolean;
  canDeleteAsTeam: boolean;
};

export const featureRequestPermissions = (
  request: FeatureRequest,
  { isTeam, isBanned }: Viewer
): FeatureRequestPermissions => ({
  canVote: !isBanned,
  canReport: !request.isMine && !isBanned,
  canHideAuthor: !request.isMine,
  canDeleteOwn: request.isMine,
  canModerate: isTeam,
  canRestore: isTeam && request.reportCount > 0,
  canDeleteAsTeam: isTeam && !request.isMine
});

export function useFeatureRequestActions(onDeleted?: () => void) {
  const { mutate: toggleVote } = useToggleVote();
  const { mutate: deleteRequest } = useDeleteFeatureRequest();
  const { mutate: report } = useReportFeatureRequest();
  const { mutate: hideAuthor } = useHideFeatureRequestAuthor();
  const { mutate: setStatus } = useSetFeatureRequestStatus();
  const { mutate: restore } = useRestoreFeatureRequest();

  return {
    toggleVote: (request: FeatureRequest) =>
      toggleVote({ requestId: request.id, hasVoted: request.hasVoted }),
    confirmDelete: (request: FeatureRequest) =>
      Alert.alert('Delete this request?', 'Its votes are removed too.', [
        { text: 'Cancel', style: 'cancel', isPreferred: true },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRequest(request.id, { onSuccess: onDeleted })
        }
      ]),
    report: (request: FeatureRequest) => report(request.id),
    hideAuthor: (request: FeatureRequest) => hideAuthor(request.id),
    setStatus: (request: FeatureRequest, status: FeatureRequestStatus) =>
      setStatus({ requestId: request.id, status }),
    restore: (request: FeatureRequest) => restore(request.id)
  };
}
