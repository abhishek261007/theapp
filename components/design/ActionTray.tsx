import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '../../colors';
import { Design } from '../catalog/DesignCard';

export interface ActionTrayProps {
  item: Design;
  isInCart: boolean;
  isSold: boolean;
  bottomInset: number;
  btnScaleAnim: Animated.Value;
  btnBg: Animated.AnimatedInterpolation<string | number>;
  onAddToCart: () => void;
}

export function ActionTray({
  item,
  isInCart,
  isSold,
  bottomInset,
  btnScaleAnim,
  btnBg,
  onAddToCart,
}: ActionTrayProps) {
  const C = useColors();
  const pageS = createActionStyles(C);

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
            <Text style={pageS.primaryBtnTextAdded}>Added ✓</Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ scale: btnScaleAnim }] }}>
            <TouchableOpacity activeOpacity={1} onPress={onAddToCart} disabled={isSold}>
              <Animated.View style={[
                pageS.primaryBtn,
                isSold && pageS.primaryBtnSold,
                !isSold && { backgroundColor: btnBg as any },
              ]}>
                <Text style={[pageS.primaryBtnText, isSold && pageS.primaryBtnTextSold]}>
                  {isSold ? 'Sold Out' : 'Add to Order'}
                </Text>
                {!isSold && <Text style={pageS.primaryBtnGlyph}>↗</Text>}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </>
  );
}

function createActionStyles(c: any) {
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
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 9, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    specValue: {
      fontFamily: 'CormorantGaramond_600SemiBold',
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
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 13, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },
    primaryBtnTextAdded: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 13, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    primaryBtnTextSold: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 13, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    primaryBtnGlyph: {
      fontSize: 14, color: c.GOLD_DEEP, lineHeight: 18,
    },
  });
}
