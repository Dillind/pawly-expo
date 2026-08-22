import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { COMMENT_MAX_LENGTH } from '@/services/comment.service';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

type Props = {
  /** Set while a reply is being written. Null composes a top-level comment. */
  replyingToName: string | null;
  isSending: boolean;
  onCancelReply: () => void;
  onSend: (body: string) => void;
};

/**
 * Pet-flavoured rather than generic. Hevy's bar is barbells and biceps because
 * that is what its members are reacting to; ours is the vocabulary of a
 * household talking about an animal.
 *
 * The bar exists for the member who reads everything and writes nothing. One
 * tap is a low enough price that they actually pay it, and a thread with two
 * emoji in it is a thread, where a thread with none is a broadcast.
 */
const QUICK_EMOJI = ['🐶', '❤️', '🔥', '😂', '🥺', '🎉', '🦴'] as const;

const SEND_ICON = 18;

const CommentComposer = ({ replyingToName, isSending, onCancelReply, onSend }: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [body, setBody] = useState('');

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !isSending;

  const send = () => {
    if (!canSend) return;

    hapticLight();
    onSend(trimmed);
    setBody('');
  };

  const cancelReply = () => {
    onCancelReply();
    setBody('');
  };

  return (
    <View style={styles.composer}>
      {replyingToName && (
        <View style={styles.replyBar}>
          <AppText size={13} color="textSecondary" numberOfLines={1} style={styles.replyLabel}>
            {`Replying to ${replyingToName}`}
          </AppText>
          <PressableOpacity
            onPress={cancelReply}
            accessibilityRole="button"
            accessibilityLabel="Stop replying"
            style={styles.cancelTarget}>
            <Icon name="close" size={16} color="textSecondary" />
          </PressableOpacity>
        </View>
      )}

      {/* Horizontal rather than wrapped: the row must stay one line tall so the
          input does not move as the keyboard opens. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.emojiRow}>
        {QUICK_EMOJI.map((emoji) => (
          <PressableOpacity
            key={emoji}
            onPress={() => {
              hapticLight();
              setBody((current) => current + emoji);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${emoji}`}
            style={styles.emojiTarget}>
            <AppText size={22}>{emoji}</AppText>
          </PressableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder={replyingToName ? `Reply to ${replyingToName}…` : 'Add a comment…'}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={COMMENT_MAX_LENGTH}
          // The send button is the only way out. `submit` on a multiline field
          // inserts a newline on iOS, which is what a comment of two sentences
          // needs.
          accessibilityLabel="Write a comment"
        />

        <PressableOpacity
          style={[styles.sendButton, !canSend && styles.sendDisabled]}
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          accessibilityState={{ disabled: !canSend }}>
          <Icon name="caretUp" size={SEND_ICON} color="onPrimary" strokeWidth={2.5} />
        </PressableOpacity>
      </View>
    </View>
  );
};

const SEND_SIZE = 36;
const INPUT_MIN_HEIGHT = 38;
/** Four lines before it stops growing and scrolls -- past that it eats the thread. */
const INPUT_MAX_HEIGHT = 110;

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    composer: {
      paddingHorizontal: spacing.three,
      paddingTop: spacing.two,
      paddingBottom: spacing.two,
      gap: spacing.two,
      backgroundColor: colors.postSurface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border
    },
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two,
      paddingVertical: spacing.one,
      paddingHorizontal: spacing.two,
      borderRadius: Radius.tile,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow
    },
    replyLabel: {
      flex: 1
    },
    cancelTarget: {
      padding: spacing.one
    },
    emojiRow: {
      gap: spacing.one,
      paddingRight: spacing.three
    },
    emojiTarget: {
      paddingHorizontal: spacing.two,
      paddingVertical: spacing.half
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.two
    },
    input: {
      flex: 1,
      minHeight: INPUT_MIN_HEIGHT,
      maxHeight: INPUT_MAX_HEIGHT,
      paddingHorizontal: spacing.three,
      paddingTop: spacing.two,
      paddingBottom: spacing.two,
      borderRadius: Radius.card,
      borderCurve: 'continuous',
      backgroundColor: colors.backgroundSheetRow,
      color: colors.text,
      fontSize: 15
    },
    sendButton: {
      width: SEND_SIZE,
      height: SEND_SIZE,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary
    },
    sendDisabled: {
      opacity: 0.4
    }
  });

export default CommentComposer;
