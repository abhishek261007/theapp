/**
 * CatalogsScreen.tsx — Vibrant Catalogue Redesign
 *
 * Design language: Bright, premium-but-friendly silver jewellery brand
 *  — Soft pink → purple → blue gradient header (no black/dark tones)
 *  — Cormorant Garamond + Outfit pairing
 *  — 2-column masonry-free grid, fixed comfortable card height
 *  — Gold + magenta + violet + teal accents (pamphlet-inspired palette)
 *  — Soft shadows instead of borders for depth on a light background
 *  — Skeleton shimmer loading (warm gold pulse on cream)
 *  — Pill-shaped search bar with colorful focus ring
 *
 * NOTE: Uses `expo-linear-gradient` for the header wash. If it isn't
 * already installed, run: npx expo install expo-linear-gradient
 */

import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CartIcon from '../../assets/images/cart.png';
import ScratchOfferCard from '../../components/ScratchOfferCard';
import { useColors } from '../../colors';
import { ActiveCampaign, fetchActiveCampaign } from '../../services/campaigns';
import api from '../../services/api';
import useCartStore from '../../store/cartStore';
const API_BASE = 'https://apis.27012610.xyz';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ─── Contact links ─── */
const WHATSAPP_NUMBER = '919712779146'; // country code + number, no symbols
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi! I would like to enquire about your silver jewellery catalogue.')}`;
const INSTAGRAM_URL = 'https://www.instagram.com/2005_pmjewellers/';

const GRID_GAP = 12;
const H_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP) / 2;

/* ─── Types ─── */
type Catalog = {
  _id: string;
  name: string;
  description?: string;
  heroImageUrl?: string;
  updatedAt?: string;
};

function buildHeroUrl(heroImageUrl?: string, updatedAt?: string): string | null {
  if (!heroImageUrl) return null;
  // Seed the cache-buster from both the file name and updatedAt so it changes
  // whenever the image content changes (covers re-uploads that reuse a name).
  const seed = `${heroImageUrl}:${updatedAt ?? ''}`;
  const cacheBuster = `v=${encodeURIComponent(seed)}`;
  if (heroImageUrl.startsWith('http')) {
    return `${heroImageUrl}${heroImageUrl.includes('?') ? '&' : '?'}${cacheBuster}`;
  }
  return `${API_BASE}${heroImageUrl}?${cacheBuster}`;
}

/* ─── Shimmer Hook ─── */
function useShimmer(duration = 1600) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);
  return anim;
}

/* ─── Header Title (gradient-safe, no shimmer-over-dark needed) ─── */
function HeaderTitle() {
  return (
    <View>
      <Text style={headerStyles.mainTitle}>PM Jewellers</Text>
      <Text style={headerStyles.subTitle}>Wholesaler of Silver Ornaments & Articles</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  mainTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  subTitle: {
    fontFamily: 'Outfit_300Light',
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
});

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  const C = useColors();
  const s = createSkeletonStyles(C);
  const shimmer = useShimmer(1200);
  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.85, 0.4],
  });

  return (
    <Animated.View style={[s.card, { opacity }]}>
      <View style={s.imageBlock} />
      <View style={s.inner}>
        <View style={s.nameLine} />
        <View style={s.nameLineShort} />
      </View>
    </Animated.View>
  );
}

function createSkeletonStyles(c) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      height: 310,
      borderRadius: 18,
      backgroundColor: c.PAPER,
      marginBottom: GRID_GAP,
      overflow: 'hidden',
    },
    imageBlock: {
      height: 210,
      backgroundColor: c.TINT,
    },
    inner: {
      padding: 12,
    },
    nameLine: {
      width: '80%',
      height: 12,
      backgroundColor: c.BORDER_SOFT,
      borderRadius: 4,
      marginBottom: 8,
    },
    nameLineShort: {
      width: '50%',
      height: 10,
      backgroundColor: c.BORDER_SOFT,
      borderRadius: 4,
    },
  });
}

/* ─── Catalog Card (2-column grid item) ─── */
interface CatalogCardProps {
  item: Catalog;
  index: number;
  onPress: () => void;
}

