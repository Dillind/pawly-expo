import { useTheme } from '@/hooks/use-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      disableTransparentOnScrollEdge={true}
      tintColor={theme.colors.textSecondary}
      minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'house.fill'} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'person.fill'} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
