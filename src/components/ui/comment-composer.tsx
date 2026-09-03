import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import PressableOpacity from '@/components/core/pressable-opacity';
import { BottomTabInset, Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { COMMENT_MAX_LENGTH } from '@/services/comment.service';

type Props = {
  replyingToName: string | null;
  isSending: boolean;
  /** Bumped by the caller once a comment lands; that is what clears the draft. */
  sentCount: number;
  onCancelReply: () => void;
  onSend: (body: string) => void;
};

const QUICK_EMOJI = ['🐶', '❤️', '🔥', '😂', '🥺', '🎉', '🦴'] as const;

const SEND_ICON = 18;

const CommentComposer = ({
  replyingToName,
  isSending,
  sentCount,
  onCancelReply,
  onSend
}: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [body, setBody] = useState('');
  const lastSent = useRef(sentCount);

  useEffect(() => {
    if (sentCount === lastSent.current) return;

    lastSent.current = sentCount;
    setBody('');
  }, [sentCount]);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !isSending;

  // Deliberately does not clear: a failed post must keep what was typed.
  const send = () => {
    if (!canSend) return;

    hapticLight();
    onSend(trimmed);
  };

  return (
    <View style={styles.composer}>
      {replyingToName && (
        <View style={styles.replyBar}>
          {/* The same sentence the placeholder uses. Two wordings for one
              state read as two different states. The name carries the gold so
              the bar answers "who", not merely "you are replying". */}
          <AppText size={13} color="textSecondary" numberOfLines={1} style={styles.replyLabel}>
            Reply to{' '}
            <AppText size={13} color="primaryText" fontWeight="bold">
              {replyingToName}
            </AppText>
          </AppText>
          <PressableOpacity
            onPress={onCancelReply}
            accessibilityRole="button"
            accessibilityLabel={`Stop replying to ${replyingToName}`}
            style={styles.cancelTarget}>
            <Icon name="close" size={16} color="textSecondary" />
          </PressableOpacity>
        </View>
      )}

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
const INPUT_MAX_HEIGHT = 110;

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    composer: {
      paddingHorizontal: spacing.three,
      paddingTop: spacing.two,
      paddingBottom: BottomTabInset,
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
