import Constants from 'expo-constants';
import api from './api';

let registered = false;
let cachedToken: string | null = null;

export function getPushToken(): string | null {
  return cachedToken;
}

export async function registerForPushNotifications() {
  if (registered) return cachedToken;
  if (!Constants.isDevice) return null;

  // Skip in Expo Go — not supported
  if (Constants.executionEnvironment === 'storeClient') return null;

  const Notifications = await import('expo-notifications');

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    cachedToken = tokenData.data;

    await api.post('/push-tokens/register', { token: cachedToken });
    registered = true;
    return cachedToken;
  } catch (err) {
    console.log('Push token registration error:', err);
    return cachedToken;
  }
}

export async function getOrRegisterPushToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  return registerForPushNotifications();
}
