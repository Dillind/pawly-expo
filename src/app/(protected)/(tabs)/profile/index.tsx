import MainButton from '@/components/core/main-button';
import { useLogout } from '@/hooks/use-logout';
import { StyleSheet, Text, View } from 'react-native';

const Index = () => {
  const { logout, isLoading } = useLogout();

  return (
    <View style={styles.container}>
      <Text>Profile</Text>
      <MainButton
        text="Sign out"
        variant="secondary"
        isLoading={isLoading}
        isDisabled={isLoading}
        onPress={() => void logout()}
      />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
