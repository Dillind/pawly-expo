import { Stack } from 'expo-router';
import { useState } from 'react';

import HouseholdSearch from '@/components/screens/follow/household-search';

/**
 * The term lives here because `Stack.SearchBar` is a header component, and the
 * list that reads it is the screen's body.
 *
 * `onChangeText` is handed straight to `headerSearchBarOptions`, so it receives
 * a native event rather than the string the Expo docs show.
 */
export default function HouseholdSearchScreen() {
  const [term, setTerm] = useState('');

  return (
    <>
      <Stack.SearchBar
        placeholder="Name or handle"
        autoCapitalize="none"
        autoFocus
        hideWhenScrolling={false}
        // iOS 26 moves a search bar into the bottom toolbar unless told not to.
        // This screen has no toolbar, so it belongs under the title.
        allowToolbarIntegration={false}
        placement="stacked"
        onChangeText={(event) => setTerm(event.nativeEvent.text)}
        onCancelButtonPress={() => setTerm('')}
      />
      <HouseholdSearch term={term} />
    </>
  );
}
