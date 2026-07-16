import React, { useMemo, useCallback } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useColors, Colors } from '../../colors';
import { Design } from '../catalog/DesignCard';

export interface ActionTrayProps {
  item: Design;
  isInCart: boolean;
  isSold: boolean;
  bottomInset: number;
  onAddToCart: () => void;
}

export const ActionTray = React.memo(function ActionTray({
  item,
  isInCart,
  isSold,
  bottomInset,
  onAddToCart,
}: ActionTrayProps) {
  const C = useColors();
  const pageS = useMemo(() => createActionStyles(C), [C]);
  
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }, [scaleAnim]);
  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }, [scaleAnim]);

  return (
    <>
      {/* ── Spec grid — SKU + Weight only ── */}
      <View style={pageS.specsRow}>
        <View style={pageS.specCell}>
          <Text style={pageS.specLabel}>SKU</Text>
          <Text style={pageS.specValue}>{item.sku}</Text>
        </View>
        <View style={pageS.specDivider} />
        <View style={pageS.specCell}>
          <Text style={pageS.specLabel}>Weight</Text>
          <Text style={pageS.specValue}>{item.weight}g</Text>
        </View>
      </View>

      {/* ── Actions ── */}
      <View style={[pageS.actions, { paddingBottom: Math.max(bottomInset, 16) }]}>
        <View style={pageS.actionsRule} />

        {/* Primary CTA — Add to Cart */}
        {isInCart ? (
          <View style={[pageS.primaryBtn, pageS.primaryBtnAdded]}>
            <Text style={[pageS.primaryBtnText, pageS.primaryBtnTextMuted]}>Added ✓</Text>
          </View>
        ) : (
          <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onAddToCart} disabled={isSold}>
            <Animated.View style={[pageS.primaryBtn, isSold && pageS.primaryBtnSold, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={[pageS.primaryBtnText, isSold && pageS.primaryBtnTextMuted]}>
                {isSold ? 'Sold Out' : 'Add to Order'}
              </Text>
              {!isSold && <Text style={pageS.primaryBtnGlyph}>↗</Text>}
            </Animated.View>
          </TouchableWithoutFeedback>
        )}
      </View>
    </>
  );
});

function createActionStyles(c: Colors) {
  return StyleSheet.create({
    specsRow: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1, borderColor: c.BORDER_SOFT,
      marginTop: 0,
      marginBottom: 4,
      backgroundColor: c.TINT,
      overflow: 'hidden',
    },
    specCell: {
      flex: 1,
      paddingVertical: 10, paddingHorizontal: 12,
      gap: 4,
    },
    specDivider: {
      width: 1, backgroundColor: c.BORDER_SOFT,
    },
    specLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 9, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    specValue: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 16, color: c.INK,
      letterSpacing: -0.2,
    },
    actions: {
      gap: 8,
    },
    actionsRule: {
      height: 1,
      backgroundColor: c.GOLD_DEEP,
      opacity: 0.3,
      marginBottom: 4,
    },
    primaryBtn: {
      height: 50,
      borderRadius: 14,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      backgroundColor: c.BURGUNDY,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryBtnAdded: {
      backgroundColor: c.NAVY_DEEP,
      shadowOpacity: 0, elevation: 0,
    },
    primaryBtnSold: {
      backgroundColor: c.PAPER,
      borderWidth: 1, borderColor: c.BORDER_SOFT,
      shadowOpacity: 0, elevation: 0,
    },
    primaryBtnText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 13, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },
    primaryBtnTextMuted: {
      color: c.MUTED,
    },
    primaryBtnGlyph: {
      fontSize: 14, color: c.GOLD_DEEP, lineHeight: 18,
    },
  });
}
