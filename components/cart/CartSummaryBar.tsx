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
        <Text style={styles.summaryValue}>{items.length}</Text>
        <Text style={styles.summaryLabel}>Items</Text>
      </View>
      <View style={styles.summarySep} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{totalWeight}g</Text>
        <Text style={styles.summaryLabel}>Weight</Text>
      </View>
      <View style={styles.summarySep} />
      <View style={styles.summaryCell}>
        <Text style={styles.summaryValue}>{collectionsCount}</Text>
        <Text style={styles.summaryLabel}>Colls</Text>
      </View>
    </View>
  );
});

function createSummaryStyles(c: Colors, horizontalPadding: number) {
  return StyleSheet.create({
    summaryStrip: {
      flexDirection: 'row',
      alignSelf: 'center',
      backgroundColor: c.PAPER,
      borderWidth: 1,
      borderColor: c.BORDER_SOFT,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 12,
      marginBottom: 16,
    },
    summaryCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    summarySep: {
      width: 1,
      height: 12,
      alignSelf: 'center',
      backgroundColor: c.BORDER_SOFT,
    },
    summaryLabel: {
      fontFamily: 'Helvetica', fontWeight: '500',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: c.MUTED,
    },
    summaryValue: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10,
      color: c.INK,
    },
  });
}
