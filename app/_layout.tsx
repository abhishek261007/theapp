import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StatusBar, StyleSheet, Text, View, Alert } from 'react-native';

import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import iconImage from '../assets/images/icon.png';
import { useColors } from '../colors';
import { registerForPushNotifications } from '../services/notifications';
import ForceUpdateOverlay from '../components/ForceUpdateOverlay';

// A simple utility to compare semver strings (e.g. '1.5.0' < '2.0.0')
function isVersionTooOld(current: string, minimum: string) {
  const c = current.split('.').map(Number);
  const m = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (m[i] || 0)) return true;
    if ((c[i] || 0) > (m[i] || 0)) return false;
  }
  return false;
}

SplashScreen.preventAutoHideAsync();

// Lazy notification setup — avoid module-level side effects in Expo Go
if (Constants.executionEnvironment !== 'storeClient') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const SPLASH_DURATION_MS = 2000;
const FADE_OUT_MS        = 400;

export default function RootLayout() {
  const C = useColors();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const { isUpdatePending } = Updates.useUpdates();

  const [needsForceUpdate, setNeedsForceUpdate] = useState(false);

  // Check if current version is older than the required minimum version from backend
  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch('https://apis.27012610.xyz/config/minimum_app_version');
        if (res.ok) {
          const data = await res.json();
          if (data && data.value) {
            const currentVersion = Constants.expoConfig?.version || '1.0.0';
            if (isVersionTooOld(currentVersion, data.value)) {
              setNeedsForceUpdate(true);
            }
          }
        }
      } catch (e) {
        // Silently fail if network is down; don't block the user unfairly
        console.warn('Failed to check minimum app version', e);
      }
    }
    checkVersion();
  }, []);

  useEffect(() => {
    if (isUpdatePending) {
      Alert.alert(
        'Update Ready',
        'A new version of the app has been downloaded silently. Would you like to apply it now?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart & Apply', onPress: () => Updates.reloadAsync() },
        ],
        { cancelable: true } // allow user to tap outside to dismiss
      );
    }
  }, [isUpdatePending]);

  useEffect(() => {
    // Hide the native splash immediately — the branded React overlay
    // replaces it for a consistent custom experience.
    SplashScreen.hideAsync();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start();
    }, SPLASH_DURATION_MS);

    if (Constants.executionEnvironment !== 'storeClient') {
      Notifications.requestPermissionsAsync().catch(() => {});
    }
    registerForPushNotifications();

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />

      {/* Full-screen branded splash overlay */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="none">
        <LinearGradient colors={[C.GRADIENT_D, C.GRADIENT_E, C.GRADIENT_F]} style={styles.splash}>
          <StatusBar barStyle="light-content" backgroundColor={C.BURGUNDY} />

          <Image
            source={iconImage}
            style={styles.logo}
            resizeMode="cover"
          />

          <Text style={styles.brand}>PM Jewellers</Text>
          <Text style={styles.tagline}>Silver · Since 2005</Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Wholesale silver market</Text>
            <Text style={styles.footerText}>Ahmedabad, Gujarat</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Renders over everything if the app version is too old */}
      {needsForceUpdate && <ForceUpdateOverlay />}
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  brand: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    letterSpacing: 2,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tagline: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Outfit_300Light',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    lineHeight: 18,
  },
});
