import React, { memo, useCallback, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useColors } from '../../colors';
import { useCartAnimation } from '../providers/CartAnimationProvider';

export type Design = {
  _id: string;
  catalogName: string;
  sku: string;
  weight: number;
  status: string;
  imageUrl?: string;
  thumbnailUrl?: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const H_PADDING  = 16;
export const COLUMN_GAP = 10;
export const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - COLUMN_GAP) / 2;

export function buildImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `https://apis.27012610.xyz${imageUrl}`;
}

export interface DesignCardProps {
  item: Design;
  index: number;
  onPress: (item: Design) => void;
  onAddToCart: (item: Design) => void;
  isWishlisted: boolean;
  onToggleWishlist: (item: Design) => void;
  isInCart: boolean;
}

export const DesignCard = memo(function DesignCard({
  item,
  index,
  onPress,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  isInCart,
}: DesignCardProps) {
  const C = useColors();
  const cardS = createCardStyles(C);
  const { triggerFlyToCart } = useCartAnimation();

  const pressAnim    = useRef(new Animated.Value(0)).current;
  const btnScaleAnim = useRef(new Animated.Value(1)).current;
  const btnBgAnim    = useRef(new Animated.Value(0)).current;
  const addingRef    = useRef(false);
  const imageViewRef = useRef<View>(null);

  const imageUri = buildImageUrl(item.thumbnailUrl || item.imageUrl);

  const onPressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1, duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const onPressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0, duration: 240,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const cardBg      = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [C.CREAM, C.PAPER] });
  const borderColor = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [C.BORDER_SOFT, C.GOLD_DEEP] });
  const btnBg       = btnBgAnim.interpolate({ inputRange: [0, 1], outputRange: [C.NAVY_DEEP, C.INK] });

  const handleAddPress = useCallback(() => {
    if (addingRef.current) return;
    addingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    Animated.sequence([
      Animated.parallel([
        Animated.timing(btnScaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
        Animated.timing(btnBgAnim,    { toValue: 1,    duration: 80, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(btnScaleAnim, { toValue: 1, duration: 100, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(btnBgAnim,    { toValue: 0, duration: 200, useNativeDriver: false }),
      ]),
    ]).start();

    triggerFlyToCart({ imageUri, sourceRef: imageViewRef as React.RefObject<View> });
    onAddToCart(item);
    setTimeout(() => { addingRef.current = false; }, 100);
  }, [onAddToCart, item, imageUri, triggerFlyToCart, btnScaleAnim, btnBgAnim]);

  const handleCardPress = useCallback(() => {
    if (addingRef.current) return;
    onPress(item);
  }, [onPress, item]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleCardPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[cardS.card, { backgroundColor: cardBg, borderColor }]}>
        <View ref={imageViewRef} collapsable={false}>
          {imageUri ? (
            <Image
              source={imageUri}
              style={cardS.image}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={cardS.imagePlaceholder}>
              <Text style={cardS.placeholderGlyph}>◆</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => onToggleWishlist(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={cardS.heartBtn}
          >
            <Text style={[cardS.heartGlyph, isWishlisted && cardS.heartActive]}>
              {isWishlisted ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={cardS.imageRule} />

        <View style={cardS.body}>
          <View style={cardS.infoPill}>
            <View style={cardS.pillSection}>
              <Text style={cardS.pillLabel}>Tag</Text>
              <Text style={cardS.pillValue} numberOfLines={2}>{item.sku}</Text>
            </View>
            <View style={cardS.pillDivider} />
            <View style={cardS.pillSection}>
              <Text style={cardS.pillLabel}>Wt</Text>
              <Text style={cardS.pillValue}>{item.weight}g</Text>
            </View>
          </View>

          <View style={cardS.goldRule} />

          {isInCart ? (
            <View style={[cardS.addBtn, cardS.addBtnAdded]}>
              <Text style={cardS.addBtnTextAdded}>Added ✓</Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: btnScaleAnim }] }}>
              <TouchableOpacity activeOpacity={1} onPress={handleAddPress}>
                <Animated.View style={[cardS.addBtn, { backgroundColor: btnBg }]}>
                  <Text style={cardS.addBtnText}>Add to Order</Text>
                  <Text style={cardS.addBtnGlyph}>↗</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

function createCardStyles(c: any) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      borderRadius: 18,
      backgroundColor: c.PAPER,
      marginBottom: COLUMN_GAP,
      overflow: 'hidden',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    image: {
      width: '100%',
      height: CARD_WIDTH,
      backgroundColor: c.TINT,
    },
    imagePlaceholder: {
      width: '100%',
      height: CARD_WIDTH,
      backgroundColor: c.TINT,
      alignItems: 'center', justifyContent: 'center',
    },
    placeholderGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 30, color: c.GOLD_DEEP, opacity: 0.5,
    },
    imageRule: {
      height: 3,
      width: 20,
      backgroundColor: c.GOLD_DEEP,
      marginLeft: 8,
      borderRadius: 2,
    },
    heartBtn: {
      position: 'absolute', top: 8, right: 8,
      width: 32, height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.85)',
      alignItems: 'center', justifyContent: 'center',
    },
    heartGlyph: {
      fontSize: 18, lineHeight: 20, color: c.MUTED,
    },
    heartActive: {
      color: c.HEART_ACTIVE,
    },
    body: { padding: 8, gap: 6 },
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.BORDER_SOFT,
      backgroundColor: c.TINT,
    },
    pillSection: {
      flex: 1,
      paddingHorizontal: 7,
      paddingVertical: 5,
    },
    pillDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: c.BORDER_SOFT,
      opacity: 0.5,
    },
    pillLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 7, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    pillValue: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 10, color: c.INK, letterSpacing: 0.2,
    },
    goldRule: {
      width: 20, height: 3,
      backgroundColor: c.GOLD_DEEP,
      borderRadius: 2,
    },
    addBtn: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10, gap: 6,
      borderRadius: 12,
      backgroundColor: c.BURGUNDY,
    },
    addBtnAdded: {
      backgroundColor: c.NAVY_DEEP,
      opacity: 0.5,
    },
    addBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },
    addBtnTextAdded: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    addBtnGlyph: { fontSize: 11, color: c.GOLD_DEEP, lineHeight: 14 },
  });
}
