import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../colors';
import useCartStore from '../../store/cartStore';

export default function Layout() {
  usePreventScreenCapture();
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.items.length);
  const C = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.BURGUNDY,
        tabBarInactiveTintColor: C.MUTED,
        tabBarLabelStyle: { fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
        tabBarStyle: {
          paddingBottom: insets.bottom + 4,
          height: 60 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catalogs',
          tabBarIcon: ({ color, size }) => (
            <View>
              <FontAwesome name="th-large" size={size} color={color} />
              {cartCount > 0 && (
                <View style={[styles.badge, { backgroundColor: C.GOLD_DEEP }]}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
            <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="heart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="about"
        options={{
          title: 'About Us',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="info-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 9, color: '#FFFFFF',
  },
});
