import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import iconImage from '../assets/images/icon.png';
import { useColors } from '../colors';
import { registerForPushNotifications } from '../services/notifications';
import useAuthStore from '../store/authStore';

SplashScreen.preventAutoHideAsync();

async function setupNotificationHandler() {
  if (Constants.executionEnvironment === 'storeClient') return;
  const Notifications = await import('expo-notifications');
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
const PROMPT_DELAY_MS    = 5 * 60 * 1000; // 5 minutes

const PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours before re-prompting

function RegistrationPrompt() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const hasRegistered = useAuthStore((s) => s.hasRegistered);
  const promptDismissedAt = useAuthStore((s) => s.promptDismissedAt);
  const dismissPrompt = useAuthStore((s) => s.dismissPrompt);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasRegistered) return;
    if (promptDismissedAt && Date.now() - promptDismissedAt < PROMPT_COOLDOWN_MS) return;

    const timer = setTimeout(() => {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [hasRegistered, promptDismissedAt, slideAnim]);

  const handleDismiss = useCallback(() => {
    dismissPrompt();
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [slideAnim, dismissPrompt]);

  const handleRegister = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      router.push('/register');
    });
  }, [slideAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.promptContainer,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [200, 0],
            }),
          }],
        },
      ]}
    >
      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promptGradient}
      >
        <View style={styles.promptContent}>
          <Text style={styles.promptTitle}>Stay Connected</Text>
          <Text style={styles.promptBody}>
            Register to receive order updates, exclusive offers, and faster checkouts.
          </Text>
          <View style={styles.promptActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRegister}
              style={[styles.promptPrimary, { backgroundColor: '#FFFFFF' }]}
            >
              <Text style={[styles.promptPrimaryText, { color: C.BURGUNDY }]}>
                Register Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDismiss}
              style={styles.promptSecondary}
            >
              <Text style={styles.promptSecondaryText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function RootLayout() {
  const C = useColors();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => setSplashDone(true));
    }, SPLASH_DURATION_MS);

    setupNotificationHandler().catch(() => {});
    registerForPushNotifications();

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />

        {/* Registration prompt — slides up after 5 minutes */}
        <RegistrationPrompt />

        {/* Full-screen branded splash overlay — hidden after fade so touches pass through */}
        {!splashDone && (
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <LinearGradient colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]} style={styles.splash}>
              <StatusBar barStyle="light-content" backgroundColor={C.BURGUNDY} />
            <Image
              source={iconImage}
              style={styles.logo}
              resizeMode="contain"
            />
              <Text style={styles.brand}>PM Jewellers</Text>
              <Text style={styles.tagline}>Silver · Since 2005</Text>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Wholesale silver market</Text>
                <Text style={styles.footerText}>Ahmedabad, Gujarat</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
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

  /* Registration prompt */
  promptContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  promptGradient: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  promptContent: {
    padding: 20,
  },
  promptTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  promptBody: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 16,
  },
  promptActions: {
    flexDirection: 'row',
    gap: 10,
  },
  promptPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  promptPrimaryText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  promptSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptSecondaryText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
