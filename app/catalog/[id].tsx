/**
 * CatalogDetailsScreen.tsx — Luxury Editorial Redesign
 *
 * Design language mirrors CatalogsScreen.tsx:
 *  — Deep obsidian (#0A0A0B) header with animated gold shimmer title
 *  — Cormorant Garamond + Outfit pairing at editorial sizes
 *  — Cream (#F7F6F3 / #F0EFE9) body background
 *  — Gold (#C9A96E / #D4AF37) as sole accent
 *  — Cartier-style dark marquee ticker with ◆ diamond glyphs
 *  — Skeleton shimmer loading (gold pulse)
 *  — Architectural search bar with gold focus ring + free-typed weight range filter
 *  — Equal-height cards, two tidy chips side by side, zero wasted space
 *  — Full "fly to cart" animation system preserved
 *
 * Grid images now prefer the server-generated thumbnailUrl over the full-res
 * imageUrl (falls back to imageUrl for older designs uploaded before
 * thumbnails existed).
 *
 * NOTE: the active search / weight filter is now forwarded as route params
 * when opening a design, so DesignDetailsScreen can scope its paginated
 * design list to the same filtered set (see openDesign below).
 */

import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  createContext,
  memo,
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
  LayoutAnimation,
  ListRenderItemInfo,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import CartIcon from '../../assets/images/cart.png';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../colors';
import api from '../../services/api';
import useCartStore, { CartItem } from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


/* ─── Types ─── */
type Design = {
  _id: string;
  catalogName: string;
  sku: string;
  weight: number;
  status: string;
  imageUrl?: string;
  thumbnailUrl?: string;
};

/* ─── Constants ─── */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING  = 16;
const COLUMN_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - COLUMN_GAP) / 2;

/* ─── Pure helpers ─── */
function buildImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `https://apis.27012610.xyz${imageUrl}`;
}

/* ─── Gold Shimmer Hook ─── */
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
   Cart Animation Context
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
function useCartAnimation() {
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
        const dx = thumb.endX - thumb.startX;
        const dy = thumb.endY - thumb.startY;
        const arcH = Math.min(Math.abs(dy) * 0.8, 130);
        const translateX = thumb.progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
        const translateY = thumb.progress.interpolate({
          inputRange:  [0, 0.3, 0.6, 1],
          outputRange: [0, dy * 0.3 - arcH, dy * 0.6 - arcH * 0.5, dy],
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
  onTrigger: (fn: (p: FlyPayload) => void) => void;
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

/* ─── Skeleton Card (equal size, no tall variant) ─── */
function SkeletonCard() {
  const C = useColors();
  const skelS = createSkeletonStyles(C);
  const shimmer = useShimmer(1200);
  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.7, 0.35],
  });

  return (
    <Animated.View style={[skelS.card, { opacity }]}>
      <View style={skelS.inner}>
        <View style={skelS.imagePlaceholder} />
        <View style={skelS.bodyPad}>
          <View style={skelS.nameLine} />
          <View style={skelS.nameLineShort} />
          <View style={skelS.chipsRow}>
            <View style={skelS.chip} />
            <View style={skelS.chip} />
          </View>
          <View style={skelS.btnLine} />
        </View>
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
      marginBottom: COLUMN_GAP,
      overflow: 'hidden',
    },
    inner: {},
    imagePlaceholder: {
      height: 210,
      backgroundColor: c.TINT,
    },
    bodyPad: { padding: 12, gap: 6 },
    nameLine: { width: '80%', height: 12, backgroundColor: c.BORDER_SOFT, borderRadius: 4, marginBottom: 8 },
    nameLineShort: { width: '50%', height: 10, backgroundColor: c.BORDER_SOFT, borderRadius: 4 },
    chipsRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
    chip: { flex: 1, height: 28, backgroundColor: c.BORDER_SOFT, borderRadius: 1, opacity: 0.6 },
    btnLine: { height: 30, backgroundColor: c.BORDER_SOFT, borderRadius: 1, marginTop: 2, opacity: 0.6 },
  });
}

/* ═══════════════════════════════════════════════════════════════
   Design Card — equal size, tightened, two chips side by side
   ═══════════════════════════════════════════════════════════════ */