const CatalogCard = memo(function CatalogCard({
  item,
  index,
  onPress,
}: CatalogCardProps) {
  const C = useColors();
  const s = createCardStyles(C);
  const ACCENTS = [C.BURGUNDY, C.NAVY, C.TEAL, C.GOLD_DEEP];
  const pressAnim = useRef(new Animated.Value(0)).current;
  const heroUri = buildHeroUrl(item.heroImageUrl, item.updatedAt);
  const accent = ACCENTS[index % ACCENTS.length];

  const onPressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const onPressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const scale = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: CARD_WIDTH }}
    >
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        {/* Image block */}
        <View style={s.imageWrap}>
          {heroUri ? (
            <Image key={heroUri} source={{ uri: heroUri }} style={s.image} resizeMode="cover" />
          ) : (
            <View style={[s.image, s.placeholderBg, { backgroundColor: accent + '22' }]}>
              <Text style={[s.placeholderGlyph, { color: accent }]}>◆</Text>
            </View>
          )}

          {/* Arrow badge */}
          <View style={s.arrowCircle}>
            <Text style={[s.arrowGlyph, { color: accent }]}>↗</Text>
          </View>
        </View>

        {/* Text block */}
        <View style={s.textBlock}>
          <View style={[s.goldRule, { backgroundColor: accent }]} />
          <Text style={s.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={s.cardDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

function createCardStyles(c) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      backgroundColor: c.PAPER,
      marginBottom: GRID_GAP,
      overflow: 'hidden',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    imageWrap: {
      height: 210,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderBg: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 34,
    },
    indexChip: {
      position: 'absolute',
      top: 10,
      left: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    indexChipText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    arrowCircle: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    arrowGlyph: {
      fontSize: 14,
      lineHeight: 16,
    },
    textBlock: {
      padding: 12,
    },
    goldRule: {
      width: 20,
      height: 3,
      borderRadius: 2,
      marginBottom: 8,
    },
    cardName: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 17,
      lineHeight: 20,
      color: c.INK,
    },
    cardDesc: {
      fontFamily: 'Outfit_300Light',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: c.MUTED,
      marginTop: 4,
    },
  });
}

/* ─── Footer Links (WhatsApp / Instagram) ─── */
function FooterLinks() {
  const C = useColors();
  const s = createFooterStyles(C);

  const openWhatsApp = useCallback(() => {
    Linking.openURL(WHATSAPP_URL).catch(() => {});
  }, []);

  const openInstagram = useCallback(() => {
    Linking.openURL(INSTAGRAM_URL).catch(() => {});
  }, []);

  const openWeb = useCallback(() => {
    Linking.openURL("https://pmjewellers.com").catch(() => {});
  }, []);

  return (
    <View style={s.wrap}>
      <View style={s.divider} />
      <Text style={s.heading}>GET IN TOUCH</Text>

      <View style={s.row}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openWhatsApp}
          style={[s.btn, { backgroundColor: '#DDF3E7' }]}
        >
          <FontAwesome name="whatsapp" size={22} color="#2D7A55" />
          <Text style={s.btnLabel}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openInstagram}
          style={[s.btn, { backgroundColor: '#F3DDE6' }]}
        >
          <FontAwesome name="instagram" size={22} color="#8B4562" />
          <Text style={s.btnLabel}>Instagram</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openWeb}
          style={[s.btn, { backgroundColor: '#DDE8F3' }]}
        >
          <FontAwesome name="globe" size={22} color="#456A8B" />
          <Text style={s.btnLabel}>Website</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.tagline}>Crafting Silver Elegance Since Generations</Text>
    </View>
  );
}

function createFooterStyles(c) {
  return StyleSheet.create({
    wrap: {
      paddingTop: 8,
      paddingBottom: 32,
      alignItems: 'center',
    },
    divider: {
      width: '100%',
      height: 1,
      backgroundColor: c.BORDER_SOFT,
      marginBottom: 20,
    },
    heading: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 11,
      letterSpacing: 2.5,
      color: c.MUTED,
      marginBottom: 14,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    btn: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    btnLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      letterSpacing: 0.5,
      color: c.INK,
    },
    tagline: {
      fontFamily: 'CormorantGaramond_500Medium',
      fontSize: 13,
      color: c.INK,
      marginTop: 20,
      textAlign: 'center',
      opacity: 0.75,
    },
  });
}

