/**
 * CartScreen.tsx
 *
 * Fixes applied:
 *  1. [CRITICAL] SafeAreaView removed from JSX — it was never imported from
 *     react-native, which would cause a crash or silent no-op.
 *  2. [CRITICAL] useSafeAreaInsets is now actually called and used — it was
 *     imported but never invoked, so the header paddingTop was still hardcoded.
 *  3. [BUG] Hardcoded paddingTop: 28 in header replaced with insets.top + 14
 *     so the layout is correct on all device sizes (notch, Dynamic Island,
 *     no notch). Requires SafeAreaProvider in the root layout (app/_layout.tsx).
 *  4. [CLEAN] Removed the now-redundant SafeAreaView wrapper — root View with
 *     styles.safe is sufficient since safe area is handled via insets.
 *  5. [TYPE] CartCard item prop typed as CartItem instead of any.
 *  6. [PERF] getImageUrl moved to module level — never recreated per render.
 *  7. [FIX] KeyboardAvoidingView wraps FlatList so inputs in ListFooterComponent
 *     are not hidden behind the keyboard on iOS and Android.
 *  8. [DESIGN] Migrated from static purple palette to the dynamic luxury
 *     editorial palette (useColors / colors.ts) — burgundy/navy/teal/gold,
 *     light + dark mode aware.
 */

import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../colors';
import { validateOfferCode } from '../services/campaigns';
import { getOrRegisterPushToken } from '../services/notifications';
import useCartStore from '../store/cartStore';

/* ─── Constants ─── */
const WHATSAPP_NUMBER = '919712779146';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING  = 24;
const COLUMN_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - COLUMN_GAP) / 2;

/* ─── Types ─── */
type CartItem = {
  _id: string;
  catalogName?: string;
  title?: string;
  sku: string;
  weight: number | string;
  imageUrl?: string | null;
};

/* ─── Pure helper (module-level — never recreated per render) ─── */
function buildImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const img = String(imageUrl);
  if (img.startsWith('http')) return img;
  return `https://apis.27012610.xyz${img}`;
}

/* ─── Cart Item Card (compact 2-col) ─── */
function CartCard({
  item,
  index,
  onRemove,
}: {
  item: CartItem;
  index: number;
  onRemove: () => void;
}) {
  const C = useColors();
  const cardStyles = createCardStyles(C);
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
}

