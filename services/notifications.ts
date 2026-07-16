import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

const API_BASE = 'https://apis.27012610.xyz';

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Failed to get push token for push notification! Status: ' + finalStatus);
      return null;
    }

    // Getting the raw device token (FCM on Android, APNs on iOS)
    const pushTokenData = await Notifications.getDevicePushTokenAsync();
    const token = pushTokenData.data;
    
    const res = await fetch(`${API_BASE}/notifications/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        role: 'client',
        deviceInfo: Platform.OS,
      }),
    });
    
    return token;
  } catch (error: any) {
    console.error('Error in push registration:', error);
    return null;
  }
}
