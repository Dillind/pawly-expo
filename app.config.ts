import * as dotenv from 'dotenv';
import { ConfigContext, ExpoConfig } from 'expo/config';

dotenv.config();

const getConfig = ({ config }: ConfigContext): ExpoConfig => {
  // Read environment variable, default to development
  const APP_ENV = process.env.EXPO_PUBLIC_NODE_ENV || 'development';
  const isProd = APP_ENV === 'production';
  const appName = isProd ? 'pawly' : 'pawly-dev';
  const appSlug = isProd ? 'pawly' : 'pawly-dev';

  return {
    ...config,
    name: appName,
    slug: appSlug,
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'pawlyapp',
    icon: './src/assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      ...config.ios,
      supportsTablet: false,
      bundleIdentifier: isProd ? 'au.com.pawly.ios' : 'au.com.pawly.dev',
      infoPlist: {
        NSUserNotificationUsageDescription:
          '$(PRODUCT_NAME) sends reminders when you need to check in.'
      }
    },
    android: {
      package: isProd ? 'au.com.pawly.android' : 'au.com.pawly.dev',
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
      [
        'expo-notifications',
        {
          iosDisplayInForeground: true
        }
      ],
      'expo-image',
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
        projectId: isProd ? '' : ''
      }
    }
  };
};

export default getConfig;
