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
import CartIcon from '../../assets/images/cart.png';
import { useColors } from '../../colors';
import api from '../../services/api';
import useCartStore, { CartStore } from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';

/* ─── Types ─── */
type Design = {
  _id: string;
  catalogName: string;
  sku: string;
  weight: number;
  status: string;
  imageUrl?: string | null;
};

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

/* ─── Gold Shimmer Hook (mirrors CatalogDetailsScreen) ─── */
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

/* ═══════════════════════════════════════════════════════════════
   Cart Animation Context (preserved from original)
   ═══════════════════════════════════════════════════════════════ */
interface FlyPayload {
  imageUri: string | null;
  sourceRef: React.RefObject<View>;
}

interface CartAnimCtx {
  triggerFlyToCart: (payload: FlyPayload) => void;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}

const CartAnimationContext = createContext<CartAnimCtx | null>(null);

function useCartAnimation(): CartAnimCtx {
  const ctx = useContext(CartAnimationContext);
  if (!ctx) throw new Error('useCartAnimation must be inside CartAnimationProvider');
  return ctx;
}

interface FlyingThumb {
  id: number;
  imageUri: string | null;
  startX: number; startY: number; endX: number; endY: number;
  progress: Animated.Value; opacity: Animated.Value;
  scale: Animated.Value; rotate: Animated.Value;
}

let _flyId = 0;

function CartAnimationOverlayConnected({
  triggerRef, cartIconRef, cartScaleAnim, badgeScaleAnim,
}: {
  triggerRef: React.MutableRefObject<(p: FlyPayload) => void>;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}) {
  const C = useColors();
  const overlayS = createOverlayStyles(C);
  const [thumbs, setThumbs] = useState<FlyingThumb[]>([]);
  const addThumb    = useCallback((t: FlyingThumb) => setThumbs((p) => [...p, t]), []);
  const removeThumb = useCallback((id: number) => setThumbs((p) => p.filter((t) => t.id !== id)), []);

  useEffect(() => {
    triggerRef.current = ({ imageUri, sourceRef }: FlyPayload) => {
      if (!cartIconRef.current || !sourceRef.current) return;
      sourceRef.current.measureInWindow((sx, sy, sw, sh) => {
        cartIconRef.current!.measureInWindow((cx, cy, cw, ch) => {
          const startX = sx + sw / 2 - 24;
          const startY = sy + sh * 0.3;
          const endX   = cx + cw / 2 - 24;
          const endY   = cy + ch / 2 - 24;
          const progress = new Animated.Value(0);
          const opacity  = new Animated.Value(1);
          const scale    = new Animated.Value(1);
          const rotate   = new Animated.Value(0);
          const id       = ++_flyId;
          addThumb({ id, imageUri, startX, startY, endX, endY, progress, opacity, scale, rotate });
          Animated.parallel([
            Animated.timing(progress, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(scale,    { toValue: 0.7, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.9, duration: 380, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0,   duration: 240, useNativeDriver: true }),
            ]),
            Animated.timing(rotate, { toValue: 1, duration: 620, useNativeDriver: true }),
          ]).start(() => {
            removeThumb(id);
            Animated.sequence([
              Animated.timing(cartScaleAnim, { toValue: 1.12, duration: 120, useNativeDriver: true }),
              Animated.spring(cartScaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
            ]).start();
            badgeScaleAnim.setValue(0.5);
            Animated.spring(badgeScaleAnim, { toValue: 1, friction: 3.5, tension: 200, useNativeDriver: true }).start();
          });
        });
      });
    };
  }, [addThumb, removeThumb, cartIconRef, cartScaleAnim, badgeScaleAnim, triggerRef]);

  return (
    <>
      {thumbs.map((thumb) => {
        const dx        = thumb.endX - thumb.startX;
        const dy        = thumb.endY - thumb.startY;
        const arcHeight = Math.min(Math.abs(dy) * 0.8, 130);
        const translateX = thumb.progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = thumb.progress.interpolate({
          inputRange:  [0, 0.3, 0.6, 1],
          outputRange: [0, dy * 0.3 - arcHeight, dy * 0.6 - arcHeight * 0.5, dy],
        });
        const rotateInterp = thumb.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '4deg'] });
        return (
          <Animated.View
            key={thumb.id} pointerEvents="none"
            style={[overlayS.thumb, {
              position: 'absolute', left: thumb.startX, top: thumb.startY,
              opacity: thumb.opacity,
              transform: [{ translateX }, { translateY }, { scale: thumb.scale }, { rotate: rotateInterp }],
            }]}
          >
            {thumb.imageUri
              ? <Image source={thumb.imageUri} style={overlayS.thumbImage} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={overlayS.thumbPlaceholder}><Text style={overlayS.thumbGlyph}>◆</Text></View>
            }
            <Animated.View style={[overlayS.glow, { opacity: thumb.opacity }]} />
          </Animated.View>
        );
      })}
    </>
  );
}

