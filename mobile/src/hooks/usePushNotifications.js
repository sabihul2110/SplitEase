// SplitEase/mobile/src/hooks/usePushNotifications.js


import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import client, { getNavigationRef } from '../api/client';
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
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);
    return () => sub.remove();
  }, []);
}

// Payload shapes emitted by the backend (see routers/people.py, loans.py,
// borrows.py): entry_request/settlement_request/repayment_request all
// carry {"screen": "PendingRequests", ...id}. We route to the matching
// sub-tab instead of just opening the screen and making the person hunt.
function handleNotificationTap(response) {
  const data = response?.notification?.request?.content?.data || {};
  const nav = getNavigationRef();
  if (!nav?.isReady() || data.screen !== 'PendingRequests') return;

  const isConfirmation = !!(data.repayment_id || data.request_id);
  nav.navigate('Main', {
    screen: 'Loans',
    params: {
      screen: 'PendingRequests',
      params: {
        initialTab: 'received',
        initialSubTab: isConfirmation ? 'confirmations' : 'entries',
      },
    },
  });
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