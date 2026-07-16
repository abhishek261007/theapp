import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { registerForPushNotifications } from '../services/notifications';
import { CustomSplashScreen } from '../components/CustomSplashScreen';

SplashScreen.preventAutoHideAsync();


// Lazy notification setup — avoid module-level side effects in Expo Go
if (Constants.executionEnvironment !== 'storeClient') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function RootLayout() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    if (Constants.executionEnvironment !== 'storeClient') {
      Notifications.requestPermissionsAsync().catch(() => {});
    }
    registerForPushNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />

        {/* Custom Animated Splash Screen bridges the native launch */}
        {isSplashVisible && <CustomSplashScreen onComplete={() => setIsSplashVisible(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
