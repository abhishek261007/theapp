import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../colors';
import api from '../services/api';
import { getOrRegisterPushToken } from '../services/notifications';
import useAuthStore from '../store/authStore';

export default function RegisterScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [shopPhoneNumber, setShopPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [focused, setFocused] = useState<string | null>(null);

  const canSave = name.trim() && shopName.trim() && contactNumber.trim() && shopPhoneNumber.trim();

  const handleRegister = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      const pushToken = await getOrRegisterPushToken();
      const res = await api.post('/customers/register', {
        name: name.trim(),
        shopName: shopName.trim(),
        contactNumber: contactNumber.trim(),
        shopPhoneNumber: shopPhoneNumber.trim(),
        email: email.trim() || undefined,
        pushToken: pushToken || undefined,
      });

      if (res.data.success) {
        setAuth(res.data.token, res.data.customer);
        Alert.alert('Welcome!', 'You are now registered with PM Jewellers.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field: string) => [
    s.input,
    {
      backgroundColor: C.PAPER,
      borderColor: focused === field ? C.GOLD_DEEP : C.BORDER_SOFT,
      color: C.INK,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.CREAM }}>
      <StatusBar barStyle="light-content" backgroundColor={C.GRADIENT_A} />

      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 14 }]}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.0} style={s.backBtn}>
          <Text style={s.backGlyph}>←</Text>
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.title}>Register</Text>
          <Text style={s.subtitle}>Join the PM Jewellers family</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <View style={s.field}>
              <Text style={s.label}>FULL NAME</Text>
              <TextInput
                placeholderTextColor={C.MUTED}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
                returnKeyType="next"
                style={inputStyle('name')}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>SHOP NAME</Text>
              <TextInput
                placeholderTextColor={C.MUTED}
                value={shopName}
                onChangeText={setShopName}
                onFocus={() => setFocused('shopName')}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
                returnKeyType="next"
                style={inputStyle('shopName')}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>CONTACT NUMBER</Text>
              <TextInput
                placeholderTextColor={C.MUTED}
                value={contactNumber}
                onChangeText={setContactNumber}
                onFocus={() => setFocused('contactNumber')}
                onBlur={() => setFocused(null)}
                keyboardType="phone-pad"
                returnKeyType="next"
                style={inputStyle('contactNumber')}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>SHOP PHONE NUMBER</Text>
              <TextInput
                placeholderTextColor={C.MUTED}
                value={shopPhoneNumber}
                onChangeText={setShopPhoneNumber}
                onFocus={() => setFocused('shopPhoneNumber')}
                onBlur={() => setFocused(null)}
                keyboardType="phone-pad"
                returnKeyType="next"
                style={inputStyle('shopPhoneNumber')}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>EMAIL (optional)</Text>
              <TextInput
                placeholderTextColor={C.MUTED}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={inputStyle('email')}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={!canSave || saving}
              style={[
                s.primaryBtn,
                { backgroundColor: C.NAVY_DEEP },
                (!canSave || saving) && { opacity: 0.5 },
              ]}
            >
              <Text style={s.primaryBtnText}>
                {saving ? 'Registering...' : 'Register'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              style={s.skipBtn}
            >
              <Text style={[s.skipText, { color: C.MUTED }]}>Skip for now</Text>
            </TouchableOpacity>

            <View style={s.privacyNote}>
              <Text style={[s.privacyText, { color: C.MUTED }]}>
                Your information is kept confidential and used only for order updates and personalized service.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  backGlyph: { fontSize: 24, color: '#FFFFFF' },
  headerContent: { gap: 4 },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: 'Outfit_300Light',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  field: { marginBottom: 18 },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    letterSpacing: 2,
    color: '#8A7A6B',
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  privacyNote: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
  },
  privacyText: {
    fontFamily: 'Outfit_300Light',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
