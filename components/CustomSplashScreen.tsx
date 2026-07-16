import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Image, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';

export function CustomSplashScreen({ onComplete }: { onComplete: () => void }) {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native static splash screen immediately so our custom one takes over
    SplashScreen.hideAsync().catch(() => {});

    // Luxurious transition sequence
    Animated.sequence([
      Animated.delay(600), // Hold perfectly still for a beat
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.94, // Subtle scale down
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 800,
          delay: 200, // Let scale start slightly before fading
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ]).start(() => {
      onComplete(); // Tell root layout we're done so it can unmount us
    });
  }, [opacityAnim, scaleAnim, onComplete]);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]} pointerEvents="none">
      <LinearGradient
        colors={['#FFFFFF', '#F5F4F2', '#E8E5DF']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.imageWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.estText}>Est. 2005 · Ahmedabad</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  estText: {
    fontFamily: 'Helvetica',
    fontWeight: '400',
    fontSize: 12,
    letterSpacing: 2,
    color: '#8C7355', // Nice gold/brown accent
    textTransform: 'uppercase',
  }
});
