/**
 * about.tsx — About Us / Store Info Screen
 *
 * Matches CatalogsScreen's design language:
 *  — Pink → violet → blue gradient header
 *  — Cormorant Garamond + Outfit pairing
 *  — Card-based sections on cream background
 *  — Embedded Google Map (react-native-webview)
 *
 * NOTE: Requires `react-native-webview`. If not installed, run:
 *   npx expo install react-native-webview
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useColors, Colors } from '../../colors';
/* ─── Business data ─── */
const SHOP_NAME = 'PM Jewellers Silver';
const ADDRESS = 'Chandidham Complex, 1204/F2, MGH Road, Old City, Manekchowk, Ahmedabad, Gujarat 380001';
const SHOP_PHONE = '097127 79146';
const SHOP_PHONE_DIAL = '+919712779146';
const OFFICE_PHONE = '9662279707';
const OFFICE_PHONE_DIAL = '+919662279707';
const EST_YEAR = '2005';

const GOOGLE_MAPS_DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=PM+Jewellers+silver+Manekchowk+Ahmedabad';

const MAP_EMBED_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      html, body { margin:0; padding:0; height:100%; }
      iframe { width:100%; height:100%; border:0; }
    </style>
  </head>
  <body>
    <iframe
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3672.04869057854!2d72.58750467509174!3d23.021984379174206!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85a46d65be53%3A0x422e70e28a3c100b!2sPM%20Jewellers%20silver!5e0!3m2!1sen!2sin!4v1782033421883!5m2!1sen!2sin"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade">
    </iframe>
  </body>
</html>
`;

type Owner = { name: string; phone: string; dial: string };
const OWNERS: Owner[] = [
  { name: 'Bhavik Jain', phone: '97127 79146', dial: '+919712779146' },
];

/* ─── Section card wrapper ─── */
function SectionCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  const C = useColors();
  const s = useMemo(() => createCardStyles(C), [C]);
  return (
    <View style={s.card}>
      <View style={[s.rule, { backgroundColor: accent }]} />
      <Text style={s.title}>{title}</Text>
      {children}
    </View>
  );
}

/* ─── Tappable info row (address / phone / hours) ─── */
function InfoRow({
  glyph,
  label,
  value,
  onPress,
  accent,
}: {
  glyph: string;
  label: string;
  value: string;
  onPress?: () => void;
  accent: string;
}) {
  const C = useColors();
  const s = useMemo(() => createRowStyles(C), [C]);
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      activeOpacity={0.7}
      onPress={onPress}
      style={s.row}
    >
      <View style={[s.glyphCircle, { backgroundColor: accent + '1A' }]}>
        <Text style={[s.glyph, { color: accent }]}>{glyph}</Text>
      </View>
      <View style={s.textWrap}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.value, onPress && { color: C.NAVY_DEEP }]} selectable={true}>
          {value}
        </Text>
      </View>
      {onPress && <Text style={s.chevron}>›</Text>}
    </Wrapper>
  );
}

/* ─── Owner contact card ─── */
function OwnerCard({ owner, accent }: { owner: Owner; accent: string }) {
  const C = useColors();
  const s = useMemo(() => createOwnerStyles(C), [C]);
  const call = useCallback(() => {
    Linking.openURL(`tel:${owner.dial}`).catch(() => {});
  }, [owner.dial]);

  const whatsapp = useCallback(() => {
    const num = owner.dial.replace('+', '');
    Linking.openURL(`https://wa.me/${num}`).catch(() => {});
  }, [owner.dial]);

  return (
    <View style={s.card}>
      <View style={[s.avatar, { backgroundColor: accent + '1A' }]}>
        <Text style={[s.avatarGlyph, { color: accent }]}>
          {owner.name.charAt(0)}
        </Text>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{owner.name}</Text>
        <Text style={s.phone}>{owner.phone}</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity
          onPress={call}
          style={[s.actionBtn, { backgroundColor: C.BURGUNDY }]}
        >
          <Text style={s.actionGlyph}>📞</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={whatsapp}
          style={[s.actionBtn, { backgroundColor: '#25D366' }]}
        >
          <Text style={s.actionGlyph}>💬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function AboutScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const openDirections = useCallback(() => {
    Linking.openURL(GOOGLE_MAPS_DIRECTIONS_URL).catch(() => {});
  }, []);

  const callShop = useCallback(() => {
    Linking.openURL(`tel:${SHOP_PHONE_DIAL}`).catch(() => {});
  }, []);

  const callOffice = useCallback(() => {
    Linking.openURL(`tel:${OFFICE_PHONE_DIAL}`).catch(() => {});
  }, []);

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />

      {/* Gradient header */}
      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.headerBlock, { marginTop: insets.top + 12 }]}
      >
        <View style={s.headerInner}>

          <View style={s.headerTextWrap}>
            <Text style={s.kicker}>SINCE {EST_YEAR} · ABOUT US</Text>
            <Text style={s.mainTitle}>{SHOP_NAME}</Text>
            <Text style={s.shopTagline}>
              Wholesale silver market · Ahmedabad, Gujarat
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map */}
        <View style={s.mapWrap}>
          <WebView
            source={{ html: MAP_EMBED_HTML }}
            style={s.map}
            scrollEnabled={false}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openDirections}
          style={s.directionsBtn}
        >
          <Text style={s.directionsGlyph}>↗</Text>
          <Text style={s.directionsLabel}>Get Directions</Text>
        </TouchableOpacity>

        {/* Store info */}
        <SectionCard title="STORE INFO" accent={C.NAVY}>
          <InfoRow
            glyph="📍"
            label="Address"
            value={ADDRESS}
            onPress={openDirections}
            accent={C.NAVY}
          />
          <InfoRow
            glyph="📞"
            label="Shop Phone"
            value={SHOP_PHONE}
            onPress={callShop}
            accent={C.BURGUNDY}
          />
          <InfoRow
            glyph="☎️"
            label="Office Phone"
            value={OFFICE_PHONE}
            onPress={callOffice}
            accent={C.TEAL}
          />
        </SectionCard>

        {/* Owners */}
        <SectionCard title="Contact Us" accent={C.BURGUNDY}>
          {OWNERS.map((owner) => (
            <OwnerCard key={owner.dial} owner={owner} accent={C.BURGUNDY} />
          ))}
        </SectionCard>

        {/* Our story */}
        <SectionCard title="OUR STORY" accent={C.GOLD_DEEP}>
          <Text style={s.bodyText}>
            Established in {EST_YEAR}, PM Jewellers is a trusted wholesaler of
            pure silver jewellery, antique articles, and a wide range of
            silver collections — supplying retailers across India for almost
            two decades.
          </Text>
          <Text style={s.bodyText}>
            Run by Bhavik Jain, our
            business is built on craftsmanship, consistency, and long-term
            trust with our retail partners.
          </Text>
        </SectionCard>

        {/* Shipping */}
        <SectionCard title="SHIPPING" accent={C.TEAL}>
          <Text style={s.bodyText}>
            We ship pan-India to wholesalers and retailers nationwide.
          </Text>
        </SectionCard>

        <Text style={s.footerNote}>
          Crafting Silver Elegance Since {EST_YEAR}
        </Text>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─── */
function createStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.NAVY_DEEP },

    headerBlock: {
      marginHorizontal: 16,
      marginBottom: 16,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderRadius: 32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    headerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },

    headerTextWrap: {
      flex: 1,
    },
    kicker: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10,
      letterSpacing: 3,
      color: 'rgba(255,255,255,0.92)',
      marginBottom: 4,
    },
    mainTitle: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 28,
      color: '#FFFFFF',
      marginBottom: 2,
    },
    shopTagline: {
      fontFamily: 'Helvetica', fontWeight: '300',
      fontSize: 11,
      letterSpacing: 0.3,
      color: 'rgba(255,255,255,0.78)',
    },

    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      borderTopWidth: 4,
      borderTopColor: '#0A0A0B',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 48,
    },

    mapWrap: {
      height: 200,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: c.BORDER_SOFT,
      marginBottom: 10,
    },
    map: { flex: 1 },

    directionsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.BURGUNDY,
      borderRadius: 14,
      paddingVertical: 12,
      marginBottom: 20,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    directionsGlyph: {
      color: '#FFFFFF',
      fontSize: 14,
    },
    directionsLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 12,
      letterSpacing: 1,
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },

    bodyText: {
      fontFamily: 'Helvetica', fontWeight: '300',
      fontSize: 13,
      lineHeight: 20,
      color: c.INK,
      marginBottom: 10,
    },

    footerNote: {
      fontFamily: 'Helvetica', fontWeight: '500',
      fontSize: 13,
      color: c.INK,
      textAlign: 'center',
      opacity: 0.7,
      marginTop: 8,
    },

  });
}

function createCardStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.PAPER,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 5,
    },
    rule: {
      width: 24,
      height: 3,
      borderRadius: 2,
      marginBottom: 10,
    },
    title: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 11,
      letterSpacing: 2,
      color: c.MUTED,
      marginBottom: 12,
    },
  });
}

function createRowStyles(c: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
    },
    glyphCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    glyph: { fontSize: 15 },
    textWrap: { flex: 1 },
    label: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.MUTED,
      marginBottom: 2,
    },
    value: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 13,
      color: c.INK,
      lineHeight: 18,
    },
    chevron: {
      fontSize: 20,
      color: c.BORDER_SOFT,
      marginLeft: 8,
    },
  });
}

function createOwnerStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.BORDER_SOFT,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarGlyph: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 18,
    },
    info: { flex: 1 },
    name: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 13,
      color: c.INK,
    },
    phone: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 11,
      color: c.MUTED,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionGlyph: { fontSize: 14 },
  });
}
