/**
 * DesignDetailsScreen.tsx — Luxury Editorial Redesign
 *
 * Changes from original:
 *  — No vertical scroll: all content fits screen height (ScrollView → View, image uses flex: 1)
 *  — Smooth horizontal paging: pagingEnabled replaced with snapToInterval + decelerationRate 0.92
 *    + disableIntervalMomentum so fast swipes advance exactly one page
 *  — Design language mirrors CatalogDetailsScreen.tsx:
 *      Deep obsidian (#0A0A0B) header with animated gold shimmer title + eyebrow rules
 *      Cormorant Garamond + Outfit pairing at editorial sizes
 *      Cream (#F7F6F3 / #F0EFE9) body background
 *      Gold (#C9A96E / #D4AF37) as sole accent
 *      Cartier-style dark marquee ticker with ◆ diamond glyphs
 *      Back button and Cart button styled as obsidian-bordered architectural squares
 *      "1 / N" counter in Cormorant with gold divider
 *      Spec cells with Outfit uppercase labels + Cormorant values
 *      Full "fly to cart" animation system preserved
 *  — NEW: reapplies the search / weight filter forwarded from
 *    CatalogDetailsScreen (via route params) so the horizontal pager only
 *    moves through the same filtered set of designs the user was browsing.
 */

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ListRenderItemInfo,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewabilityConfig,
} from 'react-native';
import ImageZoom from 'react-native-image-pan-zoom';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../colors';
import api from '../../services/api';
import useCartStore, { CartStore } from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { useShimmer } from '../../hooks/useShimmer';
import { CartAnimationProvider, useCartAnimation } from '../../components/providers/CartAnimationProvider';
import { ShimmerBar } from '../../components/ui/ShimmerBar';
import { ImageGallery } from '../../components/design/ImageGallery';
import { ActionTray } from '../../components/design/ActionTray';
import { Design } from '../../components/catalog/DesignCard';

type RouteParams = {
  id: string;
  catalogId?: string;
  catalogName?: string;
  sku?: string;
  weight?: string;
  status?: string;
  imageUrl?: string;
  initialIndex?: string;
  // ── filter carried over from CatalogDetailsScreen ──
  search?: string;
  minWeight?: string;
  maxWeight?: string;
};

/* ─── Constants ─── */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LOOP_COPIES = 5;
const LOOP_MIDDLE_COPY = Math.floor(LOOP_COPIES / 2);

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 20,
  minimumViewTime: 0,
};

/* ─── Pure helpers ─── */
function buildImageUrl(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const img = String(imageUrl);
  if (img.startsWith('http')) return img;
  return `https://apis.27012610.xyz${img}`;
}

function keyExtractor(item: Design, index: number): string {
  return `${item._id}-${index}`;
}

/**
 * Reapplies the same search / weight filter logic used in
 * CatalogDetailsScreen.tsx, given the raw string params forwarded over
 * navigation. Kept as a pure function so it's easy to keep both screens'
 * filtering behavior in sync.
 */
