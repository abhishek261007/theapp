import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActiveCampaign } from '../services/campaigns';

type Props = {
  campaign: ActiveCampaign;
  colors: any;
};

const CARD_W = 270;
const CARD_H = 152;
const STORAGE_PREFIX = 'pmj:scratch-revealed:';

export default function ScratchOfferCard({ campaign, colors: C }: Props) {
  const [strokes, setStrokes] = useState<{ x: number; y: number }[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [compact, setCompact] = useState(false);
  const shimmer = useRef(new Animated.Value(0)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(C), [C]);

  useEffect(() => {
    AsyncStorage.getItem(`${STORAGE_PREFIX}${campaign._id}`).then((value) => {
      if (value === '1') {
        setRevealed(true);
        setCompact(true);
        revealAnim.setValue(1);
      }
    });
  }, [campaign._id, revealAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  useEffect(() => {
    if (revealed) {
      Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, tension: 45, friction: 8 }).start();
      AsyncStorage.setItem(`${STORAGE_PREFIX}${campaign._id}`, '1');
    }
  }, [campaign._id, revealAnim, revealed]);

  const addStroke = useCallback((x: number, y: number) => {
    if (revealed || x < 0 || y < 0 || x > CARD_W || y > CARD_H) return;
    setStrokes((current) => {
      const next = [...current, { x, y }].slice(-34);
      if (next.length >= 18) setRevealed(true);
      return next;
    });
  }, [revealed]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => addStroke(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
    onPanResponderMove: (evt) => addStroke(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
  }), [addStroke]);

  const overlayOpacity = revealed ? revealAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) : 1;
  const shineX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W, CARD_W] });
  const scale = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  if (compact) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => setCompact(false)} style={styles.compactWrap}>
        <LinearGradient colors={[C.BURGUNDY, C.NAVY]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.compactGradient}>
          <View style={styles.compactCopy}>
            <Text style={styles.compactKicker}>Unlocked offer</Text>
            <Text style={styles.compactTitle} numberOfLines={1}>{campaign.name}</Text>
          </View>
          <View style={styles.compactCodePill}>
            <Text selectable style={styles.compactCode}>{campaign.offerCode}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.copyBlock}>
        <Text style={styles.kicker}>Limited festive privilege</Text>
        <Text style={styles.title}>{campaign.name}</Text>
        <Text style={styles.desc} numberOfLines={2}>{campaign.description || 'Scratch to reveal your private PM Jewellers offer.'}</Text>
      </View>

      <View style={styles.cardShell}>
        <LinearGradient colors={[C.BURGUNDY, C.NAVY, C.TEAL]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rewardCard}>
          <Animated.View style={[styles.rewardInner, { transform: [{ scale }] }]}>
            <Text style={styles.rewardLabel}>Your Offer Code</Text>
            <Text selectable style={styles.code}>{campaign.offerCode}</Text>
            {campaign.showValidTill !== false && (
              <Text style={styles.expiry}>Valid till {formatEnd(campaign.endAt)}</Text>
            )}
          </Animated.View>

          <Animated.View pointerEvents={revealed ? 'none' : 'auto'} {...panResponder.panHandlers} style={[styles.scratchLayer, { opacity: overlayOpacity }]}>
            <LinearGradient colors={['#F7EFE1', '#D9C08B', '#FFF8E7', '#A98641']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shine, { transform: [{ translateX: shineX }, { rotate: '18deg' }] }]} />
            <Text style={styles.scratchGlyph}>◆</Text>
            <Text style={styles.scratchText}>Scratch to reveal</Text>
            <Text style={styles.scratchHint}>drag across the satin foil</Text>
            {strokes.map((p, i) => (
              <View key={`${p.x}-${p.y}-${i}`} style={[styles.clearMark, { left: p.x - 18, top: p.y - 18 }]} />
            ))}
          </Animated.View>
        </LinearGradient>
      </View>

      {!revealed && (
        <TouchableOpacity activeOpacity={0.8} onPress={() => setRevealed(true)} style={styles.revealBtn}>
          <Text style={styles.revealBtnText}>Reveal instantly</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatEnd(endAt: string) {
  return new Date(endAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function createStyles(C: any) {
  return StyleSheet.create({
    wrap: { marginBottom: 18, borderRadius: 28, backgroundColor: C.PAPER, padding: 16, shadowColor: C.NAVY_DEEP, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 5 },
    compactWrap: { marginBottom: 14, borderRadius: 22, shadowColor: C.NAVY_DEEP, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
    compactGradient: { minHeight: 76, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
    compactCopy: { flex: 1 },
    compactKicker: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 9, letterSpacing: 1.8, color: 'rgba(255,255,255,0.68)', textTransform: 'uppercase' },
    compactTitle: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 22, color: '#FFFFFF', marginTop: 2 },
    compactCodePill: { borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 12, paddingVertical: 8 },
    compactCode: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 13, letterSpacing: 1.5, color: '#FFFFFF' },
    copyBlock: { marginBottom: 14 },
    kicker: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.GOLD_DEEP },
    title: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 28, lineHeight: 32, color: C.INK, marginTop: 4 },
    desc: { fontFamily: 'Helvetica', fontWeight: '300', fontSize: 12, lineHeight: 18, color: C.MUTED, marginTop: 4 },
    cardShell: { alignItems: 'center' },
    rewardCard: { width: CARD_W, height: CARD_H, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    rewardInner: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    rewardLabel: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' },
    code: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 42, letterSpacing: 3, color: '#FFFFFF', marginTop: 4 },
    expiry: { fontFamily: 'Helvetica', fontWeight: '300', fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 6 },
    scratchLayer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    shine: { position: 'absolute', width: 74, height: 260, backgroundColor: 'rgba(255,255,255,0.36)' },
    scratchGlyph: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 24, color: C.BURGUNDY, marginBottom: 6 },
    scratchText: { fontFamily: 'Helvetica', fontWeight: '600', fontSize: 25, color: C.NAVY_DEEP },
    scratchHint: { fontFamily: 'Helvetica', fontWeight: '300', fontSize: 10, color: C.MUTED, letterSpacing: 1.7, textTransform: 'uppercase', marginTop: 4 },
    clearMark: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.55)' },
    revealBtn: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: C.TINT },
    revealBtnText: { fontFamily: 'Helvetica', fontWeight: '600', color: C.BURGUNDY, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  });
}
