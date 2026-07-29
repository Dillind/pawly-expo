import * as dotenv from 'dotenv';
import { ConfigContext, ExpoConfig } from 'expo/config';

dotenv.config();

// One EAS project, one slug, one identifier per platform. Two slugs would mean
// two EAS projects, two APNs keys, and push tokens scoped to whichever project
// issued them -- forcing a project column onto push_tokens for no benefit. Dev
// and prod separate by build profile in eas.json instead.
const getConfig = ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Crumpet',
    slug: 'crumpet',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'crumpetapp',
    icon: './src/assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      ...config.ios,
      supportsTablet: false,
      bundleIdentifier: 'au.com.crumpet.ios',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSUserNotificationUsageDescription:
          '$(PRODUCT_NAME) sends reminders when you need to check in.'
      }
    },
    android: {
      package: 'au.com.crumpet.android',
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
          // Routes FCMv1 messages to the channel created in
          // push-token.service.ts. The plugin cannot create the channel or set
          // its importance -- it only names which one to deliver to, so the two
          // ids have to stay in step.
          defaultChannel: 'default'
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
          // The package is scoped -- '@expo-google-fonts/inter'. Without the
          // leading @ these resolve to nothing and prebuild fails outright.
          fonts: [
            'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf',
            'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf',
            'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf',
            'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf',
            'node_modules/@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf',
            'node_modules/@expo-google-fonts/inter/900Black/Inter_900Black.ttf'
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
        projectId: '3bd7aa83-b1be-43b3-97c2-a3b7d2a7f51c'
      }
    }
  };
};

export default getConfig;