function createCardStyles(c) {
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
      fontFamily: 'CormorantGaramond_600SemiBold',
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
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      color: c.MUTED,
      letterSpacing: 0.5,
    },
    body: {
      padding: 10,
      gap: 8,
    },
    title: {
      fontFamily: 'CormorantGaramond_600SemiBold',
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
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 7.5,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: c.MUTED,
      marginBottom: 1,
    },
    chipValue: {
      fontFamily: 'Outfit_400Regular',
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
      fontFamily: 'Outfit_600SemiBold',
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

/* ─── Main Screen ─── */
export default function CartScreen() {
  const C = useColors();
  const styles = createStyles(C);

  const items          = useCartStore((s: any) => s.items);
  const removeFromCart = useCartStore((s: any) => s.removeFromCart);
  const clearCart      = useCartStore((s: any) => s.clearCart);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [validatedCampaign, setValidatedCampaign] = useState<{ name: string; offerCode: string } | null>(null);
  const [codeValidating, setCodeValidating] = useState(false);
  const insets = useSafeAreaInsets();

  const handleWhatsAppInquiry = async () => {
    if (!customerName.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    if (!customerPhone.trim()) {
      Alert.alert('Phone Required', 'Please enter your phone number.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty Order', 'Add some designs before sending an inquiry.');
      return;
    }

    try {
      const pushToken = await getOrRegisterPushToken();
      const response = await fetch('https://apis.27012610.xyz/inquiries/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          pushToken,
          items: items.map((item: CartItem) => ({
            designId: item._id,
            sku: item.sku,
            catalogName: item.catalogName,
            imageUrl: item.imageUrl,
          })),
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error('Failed');

      const grouped: Record<string, CartItem[]> = {};
      items.forEach((item: CartItem) => {
        const catalog = item.catalogName || 'General';
        if (!grouped[catalog]) grouped[catalog] = [];
        grouped[catalog].push(item);
      });

      const sections = Object.entries(grouped).map(([catalogName, designs]) => {
        const skus = designs.map((item, i) => `${i + 1}. Tags: ${item.sku}`);
        return `*Collection: ${catalogName}*\n${skus.join('\n')}`;
      });

      const offerLine = validatedCampaign
        ? `Offer Code: ${validatedCampaign.offerCode} (${validatedCampaign.name})\n`
        : '';

      const message =
        `Hello PM Jewellers!\n\n` +
        `Name: ${customerName}\n` +
        `Phone: ${customerPhone}\n` +
        offerLine +
        `Inquiry ID: ${data.inquiry._id}\n\n` +
        `${sections.join('\n\n')}`;

      await Linking.openURL(
        `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`
      );

      clearCart();
      Alert.alert('Inquiry Sent', 'WhatsApp opened successfully.');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to create inquiry. Please try again.');
    }
  };

  const confirmClear = () =>
    Alert.alert('Clear Order', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: clearCart },
    ]);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />

      {/* ── Gradient header (matches CatalogsScreen / DesignDetailsScreen) ── */}
      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={styles.backBtn}
        >
          <Text style={styles.backGlyph}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.eyebrowText}>PM Jewellers</Text>
          <Text style={styles.screenTitle}>
            My Order
            <Text style={styles.screenTitleItalic}> · {items.length}</Text>
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            onPress={confirmClear}
            activeOpacity={0.8}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ── Empty State ── */}
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyGlyph}>◆</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse collections and add designs to get started
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={styles.browseBtn}
          >
            <Text style={styles.browseBtnText}>Browse Collections</Text>
            <Text style={styles.browseBtnGlyph}>↗</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // FIX: KeyboardAvoidingView pushes the FlatList footer (inputs + CTA)
        // above the keyboard when it opens, so nothing is hidden.
        // behavior="padding" is correct for both iOS and Android here because
        // the root View fills the full screen (no SafeAreaView offset issues).
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            data={items}
            keyExtractor={(item: CartItem) => item._id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              /* ── Summary strip ── */
              <View style={styles.summaryStrip}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Items</Text>
                  <Text style={styles.summaryValue}>{items.length}</Text>
                </View>
                <View style={styles.summarySep} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Total Weight</Text>
                  <Text style={styles.summaryValue}>
                    {items.reduce((acc: number, i: CartItem) => acc + (parseFloat(String(i.weight)) || 0), 0).toFixed(1)}g
                  </Text>
                </View>
                <View style={styles.summarySep} />
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Collections</Text>
                  <Text style={styles.summaryValue}>
                    {new Set(items.map((i: CartItem) => i.catalogName)).size}
                  </Text>
                </View>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Your Name"
                  placeholderTextColor={C.MUTED}
                  style={styles.input}
                />
                <TextInput
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="Phone Number"
                  placeholderTextColor={C.MUTED}
                  keyboardType="phone-pad"
                  style={styles.input}
                />


                {/* ── Offer Code ── */}
                <View style={styles.offerCodeRow}>
                  <TextInput
                    value={offerCode}
                    onChangeText={(t) => { setOfferCode(t.toUpperCase()); setValidatedCampaign(null); }}
                    placeholder="Offer Code"
                    placeholderTextColor={C.MUTED}
                    autoCapitalize="characters"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={async () => {
                      if (!offerCode.trim()) return;
                      setCodeValidating(true);
                      const result = await validateOfferCode(offerCode.trim());
                      setCodeValidating(false);
                      if (result.valid && result.campaign) {
                        setValidatedCampaign(result.campaign);
                      } else {
                        setValidatedCampaign(null);
                        Alert.alert('Invalid Code', result.message || 'This code is not valid or has expired.');
                      }
                    }}
                    disabled={!offerCode.trim() || codeValidating}
                    activeOpacity={0.8}
                    style={styles.validateBtn}
                  >
                    <Text style={styles.validateBtnText}>
                      {codeValidating ? '...' : validatedCampaign ? '✓' : 'Apply'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {validatedCampaign && (
                  <View style={styles.validCodeBadge}>
                    <Text style={styles.validCodeText}>
                      ✓ {validatedCampaign.name} — code applied
                    </Text>
                  </View>
                )}

                {/* ── WhatsApp CTA ── */}
                <TouchableOpacity
                  onPress={handleWhatsAppInquiry}
                  activeOpacity={0.85}
                  style={styles.whatsappBtn}
                >
                  <Text style={styles.whatsappBtnText}>Send Inquiry on WhatsApp</Text>
                  <Text style={styles.whatsappBtnGlyph}>↗</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item, index }: { item: CartItem; index: number }) => (
              <CartCard
                item={item}
                index={index}
                onRemove={() => removeFromCart(item._id)}
              />
            )}
          />
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