interface DesignCardProps {
  item: Design;
  index: number;
  onPress: (item: Design) => void;
  onAddToCart: (item: Design) => void;
  isWishlisted: boolean;
  onToggleWishlist: (item: Design) => void;
  isInCart: boolean;
}

const DesignCard = memo(function DesignCard({ item, index, onPress, onAddToCart, isWishlisted, onToggleWishlist, isInCart }: DesignCardProps) {
  const C = useColors();
  const cardS = createCardStyles(C);
  const { triggerFlyToCart } = useCartAnimation();

  const pressAnim    = useRef(new Animated.Value(0)).current;
  const btnScaleAnim = useRef(new Animated.Value(1)).current;
  const btnBgAnim    = useRef(new Animated.Value(0)).current;
  const addingRef    = useRef(false);
  const imageViewRef = useRef<View>(null);

  // Grid card uses the small server-generated thumbnail when available —
  // falls back to the full-res imageUrl for designs uploaded before
  // thumbnails existed.
  const imageUri = buildImageUrl(item.thumbnailUrl || item.imageUrl);

  const onPressIn = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 1, duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const onPressOut = useCallback(() => {
    Animated.timing(pressAnim, {
      toValue: 0, duration: 240,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [pressAnim]);

  const cardBg      = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [C.CREAM, C.PAPER] });
  const borderColor = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [C.BORDER_SOFT, C.GOLD_DEEP] });
  const btnBg       = btnBgAnim.interpolate({ inputRange: [0, 1], outputRange: [C.NAVY_DEEP, C.INK] });

  const handleAddPress = useCallback(() => {
    if (addingRef.current) return;
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

    triggerFlyToCart({ imageUri, sourceRef: imageViewRef as React.RefObject<View> });
    onAddToCart(item);
    setTimeout(() => { addingRef.current = false; }, 100);
  }, [onAddToCart, item, imageUri, triggerFlyToCart, btnScaleAnim, btnBgAnim]);

  const handleCardPress = useCallback(() => {
    if (addingRef.current) return;
    onPress(item);
  }, [onPress, item]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleCardPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[cardS.card, { backgroundColor: cardBg, borderColor }]}>

        {/* Image area */}
        <View ref={imageViewRef} collapsable={false}>
          {imageUri ? (
            <Image
              source={imageUri}
              style={cardS.image}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={cardS.imagePlaceholder}>
              <Text style={cardS.placeholderGlyph}>◆</Text>
            </View>
          )}

          {/* Wishlist heart */}
          <TouchableOpacity
            onPress={() => onToggleWishlist(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={cardS.heartBtn}
          >
            <Text style={[cardS.heartGlyph, isWishlisted && cardS.heartActive]}>
              {isWishlisted ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subtle gold rule under image */}
        <View style={cardS.imageRule} />

        {/* Body */}
        <View style={cardS.body}>
          {/* Combined SKU + Weight pill */}
          <View style={cardS.infoPill}>
            <View style={cardS.pillSection}>
              <Text style={cardS.pillLabel}>Tag</Text>
              <Text style={cardS.pillValue} numberOfLines={2}>{item.sku}</Text>
            </View>
            <View style={cardS.pillDivider} />
            <View style={cardS.pillSection}>
              <Text style={cardS.pillLabel}>Wt</Text>
              <Text style={cardS.pillValue}>{item.weight}g</Text>
            </View>
          </View>

          {/* Gold rule */}
          <View style={cardS.goldRule} />

          {/* Add to cart button */}
          {isInCart ? (
            <View style={[cardS.addBtn, cardS.addBtnAdded]}>
              <Text style={cardS.addBtnTextAdded}>Added ✓</Text>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: btnScaleAnim }] }}>
              <TouchableOpacity activeOpacity={1} onPress={handleAddPress}>
                <Animated.View style={[cardS.addBtn, { backgroundColor: btnBg }]}>
                  <Text style={cardS.addBtnText}>Add to Order</Text>
                  <Text style={cardS.addBtnGlyph}>↗</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

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
      height: CARD_WIDTH * 1.1,
      backgroundColor: c.TINT,
      alignItems: 'center', justifyContent: 'center',
    },
    placeholderGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 30, color: c.GOLD_DEEP, opacity: 0.5,
    },
    imageRule: {
      height: 3,
      width: 20,
      backgroundColor: c.GOLD_DEEP,
      marginLeft: 8,
      borderRadius: 2,
    },
    heartBtn: {
      position: 'absolute', top: 8, right: 8,
      width: 32, height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.85)',
      alignItems: 'center', justifyContent: 'center',
    },
    heartGlyph: {
      fontSize: 18, lineHeight: 20, color: c.MUTED,
    },
    heartActive: {
      color: c.HEART_ACTIVE,
    },
    body: { padding: 10, gap: 8 },
    /* Combined SKU + Weight pill */
    infoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.BORDER_SOFT,
      backgroundColor: c.TINT,
    },
    pillSection: {
      flex: 1,
      paddingHorizontal: 7,
      paddingVertical: 5,
    },
    pillDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: c.BORDER_SOFT,
      opacity: 0.5,
    },
    pillLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 7, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    pillValue: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 10, color: c.INK, letterSpacing: 0.2,
    },
    goldRule: {
      width: 20, height: 3,
      backgroundColor: c.GOLD_DEEP,
      borderRadius: 2,
    },
    addBtn: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10, gap: 6,
      borderRadius: 12,
      backgroundColor: c.BURGUNDY,
    },
    addBtnAdded: {
      backgroundColor: c.NAVY_DEEP,
      opacity: 0.5,
    },
    addBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },
    addBtnTextAdded: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    addBtnGlyph: { fontSize: 11, color: c.GOLD_DEEP, lineHeight: 14 },
  });
}

