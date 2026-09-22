import { useRouter } from 'expo-router';
import { Controller, useFormContext } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import FlowScreen from '@/components/layout/flow-screen';
import ChoiceCard from '@/components/ui/choice-card';
import {
  NEW_HOUSEHOLD_STEP_COUNT,
  type NewHouseholdFormValues
} from '@/constants/schemas/new-household';
import type { AppTheme } from '@/constants/theme';
import { useNewHouseholdExit } from '@/hooks/use-new-household-exit';
import { useStyles } from '@/hooks/use-styles';

const Discovery = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { control } = useFormContext<NewHouseholdFormValues>();
  const { exit } = useNewHouseholdExit();

  return (
    <FlowScreen
      step={2}
      stepCount={NEW_HOUSEHOLD_STEP_COUNT}
      title="Can people find you?"
      subtitle="This changes who can find you. It never changes who gets in."
      closeLabel="Leave setup"
      onClose={exit}
      onBack={() => router.back()}
      footer={
        <MainButton text="Continue" onPress={() => router.push('/home/new-household/pet')} />
      }>
      <Controller
        control={control}
        name="isListed"
        render={({ field: { onChange, value } }) => (
          <>
            <ChoiceCard
              icon="globe"
              label="Listed"
              description="Anyone can find you by name or handle."
              isSelected={value}
              onPress={() => onChange(true)}
            />
            <ChoiceCard
              icon="lock"
              label="Unlisted"
              description="Only people with your follow link can find you."
              isSelected={!value}
              onPress={() => onChange(false)}
            />
          </>
        )}
      />

      <AppText size="footnote" color="textSecondary" style={styles.hint}>
        You accept every follower yourself, listed or not.
      </AppText>
    </FlowScreen>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    hint: {
      paddingHorizontal: spacing.one
    }
  });

export default Discovery;
