import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useColors } from '../../colors';
import { ShimmerBar } from '../ui/ShimmerBar';
import { Feather } from '@expo/vector-icons';

export interface CatalogHeaderProps {
  name: string;
  cartCount: number;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}

export function CatalogHeader({
  name,
  cartCount,
  cartIconRef,
  cartScaleAnim,
  badgeScaleAnim,
}: CatalogHeaderProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const s = createHeaderStyles(C);

  return (
    <LinearGradient
      colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.headerBlock, { marginTop: insets.top + 12 }]}
    >
      <View style={s.headerInner}>
        <TouchableOpacity
          onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
          activeOpacity={0.8}
          style={s.backBtn}
        >
          <Text style={s.backGlyph}>←</Text>
        </TouchableOpacity>

        <View style={s.headerTitleWrap}>
          <Text
            style={s.mainTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {name}
          </Text>
          <View style={s.shimmerClip} pointerEvents="none">
            <ShimmerBar />
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: cartScaleAnim }] }}>
          <TouchableOpacity
            ref={cartIconRef}
            onPress={() => router.push('/cart')}
            activeOpacity={0.8}
            style={s.cartBtn}
            collapsable={false}
          >
            <Feather name="shopping-bag" size={24} color="#FFFFFF" />
            {cartCount > 0 && (
              <Animated.View style={[s.badge, { transform: [{ scale: badgeScaleAnim }] }]}>
                <Text style={s.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

function createHeaderStyles(c: any) {
  return StyleSheet.create({
    headerBlock: {
      marginHorizontal: 16,
      marginBottom: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderRadius: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    eyebrowText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      letterSpacing: 3,
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 2,
    },
    headerInner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    backBtn: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 0,
      borderColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    backGlyph: {
      fontFamily: 'Outfit_300Light',
      fontSize: 20, color: '#FFFFFF', lineHeight: 22,
    },
    headerTitleWrap: {
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
    },
    mainTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 32, lineHeight: 36,
      letterSpacing: -.7, color: '#FFFFFF',
      height: 72,
    },
    shimmerClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    cartBtn: {
      width: 56, height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: 4,
    },
    badge: {
      position: 'absolute', top: -4, right: -4,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: c.GOLD_DEEP,
      alignItems: 'center', justifyContent: 'center',
    },
    badgeText: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 8, color: '#FFFFFF', letterSpacing: 0.2,
    },
  });
}
