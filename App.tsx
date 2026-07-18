import 'expo-router/entry';
import { ExpoRoot } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import LockScreen from './components/LockScreen';

// Prevent splash screen from auto-hiding until we decide what to show
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial lock status
    AsyncStorage.getItem('pmj_app_unlocked_v4')
      .then(value => {
        setLocked(value !== 'true');
        SplashScreen.hideAsync();
      })
      .catch(err => {
        console.error('Failed to get lock status', err);
        setLocked(true);
        SplashScreen.hideAsync();
      });
  }, []);

  const handleUnlock = async () => {
    try {
      await AsyncStorage.setItem('pmj_app_unlocked_v4', 'true');
      setLocked(false);
    } catch (e) {
      console.error('Failed to save unlock status', e);
    }
  };

  // While loading AsyncStorage, render nothing (splash screen covers this)
  if (locked === null) {
    return null;
  }

  // If locked, render ONLY the lock screen (no router exists!)
  if (locked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  // Once unlocked, mount Expo Router and provide the 'app' directory context
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