function CartAnimationProvider({
  children, cartIconRef, cartScaleAnim, badgeScaleAnim,
}: {
  children: React.ReactNode;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}) {
  const triggerRef = useRef<(p: FlyPayload) => void>(() => {});
  const ctx: CartAnimCtx = useMemo(() => ({
    triggerFlyToCart: (p) => triggerRef.current(p),
    cartIconRef, cartScaleAnim, badgeScaleAnim,
  }), [cartIconRef, cartScaleAnim, badgeScaleAnim]);

  return (
    <CartAnimationContext.Provider value={ctx}>
      {children}
      <CartAnimationOverlayConnected
        triggerRef={triggerRef}
        cartIconRef={cartIconRef}
        cartScaleAnim={cartScaleAnim}
        badgeScaleAnim={badgeScaleAnim}
      />
    </CartAnimationContext.Provider>
  );
}

function createOverlayStyles(c) {
  return StyleSheet.create({
    thumb: {
      width: 48, height: 48, borderRadius: 10,
      backgroundColor: c.PAPER,
      overflow: 'hidden',
      shadowColor: c.NAVY_DEEP, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 10, elevation: 8, zIndex: 9999,
    },
    thumbImage: { width: '100%', height: '100%' },
    thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.TINT },
    thumbGlyph: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 16, color: c.GOLD_DEEP },
    glow: {
      ...StyleSheet.absoluteFillObject, borderRadius: 10,
      backgroundColor: 'transparent',
      shadowColor: c.NAVY_DEEP, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3, shadowRadius: 14,
    },
  });
}

/* ─── Shimmer bar (mirrors CatalogDetailsScreen) ─── */
function ShimmerBar() {
  const shimmer    = useShimmer(2400);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 300] });
  return (
    <Animated.View style={[shimmerStyles.bar, { transform: [{ translateX }] }]} />
  );
}
function createShimmerStyles() {
  return StyleSheet.create({
    bar: {
      position: 'absolute', top: 0, bottom: 0, width: 80,
      backgroundColor: 'rgba(255,255,255,0.25)',
      transform: [{ skewX: '-20deg' }],
    },
  });
}
const shimmerStyles = createShimmerStyles();

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
        onAddToCart={handleAddToCart}
        isWishlisted={hasWishlist(item._id)}
        onToggleWishlist={(d) => toggleWishlist({
          _id: d._id,
          catalogName: d.catalogName,
          sku: d.sku,
          weight: d.weight,
          imageUrl: d.imageUrl,
        })}
        isInCart={cartItems.some((i) => i._id === item._id)}
      />
    ),
    [openModal, handleAddToCart, designs.length, insets.bottom, hasWishlist, toggleWishlist, cartItems]
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
          style={[styles.headerBlock, { paddingTop: insets.top + 14 }]}
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
              <Text style={styles.mainTitle} numberOfLines={2}>{headerTitle}</Text>
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
                <Image
                  source={CartIcon}
                  style={{ width: 36, height: 36 }}
                  contentFit="contain"
                />
                <Text style={styles.cartLabel}>My Order</Text>
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
  onAddToCart: (item: Design) => void;
  isWishlisted: boolean;
  onToggleWishlist: (item: Design) => void;
  isInCart: boolean;
}