/* ═══════════════════════════════════════════════════════════════
   Main Screen
   ═══════════════════════════════════════════════════════════════ */
export default function CatalogDetailsScreen() {
  const C = useColors();
  const s = createStyles(C);
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const addToCart  = useCartStore((s) => s.addToCart);
  const cartItems  = useCartStore((s) => s.items);
  const cartCount  = cartItems.length;

  const [designs, setDesigns]   = useState<Design[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [search, setSearch]     = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  /* ── Weight filter state (free-typed only) ── */
  const [filterOpen, setFilterOpen]         = useState(false);
  const [minWeightInput, setMinWeightInput] = useState('');
  const [maxWeightInput, setMaxWeightInput] = useState('');

  /* ── Sort ── */
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'weight-asc' | 'weight-desc' | 'name-asc' | 'name-desc'>('default');

  /* ── Pull-to-refresh ── */
  const [refreshing, setRefreshing] = useState(false);

  /* ── Wishlist ── */
  const [showFavorites, setShowFavorites] = useState(false);
  const wishlistItems = useWishlistStore((s) => s.items);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const hasWishlist = useWishlistStore((s) => s.has);

  const insets = useSafeAreaInsets();
  const cartIconRef    = useRef<View>(null);
  const cartScaleAnim  = useRef(new Animated.Value(1)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;

  /* ── Data fetching ── */
  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/public/designs?catalogId=${id}`);
      setDesigns((res.data as Design[]).filter((d) => d.status === 'available'));
    } catch (err) {
      console.error('[CatalogDetails] fetchDesigns failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDesigns(); }, [fetchDesigns]);

  /* ── Pull-to-refresh ── */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get(`/public/designs?catalogId=${id}`);
      setDesigns((res.data as Design[]).filter((d) => d.status === 'available'));
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [id]);

  /* ── Sort helpers ── */
  const sortOptions = [
    { key: 'default',     label: 'Default' },
    { key: 'weight-asc',  label: 'Weight: Low to High' },
    { key: 'weight-desc', label: 'Weight: High to Low' },
  ] as const;

  const toggleSortPanel = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSortOpen((o) => !o);
  }, []);

  /* ── Weight filter helpers ── */
  const toggleFilterPanel = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilterOpen((o) => !o);
  }, []);

  const clearWeightFilter = useCallback(() => {
    setMinWeightInput('');
    setMaxWeightInput('');
  }, []);

  const applyWeightFilter = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilterOpen(false);
  }, []);

  const hasWeightFilter = minWeightInput.trim() !== '' || maxWeightInput.trim() !== '';

  const weightRangeLabel = useMemo(() => {
    const min = minWeightInput.trim();
    const max = maxWeightInput.trim();
    if (min && max) return `${min}–${max}g`;
    if (min) return `${min}g & up`;
    if (max) return `Under ${max}g`;
    return '';
  }, [minWeightInput, maxWeightInput]);

  /* ── Filtered list ── */
  const filteredDesigns = useMemo(() => {
    let result = designs;

    const q = search.trim();
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

    const min = minWeightInput.trim() ? parseFloat(minWeightInput) : null;
    const max = maxWeightInput.trim() ? parseFloat(maxWeightInput) : null;
    if (min !== null && !Number.isNaN(min)) {
      result = result.filter((item) => item.weight >= min);
    }
    if (max !== null && !Number.isNaN(max)) {
      result = result.filter((item) => item.weight <= max);
    }

    /* ── Favorites only ── */
    if (showFavorites) {
      result = result.filter((item) => hasWishlist(item._id));
    }

    /* ── Sort ── */
    if (sortBy === 'weight-asc') {
      result = [...result].sort((a, b) => a.weight - b.weight);
    } else if (sortBy === 'weight-desc') {
      result = [...result].sort((a, b) => b.weight - a.weight);
    }

    return result;
  }, [search, designs, minWeightInput, maxWeightInput, sortBy, showFavorites, hasWishlist]);

  /* ── Navigation ──
     The active search / weight filter is forwarded as route params so
     DesignDetailsScreen can reapply the same filter and scope its
     horizontal pager to only the filtered designs. */
  const openDesign = useCallback(
    (item: Design) => {
      router.push({
        pathname: '/design/[id]',
        params: {
          id:          item._id,
          catalogId:   String(id),
          catalogName: String(name),
          sku:         item.sku,
          weight:      String(item.weight),
          status:      item.status,
          imageUrl:    item.imageUrl ?? '',
          // ── carry the active filter forward ──
          search:      search.trim(),
          minWeight:   minWeightInput.trim(),
          maxWeight:   maxWeightInput.trim(),
        },
      });
    },
    [id, name, search, minWeightInput, maxWeightInput]
  );

  /* ── Cart ── */
  const handleAddToCart = useCallback(
    (item: Design) => {
      addToCart({
        _id:         item._id,
        title:       item.catalogName || 'Untitled',
        sku:         item.sku,
        weight:      item.weight,
        status:      item.status,
        imageUrl:    item.imageUrl,
        catalogName: String(name),
      } satisfies CartItem);
    },
    [addToCart, name]
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Design>) => (
      <DesignCard
        item={item}
        index={index}
        onPress={openDesign}
        onAddToCart={handleAddToCart}
        isWishlisted={hasWishlist(item._id)}
        onToggleWishlist={(d) => toggleWishlist({
          _id: d._id,
          catalogName: d.catalogName,
          sku: d.sku,
          weight: d.weight,
          imageUrl: d.imageUrl,
          thumbnailUrl: d.thumbnailUrl,
        })}
        isInCart={cartItems.some((i) => i._id === item._id)}
      />
    ),
    [openDesign, handleAddToCart, hasWishlist, toggleWishlist, cartItems]
  );

  const keyExtractor = useCallback((item: Design) => item._id, []);

  return (
    <CartAnimationProvider
      cartIconRef={cartIconRef}
      cartScaleAnim={cartScaleAnim}
      badgeScaleAnim={badgeScaleAnim}
      onTrigger={() => {}}
    >
      <View style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />

        {/* ── Gradient header block (matches CatalogsScreen) ── */}
        <LinearGradient
          colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.headerBlock, { paddingTop: insets.top + 14 }]}
        >
          <View style={s.headerInner}>
            {/* Back button */}
            <TouchableOpacity
              onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
              activeOpacity={0.8}
              style={s.backBtn}
            >
              <Text style={s.backGlyph}>←</Text>
            </TouchableOpacity>

            {/* Collection name */}
            <View style={s.headerTitleWrap}>
              <Text style={s.mainTitle} numberOfLines={2}>{name}</Text>
              <View style={s.shimmerClip} pointerEvents="none">
                <ShimmerBar />
              </View>
            </View>

            {/* Cart button (animated) */}
            <Animated.View style={{ transform: [{ scale: cartScaleAnim }] }}>
              <TouchableOpacity
                ref={cartIconRef}
                onPress={() => router.push('/cart')}
                activeOpacity={0.8}
                style={s.cartBtn}
                collapsable={false}
              >
                <Image
                  source={CartIcon}
                  style={{ width: 36, height: 36 }}
                  contentFit="contain"
                />
                <Text style={s.cartLabel}>My Order</Text>
                {cartCount > 0 && (
                  <Animated.View style={[s.badge, { transform: [{ scale: badgeScaleAnim }] }]}>
                    <Text style={s.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>

        {/* ── Cream body ── */}
        <View style={s.body}>

          {/* Search bar + weight filter toggle */}
          <View style={[s.searchRow, searchFocused && s.searchRowFocused]}>
            <Text style={[s.searchGlyph, searchFocused && s.searchGlyphFocused]}>⌕</Text>
            <TextInput
              placeholder="Search"
              placeholderTextColor={C.MUTED}
              value={search}
              onChangeText={setSearch}
              style={s.searchInput}
              selectionColor={C.GOLD_DEEP}
              returnKeyType="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.searchClear}>Clear</Text>
              </TouchableOpacity>
            )}

            <View style={s.searchDivider} />

            <TouchableOpacity
              onPress={toggleFilterPanel}
              activeOpacity={0.7}
              style={[s.filterBtn, (filterOpen || hasWeightFilter) && s.filterBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[s.filterBtnGlyph, (filterOpen || hasWeightFilter) && s.filterBtnGlyphActive]}>⚖</Text>
              <Text style={[s.filterBtnText, (filterOpen || hasWeightFilter) && s.filterBtnTextActive]}>Weight</Text>
              {hasWeightFilter && <View style={s.filterDot} />}
            </TouchableOpacity>

            {/* Sort button */}
            <TouchableOpacity
              onPress={toggleSortPanel}
              activeOpacity={0.7}
              style={[s.filterBtn, sortOpen && s.filterBtnActive]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[s.filterBtnGlyph, sortOpen && s.filterBtnGlyphActive]}>⇅</Text>
              <Text style={[s.filterBtnText, sortOpen && s.filterBtnTextActive]}>
                {sortBy === 'default' ? 'Sort' : sortOptions.find((o) => o.key === sortBy)?.label ?? 'Sort'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight filter panel — free-typed min/max only */}
          {filterOpen && (
            <View style={s.filterPanel}>
              <Text style={s.filterPanelLabel}>Weight Range (g)</Text>

              <View style={s.weightInputPill}>
                <View style={s.weightInputSection}>
                  <Text style={s.weightInputLabel}>Min</Text>
                  <TextInput
                    value={minWeightInput}
                    onChangeText={setMinWeightInput}
                    placeholder="0"
                    placeholderTextColor={C.MUTED}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={applyWeightFilter}
                    style={s.weightInputField}
                  />
                  <Text style={s.weightInputUnit}>g</Text>
                </View>
                <View style={s.weightInputDivider} />
                <View style={s.weightInputSection}>
                  <Text style={s.weightInputLabel}>Max</Text>
                  <TextInput
                    value={maxWeightInput}
                    onChangeText={setMaxWeightInput}
                    placeholder="∞"
                    placeholderTextColor={C.MUTED}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={applyWeightFilter}
                    style={s.weightInputField}
                  />
                  <Text style={s.weightInputUnit}>g</Text>
                </View>
              </View>

              <View style={s.filterPanelActions}>
                {hasWeightFilter ? (
                  <TouchableOpacity onPress={clearWeightFilter} style={s.filterPanelClear} activeOpacity={0.7}>
                    <Text style={s.filterPanelClearText}>Clear</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <TouchableOpacity onPress={applyWeightFilter} style={s.filterPanelClear} activeOpacity={0.7}>
                  <Text style={s.filterPanelApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sort panel */}
          {sortOpen && (
            <View style={s.sortPanel}>
              <Text style={s.sortPanelLabel}>Sort by</Text>
              {sortOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    setSortBy(opt.key);
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSortOpen(false);
                  }}
                  activeOpacity={0.7}
                  style={s.sortOption}
                >
                  <Text style={s.sortOptionText}>{opt.label}</Text>
                  {sortBy === opt.key && <Text style={s.sortOptionCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Count row */}
          {!loading && !error && (
            <View style={s.countRow}>
              <View style={s.countLeft}>
                <Text style={s.countNum}>
                  {filteredDesigns.length}
                  {(search.trim() !== '' || hasWeightFilter || showFavorites) && filteredDesigns.length !== designs.length
                    ? ` of ${designs.length}`
                    : ''}
                </Text>
              </View>
              <View style={s.countRight}>
                {wishlistItems.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowFavorites((o) => !o)}
                    activeOpacity={0.7}
                    style={[s.favToggle, showFavorites && s.favToggleActive]}
                  >
                    <Text style={[s.favToggleGlyph, showFavorites && s.favToggleGlyphActive]}>
                      {showFavorites ? '♥' : '♡'}
                    </Text>
                    <Text style={[s.favToggleText, showFavorites && s.favToggleTextActive]}>
                      {showFavorites ? 'All' : `Fav (${wishlistItems.length})`}
                    </Text>
                  </TouchableOpacity>
                )}
                {hasWeightFilter && (
                  <View style={s.activeFilterChip}>
                    <Text style={s.activeFilterChipText}>{weightRangeLabel}</Text>
                    <TouchableOpacity onPress={clearWeightFilter} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.activeFilterChipClear}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Content ── */}
          {loading ? (
            <View style={s.skeletonGrid}>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : error ? (
            <View style={s.centerBox}>
              <Text style={s.emptyGlyph}>◆</Text>
              <Text style={s.emptyTitle}>Failed to load</Text>
              <Text style={s.emptySubtitle}>Pull down to try again</Text>
              <TouchableOpacity style={s.retryBtn} activeOpacity={0.7} onPress={fetchDesigns}>
                <Text style={s.retryLabel}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList<Design>
              data={filteredDesigns}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={s.columnWrapper}
              contentContainerStyle={[
                s.listContent,
                filteredDesigns.length === 0 && s.listContentGrow,
              ]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.BURGUNDY} />
              }
              removeClippedSubviews={true}
              maxToRenderPerBatch={6}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              initialNumToRender={6}
              ListEmptyComponent={
                <View style={s.centerBox}>
                  <Text style={s.emptyGlyph}>◆</Text>
                  <Text style={s.emptyTitle}>No designs found</Text>
                  <Text style={s.emptySubtitle}>
                    {hasWeightFilter || search.trim() ? 'Try a different search or weight range' : 'Try a different search term'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </CartAnimationProvider>
  );
}

/* ─── Shimmer bar ─── */
function ShimmerBar() {
  const shimmer = useShimmer(2400);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 300] });
  return (
    <Animated.View style={[shimmerStyles.bar, { transform: [{ translateX }] }]} />
  );
}
const shimmerStyles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, bottom: 0, width: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
});

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
    },
    mainTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 36, lineHeight: 40,
      letterSpacing: -.7, color: '#FFFFFF',
    },
    shimmerClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },

    /* Cart */
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

    /* ── Cream body ── */
    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      paddingHorizontal: H_PADDING,
      paddingTop: 20,
    },

    /* Search (pill style, matches CatalogsScreen) */
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.PAPER,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.BORDER_SOFT,
      paddingHorizontal: 14,
      paddingVertical: 11,
      marginBottom: 16,
      gap: 8,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    searchRowFocused: { borderColor: c.BURGUNDY },
    searchGlyph: {
      fontSize: 18, color: c.MUTED,
    },
    searchGlyphFocused: { color: c.NAVY },
    searchInput: {
      flex: 1,
      fontFamily: 'Outfit_400Regular',
      fontSize: 14, color: c.INK,
      paddingVertical: 0,
    },
    searchClear: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', color: c.NAVY,
    },

    /* Search divider + filter button */
    searchDivider: {
      width: 1, height: 22,
      backgroundColor: c.BORDER_SOFT,
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      gap: 6,
      borderRadius: 12,
      borderWidth: 1, borderColor: c.BORDER_SOFT,
    },
    filterBtnActive: {
      backgroundColor: c.BURGUNDY,
      borderColor: c.BURGUNDY,
    },
    filterBtnGlyph: {
      fontSize: 14, color: c.MUTED,
    },
    filterBtnGlyphActive: {
      color: '#FFFFFF',
    },
    filterBtnText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 0.5,
      color: c.MUTED,
    },
    filterBtnTextActive: {
      color: '#FFFFFF',
    },
    filterDot: {
      position: 'absolute', top: -3, right: -3,
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: c.BURGUNDY,
    },

    /* Weight filter panel */
    filterPanel: {
      backgroundColor: c.PAPER,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      gap: 12,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    filterPanelLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1.5,
      color: c.MUTED,
    },
    weightInputPill: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderColor: c.BORDER_SOFT,
      borderRadius: 12,
      backgroundColor: c.TINT,
    },
    weightInputSection: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 9, gap: 6,
    },
    weightInputLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 9, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    weightInputField: {
      flex: 1,
      fontFamily: 'Outfit_400Regular',
      fontSize: 14, color: c.INK,
      padding: 0,
    },
    weightInputUnit: {
      fontFamily: 'Outfit_300Light',
      fontSize: 11, color: c.MUTED,
    },
    weightInputDivider: {
      width: 1, alignSelf: 'stretch',
      backgroundColor: c.BORDER_SOFT, opacity: 0.5,
    },
    filterPanelActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    filterPanelClear: { paddingVertical: 4 },
    filterPanelClearText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', color: c.MUTED,
    },
    filterPanelApplyText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', color: c.BURGUNDY,
    },

    /* Count (matches CatalogsScreen) */
    countRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 14,
    },
    countLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 11, letterSpacing: 2,
      color: c.MUTED,
    },
    countNum: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 12, color: c.BURGUNDY,
    },
    countLeft: { flexDirection: 'row', alignItems: 'center' },
    countRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    /* Favorites toggle */
    favToggle: {
      flexDirection: 'row', alignItems: 'center',
      gap: 4, paddingVertical: 4, paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: c.TINT,
    },
    favToggleActive: {
      backgroundColor: c.HEART_ACTIVE,
    },
    favToggleGlyph: {
      fontSize: 14, color: c.MUTED, lineHeight: 16,
    },
    favToggleGlyphActive: {
      color: '#FFFFFF',
    },
    favToggleText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 0.5, color: c.MUTED,
    },
    favToggleTextActive: {
      color: '#FFFFFF',
    },

    /* Active filter chip */
    activeFilterChip: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.TINT,
      borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 4, gap: 6,
    },
    activeFilterChipText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10, letterSpacing: 0.5, color: c.BURGUNDY,
    },
    activeFilterChipClear: {
      fontSize: 10, color: c.BURGUNDY,
    },

    /* Skeleton */
    skeletonGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    /* List */
    columnWrapper: { justifyContent: 'space-between' },
    listContent: { paddingBottom: 60 },
    listContentGrow: { flexGrow: 1 },

    /* Empty / Error (matches CatalogsScreen) */
    centerBox: {
      flex: 1, alignItems: 'center',
      justifyContent: 'center', paddingBottom: 80,
      width: SCREEN_WIDTH - H_PADDING * 2,
    },
    emptyGlyph: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 30, color: c.BURGUNDY,
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: 'CormorantGaramond_600SemiBold',
      fontSize: 24, color: c.INK,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: 'Outfit_300Light',
      fontSize: 11, letterSpacing: 1.5,
      color: c.MUTED, textAlign: 'center',
      textTransform: 'uppercase', lineHeight: 20,
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
      fontSize: 10, letterSpacing: 2,
      textTransform: 'uppercase', color: '#FFFFFF',
    },

    /* Sort panel */
    sortPanel: {
      backgroundColor: c.PAPER,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      gap: 4,
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    sortPanelLabel: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 11, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
      marginBottom: 8,
    },
    sortOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 8,
    },
    sortOptionText: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 14, color: c.INK,
    },
    sortOptionCheck: {
      fontFamily: 'Outfit_700Bold',
      fontSize: 14, color: c.NAVY,
    },
  });
}