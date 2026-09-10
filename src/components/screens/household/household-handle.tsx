import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import MainButton from '@/components/core/main-button';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import HandleField from '@/components/ui/handle-field';
import { SuccessMessage } from '@/constants/enums';
import { householdHandleSchema, type HouseholdHandleInput } from '@/constants/schemas/household';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useHouseholdById } from '@/hooks/queries/household/use-household-by-id';
import { useUpdateHousehold } from '@/hooks/queries/household/use-update-household';
import { useStyles } from '@/hooks/use-styles';

type Props = {
  householdId: string;
};

const HouseholdHandle = ({ householdId }: Props) => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: household } = useHouseholdById(householdId);
  const { mutate: saveHandle, isPending: isSaving } = useUpdateHousehold(
    householdId,
    SuccessMessage.HouseholdHandleUpdated
  );
  const [isAvailable, setIsAvailable] = useState(false);

  const form = useForm<HouseholdHandleInput>({
    resolver: zodResolver(householdHandleSchema),
    defaultValues: { handle: household?.handle ?? '' },
    values: household ? { handle: household.handle ?? '' } : undefined,
    mode: 'onChange'
  });

  // The Owner came here to set one fact, and the row they return to shows the
  // new value. Staying on the screen would leave them to find their own way
  // back from a form with nothing left to do.
  const submit = form.handleSubmit((values) =>
    saveHandle({ handle: values.handle }, { onSuccess: () => router.back() })
  );

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <FormProvider {...form}>
          <HandleField
            currentHandle={household?.handle}
            stem={household?.name ?? ''}
            onAvailabilityChange={setIsAvailable}
          />

          <MainButton
            text={isSaving ? 'Saving…' : 'Save handle'}
            isLoading={isSaving}
            isDisabled={!isAvailable || isSaving}
            onPress={submit}
          />
        </FormProvider>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: spacing.four,
      paddingBottom: BottomTabInset + spacing.four,
      gap: spacing.four
    }
  });

export default HouseholdHandle;
