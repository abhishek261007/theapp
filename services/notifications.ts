import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { PermissionsAndroid, Platform } from 'react-native';

const PUSH_TOKEN_KEY = '@pmj_push_token';
const CHANNEL_ID = 'default-notifications';
const API_BASE_URL = 'https://apis.27012610.xyz';

let initialized = false;
let cachedPushToken: string | null = null;

async function ensurePermission() {
  if (Platform.OS !== 'android') {
    const result = await Notifications.requestPermissionsAsync();
    console.log('PUSH PERMISSION STATUS', result.status);
    return;
  }

  if (Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      'android.permission.POST_NOTIFICATIONS' as any,
      {
        title: 'PM Jewellers',
        message: 'Allow notifications to receive inquiry updates.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    console.log('PUSH PERMISSION STATUS', result);
    if (result !== 'granted') {
      /* permission denied — silent */
    }
  } else {
    console.log('PUSH PERMISSION STATUS', 'granted-by-default');
  }
}

async function init() {
  if (initialized) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  await ensurePermission();
}

export function getPushToken(): string | null {
  return cachedPushToken;
}

export async function registerForPushNotifications(force = false): Promise<string | null> {
  console.log('PUSH REGISTRATION START', { force, platform: Platform.OS, version: Platform.Version });
  await init();

  const existing = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (existing && !force) {
    console.log('PUSH TOKEN CACHED', existing);
    const response = await fetch(`${API_BASE_URL}/push-tokens/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: existing }),
    });
    const responseText = await response.text();
    console.log('PUSH TOKEN REGISTER RESPONSE', response.status, responseText);
    if (!response.ok) {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      return registerForPushNotifications(true);
    }
    cachedPushToken = existing;
    return existing;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    console.log('PUSH PROJECT ID', projectId || 'missing');
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenResponse.data;
    console.log('EXPO PUSH TOKEN', token);

    const response = await fetch(`${API_BASE_URL}/push-tokens/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const responseText = await response.text();
    console.log('PUSH TOKEN REGISTER RESPONSE', response.status, responseText);
    if (!response.ok) throw new Error(responseText || 'Failed to register push token');

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    cachedPushToken = token;
    return token;
  } catch (err) {
    console.log('PUSH REGISTRATION ERROR', err);
    return null;
  }
}

export async function getOrRegisterPushToken(): Promise<string | null> {
  return registerForPushNotifications();
}
