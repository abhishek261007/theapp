import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../colors';
import useAuthStore from '../../store/authStore';

export default function RegisterTab() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const hasRegistered = useAuthStore((s) => s.hasRegistered);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!hasRegistered) {
    return (
      <View style={[styles.container, { backgroundColor: C.CREAM, paddingTop: insets.top + 40 }]}>
        <LinearGradient
          colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.registerCard}
        >
          <Text style={styles.registerTitle}>Welcome to PM Jewellers</Text>
          <Text style={styles.registerBody}>
            Register to receive order updates, exclusive offers, and faster checkouts.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/register')}
            style={styles.registerBtn}
          >
            <Text style={styles.registerBtnText}>Register Now</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.CREAM }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 40 }}
    >
      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHeader}
      >
        <Text style={styles.profileName}>{user?.name ?? 'Member'}</Text>
        <Text style={styles.profileShop}>{user?.shopName ?? ''}</Text>
      </LinearGradient>

      <View style={[styles.profileCard, { backgroundColor: C.PAPER }]}>
        <ProfileRow label="CONTACT" value={user?.contactNumber ?? '—'} />
        <ProfileRow label="SHOP PHONE" value={user?.shopPhoneNumber ?? '—'} />
        {user?.email ? <ProfileRow label="EMAIL" value={user.email} /> : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleLogout}
        style={[styles.logoutBtn, { borderColor: C.BORDER_SOFT }]}
      >
        <Text style={[styles.logoutText, { color: C.BURGUNDY }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Register (not registered) */
  registerCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#0F2640',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 8,
  },
  registerTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  registerBody: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  registerBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  registerBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 15,
    color: '#8B1A4A',
    letterSpacing: 0.3,
  },

  /* Profile (registered) */
  profileHeader: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 26,
    marginBottom: 16,
    shadowColor: '#0F2640',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 8,
  },
  profileName: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 26,
    color: '#FFFFFF',
  },
  profileShop: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  profileCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E0D8',
  },
  rowLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#8A7A6B',
    marginBottom: 4,
  },
  rowValue: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: '#2C1810',
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
