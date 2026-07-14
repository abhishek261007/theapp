import React, { memo, useCallback, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../../colors';

const API_BASE = 'https://apis.27012610.xyz';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const H_PADDING = 16;
export const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP) / 2;

export type Catalog = {
  _id: string;
  name: string;
  description?: string;
  heroImageUrl?: string;
  updatedAt?: string;
};

export function buildHeroUrl(heroImageUrl?: string, updatedAt?: string): string | null {
  if (!heroImageUrl) return null;
  const seed = `${heroImageUrl}:${updatedAt ?? ''}`;
  const cacheBuster = `v=${encodeURIComponent(seed)}`;
  if (heroImageUrl.startsWith('http')) {
    return `${heroImageUrl}${heroImageUrl.includes('?') ? '&' : '?'}${cacheBuster}`;
  }
  return `${API_BASE}${heroImageUrl}?${cacheBuster}`;
}

export interface CatalogCardProps {
  item: Catalog;
  index: number;
  onPress: () => void;
}

export const CatalogCard = memo(function CatalogCard({
  item,
  index,
  onPress,
}: CatalogCardProps) {
  const C = useColors();
  const s = createCardStyles(C);
  const ACCENTS = [C.BURGUNDY, C.NAVY, C.TEAL, C.GOLD_DEEP];
  const pressAnim = useRef(new Animated.Value(0)).current;
  const heroUri = buildHeroUrl(item.heroImageUrl, item.updatedAt);
  const accent = ACCENTS[index % ACCENTS.length];

  const onPressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const onPressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const scale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: CARD_WIDTH }}
    >
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        <View style={s.imageWrap}>
          {heroUri ? (
            <Image 
              key={heroUri} 
              source={{ uri: heroUri }} 
              style={s.image} 
              contentFit="cover" 
              cachePolicy="none" 
            />
          ) : (
            <View style={[s.image, s.placeholderBg, { backgroundColor: accent + '22' }]}>
              <Text style={[s.placeholderGlyph, { color: accent }]}>◆</Text>
            </View>
          )}

          {/* Arrow badge */}
          <View style={s.arrowCircle}>
            <Text style={[s.arrowGlyph, { color: accent }]}>↗</Text>
          </View>
        </View>

        {/* Text block */}
        <View style={s.textBlock}>
          <View style={[s.goldRule, { backgroundColor: accent }]} />
          <Text style={s.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={s.cardDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

function createCardStyles(c: any) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      backgroundColor: c.PAPER,
      marginBottom: GRID_GAP,
      overflow: 'hidden',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    imageWrap: {
      height: 210,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderBg: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 34,
    },
    indexChip: {
      position: 'absolute',
      top: 10,
      left: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    indexChipText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    arrowCircle: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    arrowGlyph: {
      fontSize: 14,
      lineHeight: 16,
    },
    textBlock: {
      padding: 12,
    },
    goldRule: {
      width: 20,
      height: 3,
      borderRadius: 2,
      marginBottom: 8,
    },
    cardName: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 17,
      lineHeight: 20,
      color: c.INK,
    },
    cardDesc: {
      fontFamily: 'Outfit_300Light',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.MUTED,
      marginTop: 4,
    },
  });
}
