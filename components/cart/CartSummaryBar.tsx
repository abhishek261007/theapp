import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors, Colors } from '../../colors';
import { CartItem } from '../../store/cartStore';

export interface CartSummaryBarProps {
  items: CartItem[];
  horizontalPadding?: number;
}

export const CartSummaryBar = React.memo(function CartSummaryBar({ items, horizontalPadding = 24 }: CartSummaryBarProps) {
  const C = useColors();
  const styles = useMemo(() => createSummaryStyles(C, horizontalPadding), [C, horizontalPadding]);

  const totalWeight = useMemo(() => items
    .reduce((acc: number, i: CartItem) => acc + (parseFloat(String(i.weight)) || 0), 0)
    .toFixed(1), [items]);
    
  const collectionsCount = useMemo(() => new Set(items.map((i: CartItem) => i.catalogName)).size, [items]);

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
          {collectionsCount}
        </Text>
      </View>
    </View>
  );
});

function createSummaryStyles(c: Colors, horizontalPadding: number) {
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: c.MUTED,
    },
    summaryValue: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 22,
      color: c.INK,
      letterSpacing: -0.2,
    },
  });
}
