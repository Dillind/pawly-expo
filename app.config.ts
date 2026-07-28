import * as dotenv from 'dotenv';
import { ConfigContext, ExpoConfig } from 'expo/config';

dotenv.config();

// One EAS project, one slug, one identifier per platform. The previous
// dev/prod split renamed things without isolating anything -- .env carries a
// single EXPO_PUBLIC_SUPABASE_URL, so a "production" build talked to the same
// database as dev. Two slugs would also mean two EAS projects, two APNs keys,
// and push tokens scoped to whichever project issued them, which would force a
// project column onto push_tokens for no benefit. Dev and prod separate by
// build profile in eas.json instead.
const getConfig = ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Pawly',
    slug: 'pawly',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'pawlyapp',
    icon: './src/assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      ...config.ios,
      supportsTablet: false,
      bundleIdentifier: 'au.com.pawly.ios',
      infoPlist: {
        NSUserNotificationUsageDescription:
          '$(PRODUCT_NAME) sends reminders when you need to check in.'
      }
    },
    android: {
      package: 'au.com.pawly.android',
      // googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './src/assets/images/icon.png',
        backgroundColor: '#ffffff'
      }
    },
    web: { output: 'server' },
    plugins: [
      'expo-router',
      'expo-video',
      'expo-screen-orientation',
      'expo-splash-screen',
      'expo-status-bar',
      'expo-web-browser',
      [
        'expo-notifications',
        {
          iosDisplayInForeground: true
        }
      ],
      'expo-image',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          photosPermission: '$(PRODUCT_NAME) accesses your photos to let you share them.',
          cameraPermission: '$(PRODUCT_NAME) accesses your camera to let you take photos.'
        }
      ],
      [
        'expo-font',
        {
          fonts: [
            'node_modules/expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
            'node_modules/expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
            'node_modules/expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf',
            'node_modules/expo-google-fonts/inter/900Black/Inter_900Black.ttf'
          ]
        }
      ],
      [
        'expo-secure-store',
        {
          configureAndroidBackup: true
        }
      ]
    ],
    extra: {
      eas: {
        // BLOCKED: awaiting `bunx eas init`, which needs an interactive Expo
        // login. Until this is a real id, getExpoPushTokenAsync throws and no
        // device can register for push. This is unchanged from before -- both
        // branches of the old ternary were empty too.
        projectId: ''
      }
    }
  };
};

export default getConfig;
