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

/**
 * A nested stack inside the modal, so each step pushes rather than presenting.
 * A sheet raised from a modal is two modals, which Apple's modality guidance
 * and AGENTS.md both reject — so the feed editor is a screen here.
 *
 * The form lives here rather than on any one step. Every screen the Stack
 * renders is a child of this provider, so the four of them share one form
 * instance and one schema — which is what makes a wizard spanning four routes
 * still a single validated form.
 */
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
      <Stack>
        <Stack.Screen name="index">
          <Stack.Title style={HeaderTitleStyle}>Add a pet</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        {/* The only step whose body is a full-height list rather than a
            scroll view, so an overlaying bar would sit on top of the heading. */}
        <Stack.Screen name="breed">
          <Stack.Title style={HeaderTitleStyle}>Breed</Stack.Title>
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="feeds">
          <Stack.Title style={HeaderTitleStyle}>Add a pet</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="feed">
          <Stack.Title style={HeaderTitleStyle}>Feed</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
        <Stack.Screen name="instructions">
          <Stack.Title style={HeaderTitleStyle}>Add a pet</Stack.Title>
          <Stack.Header transparent />
          <Stack.Screen.BackButton displayMode="minimal" />
        </Stack.Screen>
      </Stack>
    </FormProvider>
  );
}
