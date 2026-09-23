import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/components/core/app-text';
import PressableOpacity from '@/components/core/pressable-opacity';
import SearchBar from '@/components/core/search-bar';
import { EMOJI_GROUPS } from '@/constants/emoji';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';

const EMOJI_CELL = 44;
const SCROLL_HEIGHT = 320;

type Props = {
  onPick: (emoji: string) => void;
};

// A Tray step, so it is shown by the tray that owns the choice. It does not
// close anything itself: the caller decides where to go once an emoji is picked.
const EmojiStep = ({ onPick }: Props) => {
  const styles = useStyles(makeStyles);
  const [term, setTerm] = useState('');
  const needle = term.trim().toLowerCase();

  const groups = EMOJI_GROUPS.map((group) => ({
    title: group.title,
    emoji: needle
      ? group.emoji.filter(
          (entry) => entry.keywords.includes(needle) || group.title.toLowerCase().includes(needle)
        )
      : group.emoji
  })).filter((group) => group.emoji.length > 0);

  return (
    <View style={styles.stack}>
      <SearchBar onSearch={setTerm} />

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <View style={styles.groups}>
          {groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <AppText
                size="captionSmall"
                fontWeight="bold"
                color="textSecondary"
                style={styles.caption}>
                {group.title.toUpperCase()}
              </AppText>

              <View style={styles.grid}>
                {group.emoji.map((entry) => (
                  <PressableOpacity
                    key={entry.char}
                    style={styles.cell}
                    accessibilityRole="button"
                    accessibilityLabel={entry.keywords}
                    onPress={() => onPick(entry.char)}>
                    <AppText size={26}>{entry.char}</AppText>
                  </PressableOpacity>
                ))}
              </View>
            </View>
          ))}

          {groups.length === 0 && (
            <AppText size="callout" color="textSecondary">
              No emoji match &ldquo;{term.trim()}&rdquo;.
            </AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = ({ spacing, colors }: AppTheme) =>
  StyleSheet.create({
    stack: {
      gap: spacing.three
    },
    scroll: {
      height: SCROLL_HEIGHT
    },
    groups: {
      gap: spacing.four,
      paddingBottom: spacing.four
    },
    group: {
      gap: spacing.two
    },
    caption: {
      letterSpacing: 0.6
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.one
    },
    cell: {
      width: EMOJI_CELL,
      height: EMOJI_CELL,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    }
  });

export default EmojiStep;
