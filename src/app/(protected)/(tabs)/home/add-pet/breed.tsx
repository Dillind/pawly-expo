import { useRouter } from 'expo-router';
import { useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import ScreenView from '@/components/layout/screen-view';
import BreedPicker from '@/components/ui/breed-picker';
import { breedSpeciesFor } from '@/constants/breeds';
import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

// Pushed inside the modal, not raised as a sheet — a sheet on a modal is two
// modals.
const BreedStep = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { control, setValue } = useFormContext<AddPetFormValues>();
  const petName = useWatch({ control, name: 'name' });
  const petType = useWatch({ control, name: 'petType' });
  const breedId = useWatch({ control, name: 'breedId' });

  const species = breedSpeciesFor(petType);

  // The field that opens this screen is not drawn for `other`, so reaching it
  // means the type changed underneath. Send them back rather than guess.
  if (!species) {
    router.back();
    return null;
  }

  return (
    <ScreenView edges={[]}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <AppText variant="header" size={28}>
            {petName ? `What breed is ${petName}?` : 'What breed are they?'}
          </AppText>
          <AppText size={15} color="textSecondary">
            {species === 'dog'
              ? 'Dogs, because that is the pet type. Not knowing is a real answer.'
              : 'Cats, because that is the pet type. Not knowing is a real answer.'}
          </AppText>
        </View>

        <BreedPicker
          species={species}
          value={breedId}
          onChange={(selectedBreedId) => {
            setValue('breedId', selectedBreedId, { shouldDirty: true, shouldValidate: true });
            router.back();
          }}
        />
      </View>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: {
      flex: 1,
      gap: spacing.three,
      paddingHorizontal: spacing.four,
      paddingTop: spacing.three,
      paddingBottom: BottomTabInset
    },
    intro: {
      gap: spacing.one
    }
  });

export default BreedStep;
