import { useHousehold } from '@/hooks/queries/use-household';
import { useHasUnseenPosts } from '@/hooks/queries/use-posts';
import { useTheme } from '@/hooks/use-theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function AppTabs() {
  const theme = useTheme();

  const { data: household } = useHousehold();
  const { data: hasUnseenPosts } = useHasUnseenPosts(household?.id);

  return (
    <NativeTabs disableTransparentOnScrollEdge={true} tintColor={theme.colors.primary}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'house.fill'} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="household">
        <NativeTabs.Trigger.Label>Household</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'photo.on.rectangle'} />
        {/* Empty Badge renders a plain dot rather than a count. A number on a
            photo stream creates an obligation to clear it; a dot just says
            there is something new. */}
        {hasUnseenPosts && <NativeTabs.Trigger.Badge />}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={'person.fill'} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
