import SheetRow from '@/components/bottom-sheets/sheet-row';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { PET_TYPE_OPTIONS } from '@/constants/options';
import type { AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import useAddPetStore from '@/stores/add-pet-store';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

/**
 * Pushed inside the modal rather than raised as a sheet — a sheet on a modal is
 * two modals. The rows are the same SheetRow either way, so editing this later
 * from the pet screen can present the identical content in a sheet.
 */
const PetTypeStep = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();
  const { petType, setPetType } = useAddPetStore();

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <View style={styles.rows}>
          {PET_TYPE_OPTIONS.map((option) => (
            <SheetRow
              key={option.value}
              label={option.label}
              isSelected={option.value === petType}
              onPress={() => {
                setPetType(option.value);
                router.back();
              }}
            />
          ))}
        </View>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    content: { paddingTop: spacing.three },
    rows: { gap: spacing.two }
  });

export default PetTypeStep;
