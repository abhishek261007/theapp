import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '../colors';
import Constants from 'expo-constants';

export default function ForceUpdateOverlay() {
  const C = useColors();

  const handleUpdatePress = () => {
    // You can also fetch the exact App Store ID or Play Store ID from your config or backend
    if (Platform.OS === 'android') {
      const androidPackage = Constants.expoConfig?.android?.package || 'com.abhishek261007.pmj';
      Linking.openURL(`market://details?id=${androidPackage}`).catch(() => {
        Linking.openURL(`https://play.google.com/store/apps/details?id=${androidPackage}`);
      });
    } else {
      // Replace 'idXXXXXXXXX' with your actual Apple App Store ID when you have one
      Linking.openURL(`itms-apps://itunes.apple.com/app/id1234567890`).catch(() => {
         // Fallback URL or alert if needed
      });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[C.GRADIENT_D, C.GRADIENT_E, C.GRADIENT_F]} style={styles.background}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: C.PAPER }]}>Update Required</Text>
          <Text style={[styles.subtitle, { color: C.TINT }]}>
            You are using an older version of PM Jewellers that is no longer supported. 
            Please update to the latest version to continue enjoying our services.
          </Text>

          <TouchableOpacity style={[styles.button, { backgroundColor: C.GOLD }]} onPress={handleUpdatePress}>
            <Text style={[styles.buttonText, { color: C.NAVY_DEEP }]}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999, // Ensure it covers everything including navigation headers
    elevation: 99999,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slight dark panel behind text
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.9,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
