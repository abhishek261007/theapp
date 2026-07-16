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

import { FontAwesome, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScratchOfferCard from '../../components/ScratchOfferCard';
import { useColors, Colors } from '../../colors';
import { ActiveCampaign, fetchActiveCampaign } from '../../services/campaigns';
import api from '../../services/api';
import useCartStore from '../../store/cartStore';
import { useShimmer } from '../../hooks/useShimmer';
import { SCREEN_WIDTH } from '../../utils/layout';
import { WHATSAPP_NUMBER } from '../../utils/constants';

/* ─── Contact links ─── */
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi! I would like to enquire about your silver jewellery catalogue.')}`;
const INSTAGRAM_URL = 'https://www.instagram.com/2005_pmjewellers/';

const GRID_GAP = 12;
const H_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP) / 2;

import { CatalogCard, Catalog } from '../../components/home/CatalogCard';

/* ─── Header Title ─── */
function HeaderTitle() {
  return (
    <View>
      <Text style={headerStyles.mainTitle} numberOfLines={1} adjustsFontSizeToFit>PM Jewellers</Text>
      <Text style={headerStyles.subTitle}>Wholesaler of Silver Ornaments & Articles</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  mainTitle: {
    fontFamily: 'Helvetica', fontWeight: '600',
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  subTitle: {
    fontFamily: 'Helvetica', fontWeight: '300',
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
});

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  const C = useColors();
  const s = useMemo(() => createSkeletonStyles(C), [C]);
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

function createSkeletonStyles(c: Colors) {
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



/* ─── Footer Links (WhatsApp / Instagram) ─── */
function FooterLinks() {
  const C = useColors();
  const s = useMemo(() => createFooterStyles(C), [C]);

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

function createFooterStyles(c: Colors) {
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
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10,
      letterSpacing: 0.5,
      color: c.INK,
    },
    tagline: {
      fontFamily: 'Helvetica', fontWeight: '500',
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
  const s = useMemo(() => createStyles(C), [C]);
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
      params: { id: item._id, name: item.name, dominantColor: item.dominantColor || '' },
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
      <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />
      {/* ── Bright gradient header ── */}
      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.headerBlock, { marginTop: insets.top + 12 }]}
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
            <View style={{ alignItems: 'center' }}>
              <Feather name="shopping-bag" size={20} color="#FFFFFF" />
              <Text style={s.cartBtnLabel}>My Order</Text>
            </View>
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
function createStyles(c: Colors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.NAVY_DEEP,
    },

    /* ── Floating gradient header block ── */
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
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },

    /* Cart */
    cartBtn: {
      width: 64, height: 64,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
    },
    cartBtnLabel: {
      fontFamily: 'Helvetica', fontWeight: '500',
      fontSize: 10, color: '#FFFFFF', marginTop: 4,
    },

    badge: {
      position: 'absolute', top: -4, right: -4,
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: c.GOLD_DEEP,
      alignItems: 'center', justifyContent: 'center',
    },
    badgeText: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 8, color: '#FFFFFF', letterSpacing: 0.2,
    },

    /* ── Cream body ── */
    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      borderTopWidth: 4,
      borderTopColor: '#0A0A0B',
      paddingHorizontal: 16,
      paddingTop: 20,
    },

    /* Count */
    countRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    countLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 30,
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 24,
      color: c.INK,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: 'Helvetica', fontWeight: '300',
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
      alignSelf: 'center',
    },
    retryLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
  });
}
