import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import HouseholdSearch from '@/components/screens/follow/household-search';

// A push inside the tab, not the modal `follow` group: search is a place to
// browse. `onChangeText` goes straight to `headerSearchBarOptions`, so it
// receives a native event rather than the string the Expo docs show.
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
