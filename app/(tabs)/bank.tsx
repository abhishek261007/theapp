import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, Colors } from '../../colors';

export default function BankScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();

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
            <Text style={s.kicker}>SECURE PAYMENTS</Text>
            <Text style={s.mainTitle}>Bank Details</Text>
            <Text style={s.shopTagline}>
              Official bank account information for PM Jewellers
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title="BANK DETAILS" accent={C.NAVY}>
          <InfoRow glyph="🏛️" label="Bank Name" value="Axis Bank Ltd" accent={C.NAVY} />
          <InfoRow glyph="👤" label="Account Name" value="PM Jewellers" accent={C.BURGUNDY} />
          <InfoRow glyph="🔢" label="Account Number" value="917020045859264" accent={C.TEAL} />
          <InfoRow glyph="🔠" label="IFSC Code" value="UTIB0000453" accent={C.GOLD_DEEP} />
          <InfoRow glyph="📍" label="Branch" value="Relief Road, Ahmedabad" accent={C.NAVY} />
          <InfoRow glyph="📝" label="GSTIN" value="24AEHPJ9576K1ZX" accent={C.BURGUNDY} />
        </SectionCard>
      </ScrollView>
    </View>
  );
}

/* ─── Section card wrapper ─── */
function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
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

/* ─── Tappable info row ─── */
function InfoRow({ glyph, label, value, onPress, accent }: { glyph: string; label: string; value: string; onPress?: () => void; accent: string }) {
  const C = useColors();
  const s = useMemo(() => createRowStyles(C), [C]);
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper activeOpacity={0.7} onPress={onPress} style={s.row}>
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

/* ─── Styles ─── */
function createStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.NAVY_DEEP },
    headerBlock: {
      marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 20, paddingVertical: 20,
      borderRadius: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
    },
    headerInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    headerTextWrap: { flex: 1 },
    kicker: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.92)', marginBottom: 4 },
    mainTitle: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 28, color: '#FFFFFF', marginBottom: 2 },
    shopTagline: { fontFamily: 'Helvetica', fontWeight: '300', fontSize: 11, letterSpacing: 0.3, color: 'rgba(255,255,255,0.78)' },
    body: { flex: 1, backgroundColor: c.CREAM, borderTopWidth: 4, borderTopColor: '#0A0A0B' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },
  });
}

function createCardStyles(c: Colors) {
  return StyleSheet.create({
    card: { backgroundColor: c.PAPER, borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: c.NAVY_DEEP, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 5 },
    rule: { width: 24, height: 3, borderRadius: 2, marginBottom: 10 },
    title: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 11, letterSpacing: 2, color: c.MUTED, marginBottom: 12 },
  });
}

function createRowStyles(c: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
    glyphCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    glyph: { fontSize: 15 },
    textWrap: { flex: 1 },
    label: { fontFamily: 'Helvetica', fontWeight: '400', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: c.MUTED, marginBottom: 2 },
    value: { fontFamily: 'Helvetica', fontWeight: '400', fontSize: 13, color: c.INK, lineHeight: 18 },
    chevron: { fontSize: 20, color: c.BORDER_SOFT, marginLeft: 8 },
  });
}