function DesignPage({ item, index, total, bottomInset, onOpenModal, onAddToCart, isWishlisted, onToggleWishlist, isInCart }: DesignPageProps) {
  const C = useColors();
  const pageS = createPageStyles(C);
  const { triggerFlyToCart } = useCartAnimation();

  const finalImageUrl = buildImageUrl(item.imageUrl);
  const isSold        = item.status === 'sold';

  const btnScaleAnim = useRef(new Animated.Value(1)).current;
  const btnBgAnim    = useRef(new Animated.Value(0)).current;
  const addingRef    = useRef(false);
  const imageWrapperRef = useRef<View>(null);

  const btnBg = btnBgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.NAVY, C.NAVY_DEEP],
  });

  const handleAddPress = useCallback(() => {
    if (isSold || addingRef.current) return;
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

    triggerFlyToCart({ imageUri: finalImageUrl, sourceRef: imageWrapperRef as React.RefObject<View> });
    onAddToCart(item);
    setTimeout(() => { addingRef.current = false; }, 100);
  }, [isSold, finalImageUrl, triggerFlyToCart, onAddToCart, item, btnScaleAnim, btnBgAnim]);

  return (
    /* Outer View fills the pager slot exactly — no scroll */
    <View style={pageS.page}>
      <View style={pageS.container}>

        {/* indexNum removed — counter lives in the header */}

{finalImageUrl ? (
          <TouchableOpacity
            ref={imageWrapperRef}
            collapsable={false}
            activeOpacity={0.96}
            onPress={() => onOpenModal(finalImageUrl)}
            style={pageS.imageWrapper}
          >
            <Image
              source={finalImageUrl}
              style={pageS.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
            {/* Subtle gold rule under image */}
            <View style={pageS.imageRule} />

            {/* Wishlist heart — floating top-right corner */}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onToggleWishlist(item); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={pageS.wishlistBtn}
            >
              <Text style={[pageS.wishlistGlyph, isWishlisted && pageS.wishlistActive]}>
                {isWishlisted ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <View ref={imageWrapperRef} collapsable={false} style={pageS.noImageBox}>
            <Text style={pageS.noImageGlyph}>◆</Text>
            <Text style={pageS.noImageLabel}>No image</Text>
          </View>
        )}

        {/* ── Design name ── */}


        {/* ── Spec grid — SKU + Weight only ── */}
        <View style={pageS.specsRow}>
          <View style={pageS.specCell}>
            <Text style={pageS.specLabel}>SKU</Text>
            <Text style={pageS.specValue}>{item.sku}</Text>
          </View>
          <View style={pageS.specDivider} />
          <View style={pageS.specCell}>
            <Text style={pageS.specLabel}>Weight</Text>
            <Text style={pageS.specValue}>{item.weight}g</Text>
          </View>
        </View>

{/* ── Actions ── */}
        <View style={[pageS.actions, { paddingBottom: Math.max(bottomInset, 16) }]}>
          <View style={pageS.actionsRule} />

          {/* Primary CTA — Add to Cart */}
          {isInCart ? (
            <View style={[pageS.primaryBtn, pageS.primaryBtnAdded]}>
              <Text style={pageS.primaryBtnTextAdded}>Added ✓</Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: btnScaleAnim }] }}>
              <TouchableOpacity activeOpacity={1} onPress={handleAddPress} disabled={isSold}>
                <Animated.View style={[
                  pageS.primaryBtn,
                  isSold && pageS.primaryBtnSold,
                  !isSold && { backgroundColor: btnBg as any },
                ]}>
                  <Text style={[pageS.primaryBtnText, isSold && pageS.primaryBtnTextSold]}>
                    {isSold ? 'Sold Out' : 'Add to Order'}
                  </Text>
                  {!isSold && <Text style={pageS.primaryBtnGlyph}>↗</Text>}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

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
imageWrapper: {
      flex: 1,
      minHeight: 120,
      backgroundColor: c.NAVY_DEEP,
      borderRadius: 18,
      marginBottom: 0,
      overflow: 'hidden',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageRule: {
      height: 3,
      width: 24,
      backgroundColor: c.GOLD_DEEP,
      borderRadius: 2,
      marginLeft: 8,
    },
    noImageBox: {
      flex: 1,
      minHeight: 120,
      backgroundColor: c.TINT,
      borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 0, gap: 12,
    },
    noImageGlyph: {
      fontFamily: 'CormorantGaramond_300Light',
      fontSize: 30, color: c.GOLD_DEEP, opacity: 0.4,
    },
    noImageLabel: {
      fontFamily: 'Outfit_300Light',
      fontSize: 9, letterSpacing: 3,
      textTransform: 'uppercase', color: c.MUTED,
    },

    /* Name — flush under image, tight above specs */
/* Name — flush under image, tight above specs */
    nameSection: { marginTop: 4, marginBottom: 2, gap: 2 },
    designName: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 28, lineHeight: 30,
      letterSpacing: -0.5, color: c.INK,
    },
    goldRule: {
      width: 28, height: 1,
      backgroundColor: c.GOLD_DEEP,
      opacity: 0.6,
    },

    /* Spec grid — rounded */
specsRow: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1, borderColor: c.BORDER_SOFT,
      marginTop: 0,
      marginBottom: 4,
      backgroundColor: c.TINT,
      overflow: 'hidden',
    },
    specCell: {
      flex: 1,
      paddingVertical: 10, paddingHorizontal: 12,
      gap: 4,
    },
    specDivider: {
      width: 1, backgroundColor: c.BORDER_SOFT,
    },
    specLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 9, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    specValue: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 16, color: c.INK,
      letterSpacing: -0.2,
    },

    /* Actions — single button */
    actions: {
      gap: 8,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginBottom: 4,
    },
wishlistBtn: {
      position: 'absolute',
      top: 12, right: 12,
      width: 40, height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },
    wishlistGlyph: {
      fontSize: 22, lineHeight: 24, color: c.MUTED,
    },
    wishlistActive: {
      color: c.HEART_ACTIVE,
    },
    actionsRule: {
      height: 1,
      backgroundColor: c.GOLD_DEEP,
      opacity: 0.3,
      marginBottom: 4,
    },
    primaryBtn: {
      height: 50,
      borderRadius: 14,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      backgroundColor: c.BURGUNDY,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
    primaryBtnAdded: {
      backgroundColor: c.NAVY_DEEP,
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    primaryBtnSold: {
      backgroundColor: 'transparent',
      borderWidth: 1, borderColor: c.BORDER_SOFT,
      shadowOpacity: 0,
      elevation: 0,
    },
    primaryBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 11, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },
    primaryBtnTextSold: { color: c.MUTED },
    primaryBtnTextAdded: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 11, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    primaryBtnGlyph: {
      fontSize: 12, color: c.GOLD, lineHeight: 14,
    },
  });
}

/* ─── Global Styles ─── */
function createStyles(c) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.NAVY_DEEP },

    /* ── Gradient header (matches CatalogsScreen) ── */
    headerBlock: {
      paddingHorizontal: 20,
      paddingBottom: 22
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
      width: 72, height: 72,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
      gap: 2,
    },
    cartLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#0C0C0C',
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
