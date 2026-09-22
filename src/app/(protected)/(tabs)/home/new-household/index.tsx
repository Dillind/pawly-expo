import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import FormTextInput from '@/components/core/form-text-input';
import MainButton from '@/components/core/main-button';
import FlowScreen from '@/components/layout/flow-screen';
import HandleField from '@/components/ui/handle-field';
import {
  NEW_HOUSEHOLD_NAME_FIELDS,
  NEW_HOUSEHOLD_STEP_COUNT,
  type NewHouseholdFormValues
} from '@/constants/schemas/new-household';
import { useNewHouseholdExit } from '@/hooks/use-new-household-exit';

const NameYourHousehold = () => {
  const router = useRouter();

  const { control, trigger } = useFormContext<NewHouseholdFormValues>();
  const { exit } = useNewHouseholdExit();
  const [isAvailable, setIsAvailable] = useState(false);

  const name = useWatch({ control, name: 'name' });

  const onContinue = async () => {
    const isValid = await trigger([...NEW_HOUSEHOLD_NAME_FIELDS]);

    if (isValid) router.push('/home/new-household/discovery');
  };

  return (
    <FlowScreen
      step={1}
      stepCount={NEW_HOUSEHOLD_STEP_COUNT}
      title="Name your household"
      subtitle="Your house and your followers see this name."
      closeLabel="Leave setup"
      onClose={exit}
      isKeyboardAware
      footer={
        <MainButton text="Continue" isDisabled={!isAvailable} onPress={() => void onContinue()} />
      }>
      <FormTextInput
        name="name"
        label="Household name"
        isLabelIndicated
        placeholder="Kathy's House"
        returnKeyType="next"
      />

      <HandleField stem={name} onAvailabilityChange={setIsAvailable} />
    </FlowScreen>
  );
};

export default NameYourHousehold;
