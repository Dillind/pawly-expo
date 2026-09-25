import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useState, type RefObject } from 'react';

import {
  ChooseOwnerStep,
  ConfirmStep,
  HouseholdsStep
} from '@/components/bottom-sheets/delete-account-steps';
import Tray, { type TrayStepDescriptor } from '@/components/core/tray';
import { useAccountDeletionPlan } from '@/hooks/queries/account/use-account-deletion-plan';
import { useDeleteAccount } from '@/hooks/queries/account/use-delete-account';
import { useHandOverHousehold } from '@/hooks/queries/account/use-hand-over-household';
import { useSignInMethod } from '@/hooks/queries/account/use-sign-in-method';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

const CONFIRM = 'confirm';
const chooseStepId = (householdId: string) => `choose:${householdId}`;

const DeleteAccountSheet = ({ sheetRef }: Props) => {
  const [isPresented, setIsPresented] = useState(false);
  const [resolved, setResolved] = useState<string[]>([]);
  const [householdsToDelete, setHouseholdsToDelete] = useState<string[]>([]);

  const {
    data: households = [],
    isLoading,
    isError,
    refetch
  } = useAccountDeletionPlan(isPresented);
  const { data: method = 'email' } = useSignInMethod();
  const { mutate: handOver, isPending: isHandingOver } = useHandOverHousehold();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  // A handed-over Household refetches as `leave`; its step stays so the Tray does not lose its place.
  const toChoose = households.filter(
    (household) => household.outcome === 'choose' || resolved.includes(household.id)
  );
  const stepAfter = (index: number) => {
    const next = toChoose[index + 1];
    return next ? chooseStepId(next.id) : CONFIRM;
  };

  const resolve = (householdId: string) =>
    setResolved((current) => (current.includes(householdId) ? current : [...current, householdId]));

  const steps: TrayStepDescriptor[] = [
    {
      id: 'households',
      title: 'Delete account',
      render: () => (
        <HouseholdsStep
          households={households}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          nextStepId={stepAfter(-1)}
        />
      )
    },
    ...toChoose.map((household, index) => ({
      id: chooseStepId(household.id),
      title: household.name,
      render: () => (
        <ChooseOwnerStep
          household={household}
          isSaving={isHandingOver}
          nextStepId={stepAfter(index)}
          onContinue={(choice, goNext) => {
            resolve(household.id);
            if (choice.kind === 'delete') {
              setHouseholdsToDelete((current) => [...current, household.id]);
              goNext();
              return;
            }
            handOver(
              { householdId: household.id, successorId: choice.userId },
              { onSuccess: goNext }
            );
          }}
        />
      )
    })),
    {
      id: CONFIRM,
      title: 'Delete your account',
      render: () => (
        <ConfirmStep
          method={method}
          isDeleting={isDeleting}
          onDelete={({ confirmation, password }, onWrongPassword) =>
            deleteAccount(
              { confirmation, password, method, householdsToDelete },
              {
                onSuccess: (result) => {
                  if (result.status === 'wrong_password') onWrongPassword();
                }
              }
            )
          }
        />
      )
    }
  ];

  return (
    <Tray
      sheetRef={sheetRef}
      steps={steps}
      onPresent={() => setIsPresented(true)}
      onDismiss={() => {
        setIsPresented(false);
        setResolved([]);
        setHouseholdsToDelete([]);
      }}
    />
  );
};

export default DeleteAccountSheet;
