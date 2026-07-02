import 'dotenv/config';
import { ConfigContext, ExpoConfig } from 'expo/config';

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
      supportsTablet: true,
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
      [
        'expo-notifications',
        {
          iosDisplayInForeground: true
        }
      ],
      'expo-font',
      'expo-image',
      [
        'expo-image-picker',
        {
          photosPermission: '$(PRODUCT_NAME) accesses your photos to let you share them.',
          cameraPermission: '$(PRODUCT_NAME) accesses your camera to let you take photos.'
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
