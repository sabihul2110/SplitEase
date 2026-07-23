// SplitEase/mobile/app.config.js

const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'SplitEase Dev' : 'SplitEase',
    slug: 'splitease',
    version: '1.1.0',
    orientation: 'portrait',
    icon: IS_DEV ? './assets/icon-dev.png' : './assets/icon.png',
    userInterfaceStyle: 'dark',
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.splitease.app.dev' : 'com.splitease.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0d0e14'
      },
      package: IS_DEV ? 'com.splitease.app.dev' : 'com.splitease.app',
      googleServicesFile: IS_DEV ? './google-services.dev.json' : './google-services.json',
      softwareKeyboardLayoutMode: 'pan'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      './withAutofillFix.js',
      'expo-build-properties',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#0a0b0f',
          image: './assets/splash-icon.png',
          resizeMode: 'contain'
        }
      ],
      'expo-sharing',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#2563eb',
          defaultChannel: 'default'
        }
      ]
    ],
    runtimeVersion: {
      policy: 'appVersion'
    },
    updates: {
      url: 'https://u.expo.dev/65d9e537-7893-4341-a5d7-5531ef671f7e'
    },
    extra: {
      eas: {
        projectId: '65d9e537-7893-4341-a5d7-5531ef671f7e'
      }
    },
    owner: 'spliteaseapp'
  }
};