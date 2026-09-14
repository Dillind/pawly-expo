import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';

import { addPetSchema, type AddPetFormValues } from '@/constants/schemas/add-pet';
import { HeaderTitleStyle } from '@/constants/theme';
import { EVERY_DAY } from '@/lib/form/pet-schemas';

const DEFAULT_FEED_TIMES: AddPetFormValues['feedTimes'] = [
  { label: 'morning', localTime: '07:00', daysOfWeek: [...EVERY_DAY], instructions: null },
  { label: 'dinner', localTime: '17:00', daysOfWeek: [...EVERY_DAY], instructions: null }
];

// A nested stack, so each step pushes rather than presenting: a sheet raised
// from a modal is two modals. The form lives here so all four routes share one
// instance and one schema.
export default function AddPetLayout() {
  const form = useForm<AddPetFormValues>({
    resolver: zodResolver(addPetSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      petType: 'dog',
      sex: 'male',
      ageMode: 'birthdate',
      birthdate: '',
      breedId: null,
      photoUri: null,
      feedTimes: DEFAULT_FEED_TIMES
    }
  });

  return (
    <FormProvider {...form}>
      {/* The three flow steps draw their own bar, so the native header is off
          for them. The two screens a step pushes keep theirs. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* The only step whose body is a full-height list, not a
            scroll view, so an overlaying bar would sit on top of the heading. */}
        <Stack.Screen name="breed" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Breed</Stack.Title>
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="feeds" />
        <Stack.Screen name="feed" options={{ headerShown: true }}>
          <Stack.Title style={HeaderTitleStyle}>Feed</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="instructions" />
      </Stack>
    </FormProvider>
  );
}
