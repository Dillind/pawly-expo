import * as dotenv from 'dotenv';
import { ConfigContext, ExpoConfig } from 'expo/config';

dotenv.config();

const getConfig = ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Crumpet',
    slug: 'crumpet',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'crumpetapp',
    icon: './assets/images/icon.png',
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
        foregroundImage: './assets/images/icon.png',
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
          defaultChannel: 'default'
        }
      ],
      'expo-image',
      'expo-sharing',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          photosPermission:
            '$(PRODUCT_NAME) accesses your photos so you can set a picture of your pet.',
          cameraPermission:
            '$(PRODUCT_NAME) uses your camera so you can take a picture of your pet.'
        }
      ],
      [
        'expo-font',
        {
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
      ],
      'expo-apple-authentication',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.290371852262-tc81q69o0vhscfa7fn19vocaukvgpklu'
        }
      ]
    ],
    extra: {
      eas: {
        projectId: '3bd7aa83-b1be-43b3-97c2-a3b7d2a7f51c'
      },
      googleSignIn: {
        iosClientId: '290371852262-tc81q69o0vhscfa7fn19vocaukvgpklu.apps.googleusercontent.com',
        webClientId: '290371852262-9okvebu78ht8q3pv02vrp46sio4anoud.apps.googleusercontent.com'
      }
    }
  };
};

export default getConfig;
