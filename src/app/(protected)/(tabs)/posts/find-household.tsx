import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { SearchBarCommands } from 'react-native-screens';

import HouseholdSearch from '@/components/screens/follow/household-search';

// The push has to finish before UIKit will make the field first responder.
const FOCUS_DELAY_MS = 450;

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
  const [term, setTerm] = useState('');
  const searchRef = useRef<SearchBarCommands>(null);

  // `autoFocus` is ignored on its own, so the field is focused by hand once the
  // screen settles. Both are kept: the prop costs nothing and states the intent.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => searchRef.current?.focus(), FOCUS_DELAY_MS);

      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <>
      <Stack.SearchBar
        ref={searchRef}
        placeholder="Name or handle"
        autoCapitalize="none"
        autoFocus
        hideWhenScrolling={false}
        // iOS 26 moves a search bar into the bottom toolbar unless told not to.
        // This screen has no toolbar, so it belongs under the title.
        //
        // `placement` is deliberately absent. Setting it to any value -- even
        // "stacked", where the bar already renders -- makes iOS refuse focus,
        // so the screen opens with the keyboard down and nothing in the logs.
        allowToolbarIntegration={false}
        onChangeText={(event) => setTerm(event.nativeEvent.text)}
        onCancelButtonPress={() => setTerm('')}
      />
      <HouseholdSearch term={term} />
    </>
  );
}
