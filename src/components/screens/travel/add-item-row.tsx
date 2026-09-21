import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import Icon from '@/components/core/icon';
import { CHECKLIST_ITEM_MAX } from '@/constants/schemas/travel';
import { Fonts, IconSize, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  onAdd: (text: string) => void;
};

// Inline, and Return keeps the keyboard up for the next one: a twelve-item
// list is typed in one go, the way Reminders and Notes do it.
const AddItemRow = ({ onAdd }: Props) => {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const submit = () => {
    const next = text.trim();
    if (!next) return;
    onAdd(next);
    setText('');
  };

  return (
    <View style={styles.row}>
      <View style={styles.plus}>
        <Icon name="plus" size={IconSize.action} color="textSecondary" />
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        placeholder="Add an item"
        placeholderTextColor={colors.textSecondary}
        maxLength={CHECKLIST_ITEM_MAX}
        blurOnSubmit={false}
        returnKeyType="next"
        accessibilityLabel="Add an item"
        style={[styles.input, { color: colors.text }]}
      />
    </View>
  );
};

const makeStyles = ({ spacing }: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.two + spacing.one,
      minHeight: 52,
      paddingHorizontal: spacing.three
    },
    plus: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -spacing.two
    },
    input: {
      flex: 1,
      minHeight: 44,
      fontSize: 16,
      fontFamily: Fonts.regular,
      paddingVertical: 0
    }
  });

export default AddItemRow;
