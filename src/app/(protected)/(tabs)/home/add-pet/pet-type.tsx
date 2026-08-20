import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import { PET_TYPE_OPTIONS } from '@/constants/options';
import type { AddPetFormValues } from '@/constants/schemas/add-pet';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useRouter } from 'expo-router';
import { useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

/**
 * Pushed inside the modal rather than raised as a sheet — a sheet on a modal is
 * two modals.
 *
 * Cards on `backgroundElement`, not SheetRow. SheetRow fills with
 * `backgroundSheetRow`, which is the screen background in light mode — the rows
 * lost their fill entirely and read as plain labels rather than as something
 * tappable. That token only contrasts inside a sheet.
 */
const PetTypeStep = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { control, setValue } = useFormContext<AddPetFormValues>();
  const petType = useWatch({ control, name: 'petType' });

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <View style={styles.rows}>
          {PET_TYPE_OPTIONS.map((option) => {
            const isSelected = option.value === petType;

            return (
              <PressableOpacity
                key={option.value}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setValue('petType', option.value, {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                  router.back();
                }}>
                <AppText size={16} style={styles.label}>
                  {option.label}
                </AppText>

                {isSelected && <Icon name="check" size={18} color="primary" />}
              </PressableOpacity>
            );
          })}
        </View>
      </ScreenScrollView>
    </ScreenView>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    content: { paddingTop: spacing.three },
    rows: { gap: spacing.two },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
      padding: spacing.three,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundElement
    },
    label: { flex: 1 }
  });

export default PetTypeStep;
