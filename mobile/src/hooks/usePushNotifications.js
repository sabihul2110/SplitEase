// SplitEase/mobile/src/hooks/usePushNotifications.js


import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import client from '../api/client';
import { ENDPOINTS } from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

export function usePushNotifications() {
  useEffect(() => {
    registerForPush();
  }, []);
}

async function registerForPush() {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'default',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#2563eb',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      // projectId: '7644269a-572f-4859-adfa-294444863d68', // sabihul2110
      projectId: '65d9e537-7893-4341-a5d7-5531ef671f7e', // splitease acc.
    });
    const token = tokenData.data;
    await client.post(ENDPOINTS.pushToken, { token });
  } catch (err) {
    console.log('Push token registration failed:', err?.message);
  }
}