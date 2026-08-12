import AppText from '@/components/core/app-text';
import MainButton from '@/components/core/main-button';
import TextInputValidated from '@/components/core/text-input-validated';
import ScreenScrollView from '@/components/layout/screen-scroll-view';
import ScreenView from '@/components/layout/screen-view';
import ReceivedInviteCard from '@/components/screens/household/received-invite-card';
import { joinSchema, type JoinInput } from '@/constants/schemas/invite';
import { BottomTabInset, type AppTheme } from '@/constants/theme';
import { useReceivedInvites, useRedeemInvite } from '@/hooks/queries/use-invites';
import { useStyles } from '@/hooks/use-styles';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

const JoinHousehold = () => {
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const { data: invites = [] } = useReceivedInvites();
  const { mutate: redeem, isPending: isJoining } = useRedeemInvite();

  const form = useForm<JoinInput>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: '' }
  });
  const { control, handleSubmit } = form;

  const code = useWatch({ control, name: 'code' });

  const onSubmit = handleSubmit((values) => {
    redeem(
      { code: values.code },
      {
        onSuccess: (result) => {
          if (result.status === 'joined') router.back();
        }
      }
    );
  });

  return (
    <ScreenView edges={[]}>
      <ScreenScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {invites.length > 0 && (
          <View style={styles.invites}>
            <AppText variant="header" size={18}>
              Waiting for you
            </AppText>

            {invites.map((invite) => (
              <ReceivedInviteCard key={invite.id} invite={invite} />
            ))}
          </View>
        )}

        <FormProvider {...form}>
          <View style={styles.form}>
            <AppText variant="header" size={18}>
              Have a code?
            </AppText>
            <AppText size={15} color="textSecondary">
              Enter the code an owner shared with you. You&apos;ll see that household&apos;s pets,
              feeds and posts.
            </AppText>

            <Controller
              control={control}
              name="code"
              render={({ field: { onChange } }) => (
                <TextInputValidated
                  name="code"
                  label="Invite code"
                  placeholder="ABCD2345"
                  value={code ?? ''}
                  onChangeText={(value) => onChange(value.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={8}
                  returnKeyType="done"
                />
              )}
            />

            <MainButton
              text={isJoining ? 'Joining…' : 'Join household'}
              isLoading={isJoining}
              isDisabled={isJoining}
              onPress={() => void onSubmit()}
            />
          </View>
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
      gap: spacing.five
    },
    invites: { gap: spacing.three },
    form: { gap: spacing.three }
  });

export default JoinHousehold;