/* ─── Main Screen ─── */
export default function CatalogsScreen() {
  const C = useColors();
  const s = createStyles(C);
  const insets = useSafeAreaInsets();
  const [catalogs, setCatalogs]     = useState<Catalog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null);
  const cartCount = useCartStore((s) => s.items.length);

  /* ── Data fetching ── */
  const fetchData = useCallback(async (bypass = false) => {
    setError(false);
    try {
      const res = await api.get(
        '/public/catalogs',
        bypass ? { headers: { 'x-bypass-cache': '1' } } : undefined
      );
      const data = Array.isArray(res.data) ? (res.data as Catalog[]) : [];
      setCatalogs(data);
      setActiveCampaign(await fetchActiveCampaign());
    } catch (err) {
      console.error(err);
      setError(true);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const openCatalog = useCallback((item: Catalog) => {
    router.push({
      pathname: '/catalog/[id]',
      params: { id: item._id, name: item.name },
    });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Catalog; index: number }) => (
      <CatalogCard
        item={item}
        index={index}
        onPress={() => openCatalog(item)}
      />
    ),
    [openCatalog]
  );

  return (
    <View style={s.safe}>
      {/* ── Bright gradient header ── */}
      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.headerBlock, { paddingTop: insets.top + 14 }]}
      >
        <View style={s.headerInner}>
          <View style={{ flexShrink: 1 }}>
            <HeaderTitle />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/cart')}
            style={s.cartBtn}
          >
              <Image
                source={CartIcon}
                style={{
                  width: 36,
                  height: 36,
                  resizeMode: 'contain',
                }}
              />
            <Text style={s.cartLabel}>My Order</Text>
            {cartCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>



      {/* ── Main content (cream bg) ── */}
      <View style={s.body}>

        {/* Count row */}
        {!loading && !error && (
          <View style={s.countRow}>
            <Text style={s.countLabel}>COLLECTIONS</Text>
            <View style={s.countPill}>
              <Text style={s.countNum}>{catalogs.length}</Text>
            </View>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={s.skeletonGrid}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <FlatList<Catalog>
            data={error ? [] : catalogs}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={s.columnWrapper}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.BURGUNDY}
                colors={[C.GRADIENT_B, C.GRADIENT_C]}
              />
            }
            contentContainerStyle={[
              s.listContent,
              (error || catalogs.length === 0) && s.listContentGrow,
            ]}
            renderItem={renderItem}
            ListHeaderComponent={
              !error && activeCampaign ? <ScratchOfferCard campaign={activeCampaign} colors={C} /> : null
            }
            ListFooterComponent={
              !error && catalogs.length > 0 ? <FooterLinks /> : null
            }
            ListEmptyComponent={
              error ? (
                <View style={s.centerBox}>
                  <Text style={[s.emptyGlyph, { color: C.BURGUNDY }]}>◆</Text>
                  <Text style={s.emptyTitle}>Failed to load</Text>
                  <Text style={s.emptySubtitle}>Pull down to try again</Text>
                  <TouchableOpacity
                    style={s.retryBtn}
                    activeOpacity={0.7}
                    onPress={loadInitial}
                  >
                    <Text style={s.retryLabel}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.centerBox}>
                  <Text style={[s.emptyGlyph, { color: C.NAVY }]}>◆</Text>
                  <Text style={s.emptyTitle}>No collections yet</Text>
                  <Text style={s.emptySubtitle}>Pull down to refresh</Text>
                </View>
              )
            }
          />
        )}
      </View>
    </View>
  );
}

/* ─── Global Styles ─── */
function createStyles(c) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.NAVY_DEEP,
    },

    /* ── Gradient header block ── */
    headerBlock: {
      paddingHorizontal: 20,
      paddingBottom: 22,
      //borderBottomLeftRadius: 28,
      //borderBottomRightRadius: 28,
    },
    headerInner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },

    /* Cart */
    cartBtn: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },

    cartLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#0C0C0C',
      textAlign: 'center',
    },

    badge: {
      position: 'absolute', top: -4, right: -4,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: c.GOLD_DEEP,
      alignItems: 'center', justifyContent: 'center',
    },
    badgeText: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 8, color: '#FFFFFF', letterSpacing: 0.2,
    },

    /* ── Cream body ── */
    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      paddingHorizontal: H_PADDING,
      paddingTop: 16,
    },

    /* Count */
    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    countLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 11,
      letterSpacing: 2,
      color: c.MUTED,
    },
    countPill: {
      backgroundColor: c.TINT,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    countNum: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12,
      color: c.BURGUNDY,
    },

    /* Grid */
    columnWrapper: {
      justifyContent: 'space-between',
    },
    skeletonGrid: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    /* List */
    listContent: {
      paddingBottom: 60,
    },
    listContentGrow: {
      flexGrow: 1,
    },

    /* Empty / Error */
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
      width: SCREEN_WIDTH - H_PADDING * 2,
    },
    emptyGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 30,
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 24,
      color: c.INK,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: 'Outfit_300Light',
      fontSize: 11,
      letterSpacing: 1.5,
      color: c.MUTED,
      textAlign: 'center',
      textTransform: 'uppercase',
      lineHeight: 20,
    },

    /* Retry */
    retryBtn: {
      marginTop: 24,
      borderRadius: 14,
      backgroundColor: c.BURGUNDY,
      paddingVertical: 12,
      paddingHorizontal: 32,
    },
    retryLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
  });
}