function applyForwardedFilter(
  list: Design[],
  search: string | undefined,
  minWeight: string | undefined,
  maxWeight: string | undefined
): Design[] {
  let result = list;

  const q = (search ?? '').trim();
  if (q) {
    const tokens  = q.split(/\s+/).filter(Boolean);
    const regexes = tokens.map(
      (t) => new RegExp(`(?:^|[\\s\\-_])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
    );
    result = result.filter((item) => {
      const haystack = `${item.catalogName ?? ''} ${item.sku ?? ''}`;
      return regexes.every((re) => re.test(haystack));
    });
  }

  const min = (minWeight ?? '').trim() ? parseFloat(minWeight as string) : null;
  const max = (maxWeight ?? '').trim() ? parseFloat(maxWeight as string) : null;
  if (min !== null && !Number.isNaN(min)) {
    result = result.filter((item) => item.weight >= min);
  }
  if (max !== null && !Number.isNaN(max)) {
    result = result.filter((item) => item.weight <= max);
  }

  return result;
}



/* ═══════════════════════════════════════════════════════════════
   Main Screen
   ═══════════════════════════════════════════════════════════════ */
export default function DesignDetailsScreen() {
  const params = useLocalSearchParams<RouteParams>();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = createStyles(C);

  const [designs, setDesigns]         = useState<Design[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  const loopedDesigns = useMemo(
    () => designs.length > 1 ? Array.from({ length: LOOP_COPIES }, () => designs).flat() : designs,
    [designs]
  );
  const initialScrollIndex = designs.length > 1 ? (designs.length * LOOP_MIDDLE_COPY) + activeIndex : activeIndex;

  const [modalVisible, setModalVisible]   = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const flatListRef    = useRef<FlatList<Design>>(null);
  const addToCart      = useCartStore((s: CartStore) => s.addToCart);
  const cartItems      = useCartStore((s: CartStore) => s.items);
  const cartCount      = cartItems.length;
const wishlistItems  = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const hasWishlist    = useCallback(
    (id: string) => wishlistItems.some((i) => i._id === id),
    [wishlistItems]
  );

  const modalOpacity   = useRef(new Animated.Value(0)).current;
  const modalAnimRef   = useRef<Animated.CompositeAnimation | null>(null);

  const cartIconRef    = useRef<View>(null);
  const cartScaleAnim  = useRef(new Animated.Value(1)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;
  const imageRefs      = useRef<Record<number, React.RefObject<View>>>({});
  const rawIndexRef    = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  /* ── Active design for header title ── */
  const activeDesign = designs[activeIndex] ?? null;
  const headerTitle  = activeDesign?.catalogName ?? String(params.catalogName ?? '');

  /* ── Whether a filter was forwarded from the catalog screen ── */
  const hasForwardedFilter =
    (params.search ?? '').trim() !== '' ||
    (params.minWeight ?? '').trim() !== '' ||
    (params.maxWeight ?? '').trim() !== '';

  /* ── Fetch — then reapply the same filter that was active on
         CatalogDetailsScreen so the pager only contains matching designs ── */
  useEffect(() => {
    async function fetchDesigns() {
      try {
        const res       = await api.get(`/public/designs?catalogId=${params.catalogId}`);
        let available    = (res.data as Design[]).filter((d) => d.status === 'available');

        // ── reapply the search / weight filter passed in from the catalog screen ──
        available = applyForwardedFilter(available, params.search, params.minWeight, params.maxWeight);

        const foundIndex = available.findIndex((d) => d._id === String(params.id));
        setDesigns(available);
        setActiveIndex(foundIndex >= 0 ? foundIndex : 0);
      } catch (err) {
        console.error('[DesignDetails] fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }
    if (params.catalogId) {
      fetchDesigns();
    } else {
      // Single design view (e.g. from wishlist) — just show this one item
      setDesigns([{
        _id:         String(params.id),
        catalogName: params.catalogName ?? '',
        sku:         params.sku ?? '',
        weight:      parseFloat(String(params.weight ?? '0')),
        status:      params.status ?? 'available',
        imageUrl:    params.imageUrl ?? '',
      }]);
      setLoading(false);
    }
  }, [params.catalogId, params.id, params.search, params.minWeight, params.maxWeight,
      params.catalogName, params.imageUrl, params.sku, params.status, params.weight]);

  /* ── Scroll to active only when designs first load ── */
  useEffect(() => {
    const index = activeIndexRef.current;
    if (designs.length > 0 && index >= 0 && index < designs.length) {
      const target = designs.length > 1 ? (designs.length * LOOP_MIDDLE_COPY) + index : index;
      flatListRef.current?.scrollToIndex({ index: target, animated: false });
    }
  }, [designs]);

  /* ── Modal callbacks ── */
  const openModal = useCallback((url: string | null) => {
    if (!url) return;
    modalAnimRef.current?.stop();
    setModalImageUrl(url);
    setModalVisible(true);
    const anim = Animated.timing(modalOpacity, {
      toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true,
    });
    modalAnimRef.current = anim;
    anim.start();
  }, [modalOpacity]);

  const closeModal = useCallback(() => {
    modalAnimRef.current?.stop();
    const anim = Animated.timing(modalOpacity, {
      toValue: 0, duration: 180, easing: Easing.in(Easing.ease), useNativeDriver: true,
    });
    modalAnimRef.current = anim;
    anim.start(() => { setModalVisible(false); modalAnimRef.current = null; });
  }, [modalOpacity]);

  /* ── Cart ── */
  const handleAddToCart = useCallback((item: Design) => {
    addToCart({
      _id:      item._id,
      title:    String(params.catalogName ?? item.catalogName),
      sku:      item.sku,
      weight:   item.weight,
      status:   item.status,
      imageUrl: item.imageUrl,
    });
  }, [addToCart, params.catalogName]);

  /* ── Viewability: track active index ── */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems.length === 0) return;
      const rawIndex = viewableItems[0].index ?? 0;
      const len = designs.length;
      if (len === 0) return;

      rawIndexRef.current = rawIndex;
      setActiveIndex(rawIndex % len);
    },
    [designs.length]
  );

  /* ── Loop: warp back to the middle copy after momentum settles.
       With a large windowSize, views at the target position are already
       rendered so the offset change is invisible.                    ── */
  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const rawPage = e.nativeEvent.contentOffset.x / SCREEN_W;
      const len = designs.length;
      if (len <= 1) return;

      const page = Math.round(rawPage);
      const normalizedPage = ((page % len) + len) % len;
      const centeredPage = (len * LOOP_MIDDLE_COPY) + normalizedPage;
      if (page !== centeredPage) {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({ index: centeredPage, animated: false });
        });
      }
    },
    [designs.length]
  );

  /* ── renderItem ── */
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Design>) => (
      <DesignPage
        item={item}
        index={index}
        total={designs.length}
        bottomInset={insets.bottom}
        onOpenModal={openModal}
        isWishlisted={hasWishlist(item._id)}
        onToggleWishlist={(d) => toggleWishlist({
          _id: d._id,
          catalogName: d.catalogName,
          sku: d.sku,
          weight: d.weight,
          imageUrl: d.imageUrl,
        })}
        setImageRef={(ref) => { imageRefs.current[index] = ref; }}
      />
    ),
    [openModal, designs.length, insets.bottom, hasWishlist, toggleWishlist, imageRefs]
  );

  /* ── Loading state ── */
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.NAVY_DEEP, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />
        <Text style={{ fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, color: C.GOLD, opacity: 0.5, letterSpacing: 2 }}>
          ◆
        </Text>
        <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginTop: 14 }}>
          Loading
        </Text>
      </View>
    );
  }

  return (
    <CartAnimationProvider
      cartIconRef={cartIconRef}
      cartScaleAnim={cartScaleAnim}
      badgeScaleAnim={badgeScaleAnim}
    >
      <View style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />

        {/* ── Fullscreen zoom modal ── */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeModal}
        >
          <Animated.View style={[styles.modalContainer, { opacity: modalOpacity }]}>
            <TouchableOpacity style={styles.modalClose} activeOpacity={0.95} onPress={closeModal}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalHint}>Pinch or swipe down to close</Text>
            {modalImageUrl && (
              <ImageZoom
                cropWidth={SCREEN_W}
                cropHeight={SCREEN_H}
                imageWidth={SCREEN_W}
                imageHeight={SCREEN_H}
                enableSwipeDown
                onSwipeDown={closeModal}
                minScale={1}
                maxScale={4}
              >
                <Image
                  source={modalImageUrl}
                  style={{ width: SCREEN_W, height: SCREEN_H }}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </ImageZoom>
            )}
          </Animated.View>
        </Modal>

        {/* ══════════════════════════════════════════
            GRADIENT HEADER — matches CatalogsScreen
            ══════════════════════════════════════════ */}
        <LinearGradient
          colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBlock, { marginTop: insets.top + 12 }]}
        >
          {/* Title row */}
          <View style={styles.headerInner}>

            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.0}
              style={styles.backBtn}
            >
              <Text style={styles.backGlyph}>←</Text>
            </TouchableOpacity>

            {/* Title + counter */}
            <View style={styles.headerTitleWrap}>
              <Text
                style={styles.mainTitle}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {headerTitle}
              </Text>
              {designs.length > 1 && (
                <View style={styles.counterRow}>
                  <Text style={styles.counterText}>
                    {activeIndex + 1}
                    <Text style={styles.counterDivider}> / </Text>
                    {designs.length}
                  </Text>
                  {hasForwardedFilter && (
                    <View style={styles.filteredChip}>
                      <Text style={styles.filteredChipText}>Filtered</Text>
                    </View>
                  )}
                </View>
              )}
              {/* Gold shimmer overlay */}
              <View style={styles.shimmerClip} pointerEvents="none">
                <ShimmerBar />
              </View>
            </View>

            {/* Cart button (animated) */}
            <Animated.View style={{ transform: [{ scale: cartScaleAnim }] }}>
              <TouchableOpacity
                ref={cartIconRef}
                onPress={() => router.push('/cart')}
                activeOpacity={0.8}
                style={styles.cartBtn}
                collapsable={false}
              >
                <Feather name="shopping-bag" size={24} color="#FFFFFF" />
                {cartCount > 0 && (
                  <Animated.View style={[styles.badge, { transform: [{ scale: badgeScaleAnim }] }]}>
                    <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>

        {/* ── Horizontal pager ──
            — pagingEnabled removed in favour of snapToInterval for smoother glide
            — decelerationRate 0.92 gives a cushioned deceleration (vs "fast" = 0.99 instant snap)
            — disableIntervalMomentum prevents fast swipes from skipping multiple pages
            — snapToAlignment "center" ensures pages lock flush to screen edges
            — `designs` is already scoped to the forwarded filter, so paging
              naturally only moves through the filtered set            ── */}
        <View style={styles.body}>
          <FlatList<Design>
          ref={flatListRef}
          data={loopedDesigns}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          horizontal
          snapToInterval={SCREEN_W}
          snapToAlignment="center"
          disableIntervalMomentum={true}
          decelerationRate={0.998}
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          initialScrollIndex={initialScrollIndex}
          extraData={loopedDesigns}
          bounces={false}
          maxToRenderPerBatch={5}
          windowSize={11}
          initialNumToRender={Math.min(loopedDesigns.length, 5)}
          style={{ flex: 1 }}
        />

        <FooterActionTray
          item={activeDesign}
          isInCart={activeDesign ? cartItems.some((i) => i._id === activeDesign._id) : false}
          isSold={activeDesign?.status === 'sold'}
          bottomInset={insets.bottom}
          imageRefs={imageRefs}
          rawIndexRef={rawIndexRef}
          onAddToCart={handleAddToCart}
        />
        </View>
      </View>
    </CartAnimationProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DesignPage — one page of the horizontal pager
   No vertical scroll: content is laid out in a fixed-height column.
   Image uses flex: 1 to fill remaining space between fixed elements.
   ═══════════════════════════════════════════════════════════════ */
interface DesignPageProps {
  item: Design;
  index: number;
  total: number;
  bottomInset: number;
  onOpenModal: (url: string | null) => void;
  isWishlisted: boolean;
  onToggleWishlist: (item: Design) => void;
  setImageRef: (ref: React.RefObject<View>) => void;
}

function DesignPage({ item, index, total, bottomInset, onOpenModal, isWishlisted, onToggleWishlist, setImageRef }: DesignPageProps) {
  const C = useColors();
  const pageS = createPageStyles(C);

  const finalImageUrl = buildImageUrl(item.imageUrl);

  const imageWrapperRef = useRef<View>(null);

  useEffect(() => {
    setImageRef(imageWrapperRef);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    /* Outer View fills the pager slot exactly — no scroll */
    <View style={pageS.page}>
      <View style={pageS.container}>

        {/* indexNum removed — counter lives in the header */}

        <ImageGallery
          finalImageUrl={finalImageUrl}
          imageWrapperRef={imageWrapperRef}
          onOpenModal={onOpenModal}
          item={item}
          isWishlisted={isWishlisted}
          onToggleWishlist={onToggleWishlist}
        />

      </View>
    </View>
  );
}

function createPageStyles(c) {
  return StyleSheet.create({
    /* Outer shell — exactly one screen wide, fills flex space (no scroll) */
    page: {
      width: SCREEN_W,
      flex: 1,
      backgroundColor: c.CREAM,
    },

    /* Inner column — fills page, fixed padding */
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 0,
      flexDirection: 'column',
    },

    /* Image wrapper — flex: 1, rounded */

  });
}

function FooterActionTray({ item, isInCart, isSold, bottomInset, imageRefs, rawIndexRef, onAddToCart }: any) {
  const C = useColors();
  const { triggerFlyToCart } = useCartAnimation();

  const btnScaleAnim = useRef(new Animated.Value(1)).current;
  const btnBgAnim    = useRef(new Animated.Value(0)).current;
  const addingRef    = useRef(false);

  const btnBg = btnBgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.NAVY, C.NAVY_DEEP],
  });

  const handleAddPress = useCallback(() => {
    if (!item || isSold || addingRef.current) return;
    addingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    Animated.sequence([
      Animated.parallel([
        Animated.timing(btnScaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
        Animated.timing(btnBgAnim,    { toValue: 1,    duration: 80, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(btnScaleAnim, { toValue: 1, duration: 100, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(btnBgAnim,    { toValue: 0, duration: 200, useNativeDriver: false }),
      ]),
    ]).start();

    const activeImageRef = imageRefs.current[rawIndexRef.current];
    triggerFlyToCart({ imageUri: buildImageUrl(item.imageUrl), sourceRef: activeImageRef });
    onAddToCart(item);
    setTimeout(() => { addingRef.current = false; }, 100);
  }, [item, isSold, triggerFlyToCart, onAddToCart, btnScaleAnim, btnBgAnim, imageRefs, rawIndexRef]);

  if (!item) return null;

  return (
    <ActionTray
      item={item}
      isInCart={isInCart}
      isSold={isSold}
      bottomInset={bottomInset}
      btnScaleAnim={btnScaleAnim}
      btnBg={btnBg}
      onAddToCart={handleAddPress}
    />
  );
}

/* ─── Global Styles ─── */
function createStyles(c) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.NAVY_DEEP },
    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      borderTopWidth: 4,
      borderTopColor: '#0A0A0B',
    },

    /* ── Gradient header (matches CatalogsScreen) ── */
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
    eyebrowText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      letterSpacing: 3,
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 2,
    },
    headerInner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 0,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
    backGlyph: {
      fontFamily: 'Outfit_300Light',
      fontSize: 20, color: '#FFFFFF', lineHeight: 22,
    },
    headerTitleWrap: {
      flex: 1,
      overflow: 'hidden',
      position: 'relative',
      gap: 4,
    },
    mainTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 32, lineHeight: 36,
      letterSpacing: -0.5, color: '#FFFFFF',
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    counterText: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 13, color: 'rgba(255,255,255,0.8)',
      letterSpacing: 0.3,
    },
    counterDivider: { color: 'rgba(255,255,255,0.5)' },
    filteredChip: {
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.4)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    filteredChipText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 7.5, letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.8)',
    },
    shimmerClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },

    /* Cart button */
    cartBtn: {
      width: 56, height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: 4,
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

    /* Modal */
    modalContainer: {
      flex: 1, backgroundColor: c.NAVY_DEEP,
      justifyContent: 'center', alignItems: 'center',
    },
    modalClose: {
      position: 'absolute', top: 60, right: 24, zIndex: 999,
      width: 44, height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
    },
    modalCloseText: {
      fontFamily: 'Outfit_300Light',
      color: '#FFFFFF', fontSize: 16, lineHeight: 18,
    },
    modalHint: {
      position: 'absolute', bottom: 48, alignSelf: 'center', zIndex: 999,
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.4)',
    },
  });
}
