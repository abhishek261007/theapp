import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        height: 70,
        paddingTop: 10,
      }
    }}>
      <Tabs.Screen name="index" options={{ title: 'Catalogs' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
    </Tabs>
  );
}