/* ─────────────── Styles ─────────────── */

function createStyles(c) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.CREAM,
    },

    /* Header — gradient, paddingTop applied inline */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: H_PADDING,
      paddingBottom: 22,
      gap: 14
    },
    backBtn: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backGlyph: {
      fontFamily: 'Outfit_300Light',
      fontSize: 20, color: '#FFFFFF', lineHeight: 22,
    },
    headerCenter: {
      flex: 1,
    },
    eyebrowText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      letterSpacing: 3,
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 2,
    },
    screenTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 32,
      color: '#FFFFFF',
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    screenTitleItalic: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.7)',
    },
    clearBtn: {
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    clearBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },

    /* Summary strip */
    summaryStrip: {
      flexDirection: 'row',
      backgroundColor: c.BORDER_SOFT,
      gap: 1.5,
      marginBottom: 1.5,
      marginHorizontal: H_PADDING,
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
    input: {
      height: 54,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.BORDER_SOFT,
      backgroundColor: c.PAPER,
      paddingHorizontal: 16,
      fontFamily: 'Outfit_400Regular',
      fontSize: 14,
      color: c.INK,
    },

    /* Offer code */
    offerCodeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    validateBtn: {
      height: 54,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: c.NAVY,
      alignItems: 'center',
      justifyContent: 'center',
    },
    validateBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
    validCodeBadge: {
      backgroundColor: c.availableBg || '#EDF7EE',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: c.available || '#2E7D32',
    },
    validCodeText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      color: c.available || '#2E7D32',
    },

    /* Grid */
    columnWrapper: {
      paddingHorizontal: H_PADDING,
      justifyContent: 'space-between',
    },
    listContent: {
      paddingBottom: 60,
      gap: COLUMN_GAP,
    },

    /* Footer */
    footer: {
      paddingHorizontal: H_PADDING,
      paddingTop: 20,
      gap: 12,
    },

    /* WhatsApp CTA */
    whatsappBtn: {
      backgroundColor: c.NAVY,
      height: 58,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    whatsappBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
    whatsappBtnGlyph: {
      fontSize: 14,
      color: c.GOLD,
      lineHeight: 16,
    },
    whatsappHint: {
      fontFamily: 'Outfit_300Light',
      fontSize: 10,
      letterSpacing: 1.5,
      textAlign: 'center',
      color: c.MUTED,
      textTransform: 'uppercase',
    },

    /* Empty state */
    emptyBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
      gap: 12,
    },
    emptyGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 48,
      color: c.GOLD_DEEP,
      opacity: 0.4,
      marginBottom: 8,
    },
    emptyTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 28,
      color: c.INK,
      letterSpacing: -0.3,
    },
    emptySubtitle: {
      fontFamily: 'Outfit_300Light',
      fontSize: 12,
      letterSpacing: 1,
      color: c.MUTED,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 30,
    },
    browseBtn: {
      marginTop: 8,
      borderRadius: 14,
      backgroundColor: c.BURGUNDY,
      paddingHorizontal: 28,
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    browseBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
    browseBtnGlyph: {
      fontSize: 14,
      color: c.GOLD,
    },
  });
}
