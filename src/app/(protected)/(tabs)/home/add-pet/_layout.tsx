import { EVERY_DAY } from '@/lib/form/pet-schemas';
import { addPetSchema, type AddPetFormValues } from '@/constants/schemas/add-pet';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';

const DEFAULT_FEED_TIMES: AddPetFormValues['feedTimes'] = [
  { label: 'morning', localTime: '07:00', daysOfWeek: [...EVERY_DAY], instructions: null },
  { label: 'dinner', localTime: '17:00', daysOfWeek: [...EVERY_DAY], instructions: null }
];

/**
 * A nested stack inside the modal, so each step pushes rather than presenting.
 * A sheet raised from a modal is two modals, which Apple's modality guidance
 * and AGENTS.md both reject — so the pet-type and feed editors are screens here.
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
      breed: '',
      photoUri: null,
      feedTimes: DEFAULT_FEED_TIMES
    }
  });

  return (
    <FormProvider {...form}>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerTitle: 'Add a pet' }} />
        <Stack.Screen
          name="pet-type"
          options={{ headerTitle: 'Pet type', headerBackTitle: 'Details' }}
        />
        <Stack.Screen
          name="feeds"
          options={{ headerTitle: 'Add a pet', headerBackTitle: 'Details' }}
        />
        <Stack.Screen name="feed" options={{ headerTitle: 'Feed', headerBackTitle: 'Feeds' }} />
        <Stack.Screen
          name="instructions"
          options={{ headerTitle: 'Add a pet', headerBackTitle: 'Feeds' }}
        />
      </Stack>
    </FormProvider>
  );
}
