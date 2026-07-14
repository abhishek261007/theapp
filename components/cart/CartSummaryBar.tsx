import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../../colors';
import { CartItem } from './CartItemRow';

export interface CartSummaryBarProps {
  items: CartItem[];
  horizontalPadding?: number;
}

export function CartSummaryBar({ items, horizontalPadding = 24 }: CartSummaryBarProps) {
  const C = useColors();
  const styles = createSummaryStyles(C, horizontalPadding);

  const totalWeight = items
    .reduce((acc: number, i: CartItem) => acc + (parseFloat(String(i.weight)) || 0), 0)
    .toFixed(1);

  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Items</Text>
        <Text style={styles.summaryValue}>{items.length}</Text>
      </View>
      <View style={styles.summarySep} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Total Weight</Text>
        <Text style={styles.summaryValue}>{totalWeight}g</Text>
      </View>
      <View style={styles.summarySep} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryLabel}>Collections</Text>
        <Text style={styles.summaryValue}>
          {new Set(items.map((i: CartItem) => i.catalogName)).size}
        </Text>
      </View>
    </View>
  );
}

function createSummaryStyles(c: any, horizontalPadding: number) {
  return StyleSheet.create({
    summaryStrip: {
      flexDirection: 'row',
      backgroundColor: c.BORDER_SOFT,
      gap: 1.5,
      marginBottom: 1.5,
      marginHorizontal: horizontalPadding,
    },
    summaryCell: {
      flex: 1,
      backgroundColor: c.PAPER,
      paddingVertical: 16,
      paddingHorizontal: 14,
      gap: 4,
      alignItems: 'center',
    },
    summarySep: {
      width: 1.5,
      backgroundColor: c.BORDER_SOFT,
    },
    summaryLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: c.MUTED,
    },
    summaryValue: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 22,
      color: c.INK,
      letterSpacing: -0.2,
    },
  });
}
