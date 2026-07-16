import React, { useCallback, useRef, useMemo } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors, Colors } from '../../colors';
import { calcCardWidth } from '../../utils/layout';
import { buildImageUrl } from '../../utils/imageUrl';
import type { CartItem } from '../../store/cartStore';

export type { CartItem };

const H_PADDING  = 24;
const COLUMN_GAP = 10;
const CARD_WIDTH = calcCardWidth(H_PADDING, COLUMN_GAP);

export interface CartItemRowProps {
  item: CartItem;
  index: number;
  onRemove: () => void;
}

export const CartItemRow = React.memo(function CartItemRow({ item, index, onRemove }: CartItemRowProps) {
  const C = useColors();
  const cardStyles = useMemo(() => createCardStyles(C), [C]);
  const bgAnim = useRef(new Animated.Value(0)).current;

  const onPressIn = useCallback(() =>
    Animated.timing(bgAnim, {
      toValue: 1, duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(), [bgAnim]);

  const onPressOut = useCallback(() =>
    Animated.timing(bgAnim, {
      toValue: 0, duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(), [bgAnim]);

  const cardBg = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.CREAM, C.PAPER],
  });

  const imageUri = buildImageUrl(item.imageUrl);
  const isLeft   = index % 2 === 0;
  const indexStr = index < 9 ? `0${index + 1}` : `${index + 1}`;

  return (
    <Animated.View
      style={[
        cardStyles.card,
        { backgroundColor: cardBg },
        isLeft ? { marginRight: COLUMN_GAP / 2 } : { marginLeft: COLUMN_GAP / 2 },
      ]}
    >
      {/* Image */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={cardStyles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={cardStyles.imagePlaceholder}>
          <Text style={cardStyles.placeholderGlyph}>◆</Text>
        </View>
      )}

      {/* Index badge */}
      <View style={cardStyles.indexBadge}>
        <Text style={cardStyles.indexText}>{indexStr}</Text>
      </View>

      {/* Body */}
      <View style={cardStyles.body}>
        <Text style={cardStyles.title} numberOfLines={2}>
          {item.catalogName || item.title || 'Design'}
        </Text>

        {/* Chips */}
        <View style={cardStyles.chipsRow}>
          <View style={cardStyles.chip}>
            <Text style={cardStyles.chipLabel}>Tag</Text>
            <Text style={cardStyles.chipValue} numberOfLines={1}>{item.sku}</Text>
          </View>
          <View style={cardStyles.chip}>
            <Text style={cardStyles.chipLabel}>Wt</Text>
            <Text style={cardStyles.chipValue}>{item.weight}g</Text>
          </View>
        </View>

        {/* Remove */}
        <TouchableOpacity
          onPress={onRemove}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
          style={cardStyles.removeBtn}
        >
          <Text style={cardStyles.removeBtnText}>Remove</Text>
          <Text style={cardStyles.removeBtnGlyph}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

function createCardStyles(c: Colors) {
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
      height: CARD_WIDTH * 1.1,
      backgroundColor: c.TINT,
    },
    imagePlaceholder: {
      width: '100%',
      height: CARD_WIDTH * 0.8,
      backgroundColor: c.TINT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderGlyph: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 28,
      color: c.GOLD_DEEP,
      opacity: 0.4,
    },
    indexBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    indexText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10,
      color: c.MUTED,
      letterSpacing: 0.5,
    },
    body: {
      padding: 10,
      gap: 8,
    },
    title: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 16,
      color: c.INK,
      lineHeight: 19,
      letterSpacing: -0.1,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 4,
    },
    chip: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.BORDER_SOFT,
      backgroundColor: c.TINT,
      paddingHorizontal: 6,
      paddingVertical: 4,
      flex: 1,
    },
    chipLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 7.5,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.MUTED,
      marginBottom: 1,
    },
    chipValue: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 10,
      color: c.INK,
      letterSpacing: 0.1,
    },
    removeBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.BURGUNDY,
      height: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    removeBtnText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 9,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: c.BURGUNDY,
    },
    removeBtnGlyph: {
      fontSize: 9,
      color: c.BURGUNDY,
    },
  });
}
