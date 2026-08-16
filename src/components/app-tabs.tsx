import { useHouseholds } from '@/hooks/queries/household/use-households';
import { useUnseenByHousehold } from '@/hooks/queries/posts/use-posts';
import { useTheme } from '@/hooks/use-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const theme = useTheme();

  const { data: households = [] } = useHouseholds();
  // Across every household, not just the active one -- otherwise posts in the
  // others stay invisible until the user happens to switch.
  const { hasAny: hasUnseenPosts } = useUnseenByHousehold(
    households.map((household) => household.id)
  );

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge={true}
      tintColor={theme.colors.primary}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'house.fill'} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="household">
        <NativeTabs.Trigger.Label>Posts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'photo.on.rectangle'} />
        <NativeTabs.Trigger.Badge hidden={!hasUnseenPosts} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'person.fill'} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
