import { useTheme } from '@/hooks/use-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const theme = useTheme();

  return (
    // `minimizeBehavior` is deliberately absent: a minimising tab bar changes
    // height, and the floating ActionPopover has to sit above it at a fixed
    // offset because native tabs expose no way to read that height.
    <NativeTabs disableTransparentOnScrollEdge={true} tintColor={theme.colors.primary}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'house.fill'} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'list.bullet'} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'person.fill'} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
