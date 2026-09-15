import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';

import { newHouseholdSchema, type NewHouseholdFormValues } from '@/constants/schemas/new-household';
import { HeaderTitleStyle } from '@/constants/theme';
import { EVERY_DAY } from '@/lib/form/pet-schemas';

const DEFAULT_FEED_TIMES: NewHouseholdFormValues['feedTimes'] = [
  { label: 'morning', localTime: '07:00', daysOfWeek: [...EVERY_DAY], instructions: null },
  { label: 'dinner', localTime: '17:00', daysOfWeek: [...EVERY_DAY], instructions: null }
];

// The form lives here so every step shares one instance and one schema. The
// four steps draw their own bar; the feed editor a step pushes keeps its own.
export default function NewHouseholdLayout() {
  const form = useForm<NewHouseholdFormValues>({
    resolver: zodResolver(newHouseholdSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      handle: '',
      isListed: false,
      petName: '',
      petType: 'dog',
      sex: 'male',
      photoUri: null,
      feedTimes: DEFAULT_FEED_TIMES
    }
  });

  return (
    <FormProvider {...form}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="discovery" />
        <Stack.Screen name="pet" />
        <Stack.Screen name="feeds" />
        <Stack.Screen name="feed" options={{ headerShown: true, gestureEnabled: true }}>
          <Stack.Title style={HeaderTitleStyle}>Feed</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="done" />
      </Stack>
    </FormProvider>
  );
}
