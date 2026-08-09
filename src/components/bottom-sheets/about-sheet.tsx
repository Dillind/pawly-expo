import BaseSheet from '@/components/bottom-sheets/base-sheet';
import AppText from '@/components/core/app-text';
import Icon from '@/components/core/icon';
import SettingsRow from '@/components/core/settings-row';
import SettingsSection from '@/components/core/settings-section';
import { Radius, type AppTheme } from '@/constants/theme';
import { useStyles } from '@/hooks/use-styles';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import Constants from 'expo-constants';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  sheetRef: RefObject<TrueSheet | null>;
};

// Placeholder copy, to be replaced in Dylan's own voice.
const STORY = [
  "Hi, I'm Dylan.",
  'I built Crumpet after we got a puppy. My partner and I were both feeding him, and neither of us could ever remember whether the other already had. So he got fed twice, or he got fed late while we each assumed it was covered.',
  'Crumpet is the answer to that: everyone in the household logs the feed, everyone can see it, and nobody has to send a text asking.',
  'Thanks for trying it. If something is broken or missing, please tell me — Contact Support goes straight to my inbox.'
];

const AboutSheet = ({ sheetRef }: Props) => {
  const styles = useStyles(makeStyles);
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <BaseSheet sheetRef={sheetRef} detents={['auto', 0.9]} scrollable>
      <View style={styles.portraits}>
        <View style={styles.portrait}>
          <Icon name="user" size={28} color="textSecondary" />
        </View>
        <View style={[styles.portrait, styles.portraitOverlap]}>
          <Icon name="pawPrint" size={28} color="textSecondary" />
        </View>
      </View>

      <View style={styles.story}>
        {STORY.map((paragraph) => (
          <AppText key={paragraph} size={15}>
            {paragraph}
          </AppText>
        ))}
      </View>

      <SettingsSection>
        <SettingsRow icon="shield" label="Privacy Policy" isSoon />
        <SettingsRow icon="fileText" label="Terms of Use" isSoon />
      </SettingsSection>

      <AppText size={13} color="textSecondary" align="center">
        Version {version}
      </AppText>
    </BaseSheet>
  );
};

const makeStyles = ({ colors, spacing }: AppTheme) =>
  StyleSheet.create({
    portraits: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingTop: spacing.two
    },
    portrait: {
      width: 84,
      height: 84,
      borderRadius: Radius.full,
      backgroundColor: colors.backgroundSelected,
      alignItems: 'center',
      justifyContent: 'center'
    },
    portraitOverlap: {
      marginLeft: -spacing.four,
      borderWidth: 3,
      borderColor: colors.background
    },
    story: {
      gap: spacing.three
    }
  });

export default AboutSheet;
