import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import HouseholdSearch from '@/components/screens/follow/household-search';

/**
 * A push inside the Posts tab, not a screen in the `follow` group. That group is
 * presented modally because a follow link is a question to answer; search is a
 * place to browse, so it keeps the tab bar and a real back button.
 *
 * The term lives here because `Stack.SearchBar` is a header component, and the
 * list that reads it is the screen's body.
 *
 * `onChangeText` is handed straight to `headerSearchBarOptions`, so it receives
 * a native event rather than the string the Expo docs show.
 */
export default function FindHouseholdScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<SearchBarCommands>(null);

  return (
    <>
      <Stack.SearchBar
        ref={searchRef}
        placeholder="Name or handle"
        autoCapitalize="none"
        autoFocus
        hideWhenScrolling={false}
        allowToolbarIntegration={false}
        onChangeText={(event) => setSearchTerm(event.nativeEvent.text)}
        onCancelButtonPress={() => setSearchTerm('')}
      />
      <HouseholdSearch term={searchTerm} />
    </>
  );
}
