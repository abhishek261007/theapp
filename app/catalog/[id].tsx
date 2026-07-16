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
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
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
  View,
  Modal,
} from 'react-native';

import { Image } from 'expo-image';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, Colors } from '../../colors';
import api from '../../services/api';
import useCartStore, { CartItem } from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { useShimmer } from '../../hooks/useShimmer';
import { CartAnimationProvider } from '../../components/providers/CartAnimationProvider';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { buildImageUrl } from '../../utils/imageUrl';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');



import { Design, H_PADDING, COLUMN_GAP, CARD_WIDTH, DesignCard } from '../../components/catalog/DesignCard';

/* ─── Skeleton Card (equal size, no tall variant) ─── */
function SkeletonCard() {
  const C = useColors();
  const skelS = useMemo(() => createSkeletonStyles(C), [C]);
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

function createSkeletonStyles(c: Colors) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      borderRadius: 18,
      backgroundColor: c.PAPER,
      marginBottom: COLUMN_GAP,
      overflow: 'hidden',
    },
    inner: {},
    imagePlaceholder: {
      height: CARD_WIDTH,
      backgroundColor: c.TINT,
    },
    bodyPad: { padding: 8, gap: 6 },
    nameLine: { width: '80%', height: 12, backgroundColor: c.BORDER_SOFT, borderRadius: 4, marginBottom: 4 },
    nameLineShort: { width: '50%', height: 10, backgroundColor: c.BORDER_SOFT, borderRadius: 4 },
    chipsRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
    chip: { flex: 1, height: 28, backgroundColor: c.BORDER_SOFT, borderRadius: 1, opacity: 0.6 },
    btnLine: { height: 30, backgroundColor: c.BORDER_SOFT, borderRadius: 1, marginTop: 2, opacity: 0.6 },
  });
}



/* ═══════════════════════════════════════════════════════════════
   Main Screen
   ═══════════════════════════════════════════════════════════════ */
export default function CatalogDetailsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { id, name, dominantColor } = useLocalSearchParams<{ id: string; name: string; dominantColor?: string }>();
  const addToCart  = useCartStore((s) => s.addToCart);
  const cartItems  = useCartStore((s) => s.items);
  const cartCount  = cartItems.length;
  const insets     = useSafeAreaInsets();

  const [designs, setDesigns]   = useState<Design[]>([]);
  const [fetchedCatalogName, setFetchedCatalogName] = useState<string | null>(null);
  const validCatalogName = (name && name !== 'undefined') ? name : (fetchedCatalogName || 'Catalog');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [search, setSearch]     = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  /* ── Weight filter state (free-typed only) ── */
  const [filterOpen, setFilterOpen]         = useState(false);
  const [minWeightInput, setMinWeightInput] = useState('');
  const [maxWeightInput, setMaxWeightInput] = useState('');

  /* ── Preview Modal ── */
  const [previewItem, setPreviewItem] = useState<Design | null>(null);

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


  const cartIconRef    = useRef<any>(null);
  const cartScaleAnim  = useRef(new Animated.Value(1)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;

  /* ── Data fetching ── */
  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/public/designs?catalogId=${id}`);
      setDesigns((res.data as Design[]).filter((d) => d.status === 'available'));

      if (!name || name === 'undefined') {
        try {
          const catRes = await api.get('/public/catalogs');
          const matched = catRes.data.find((c: any) => c._id === id);
          if (matched && matched.name) {
            setFetchedCatalogName(matched.name);
          }
        } catch (e) {
          console.error('[CatalogDetails] fallback fetch failed:', e);
        }
      }
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
          catalogName: validCatalogName,
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
    [id, validCatalogName, search, minWeightInput, maxWeightInput]
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
        catalogName: String(validCatalogName),
      } satisfies CartItem);
    },
    [addToCart, validCatalogName]
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
          catalogName: validCatalogName || d.catalogName,
          sku: d.sku,
          weight: d.weight,
          imageUrl: d.imageUrl,
          thumbnailUrl: d.thumbnailUrl,
        })}
        isInCart={cartItems.some((i) => i._id === item._id)}
        catalogColor={dominantColor}
        onLongPress={setPreviewItem}
      />
    ),
    [openDesign, handleAddToCart, hasWishlist, toggleWishlist, dominantColor]
  );

  const keyExtractor = useCallback((item: Design) => item._id, []);

  return (
    <>
    <CartAnimationProvider
      cartIconRef={cartIconRef}
      cartScaleAnim={cartScaleAnim}
      badgeScaleAnim={badgeScaleAnim}
    >
      <View style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />

        {/* ── Gradient header block ── */}
        <CatalogHeader
          name={String(validCatalogName)}
          cartCount={cartCount}
          cartIconRef={cartIconRef}
          cartScaleAnim={cartScaleAnim}
          badgeScaleAnim={badgeScaleAnim}
          dominantColor={dominantColor}
        />

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
              extraData={cartItems}
              numColumns={2}
              showsVerticalScrollIndicator={true}
              indicatorStyle="black"
              style={{ paddingHorizontal: 16 }}
              columnWrapperStyle={s.columnWrapper}
              contentContainerStyle={[
                s.listContent,
                filteredDesigns.length === 0 && s.listContentGrow,
                { paddingBottom: insets.bottom + 80 },
              ]}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.BURGUNDY} />
              }
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
              ListFooterComponent={
                filteredDesigns.length > 0 ? (
                  <View style={s.listFooter}>
                    <Text style={s.footerGlyph}>◆</Text>
                    <Text style={s.footerText}>End of Collection</Text>
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* ── Decorative Bottom Strip ── */}
        <View style={[s.fakeTabBar, { paddingBottom: insets.bottom, height: 10 + insets.bottom, backgroundColor: C.BORDER_SOFT }]} />
      </View>
    </CartAnimationProvider>
      
      <Modal
        visible={previewItem !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewItem(null)}
      >
        <TouchableOpacity 
          style={s.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setPreviewItem(null)}
        >
          {previewItem && (
            <View style={s.modalContent}>
              <Image
                source={buildImageUrl(previewItem.imageUrl)}
                style={s.modalImage}
                contentFit="contain"
              />
              <View style={s.modalInfoRow}>
                <Text style={s.modalSku}>{previewItem.sku}</Text>
                <View style={s.modalDivider} />
                <Text style={s.modalWeight}>{previewItem.weight}g</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ─── Global Styles ─── */
function createStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.NAVY_DEEP },
    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      borderTopWidth: 4,
      borderTopColor: '#0A0A0B',
      paddingTop: 20,
    },

    /* Search (pill style, matches CatalogsScreen) */
    searchRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.PAPER,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.BORDER_SOFT,
      paddingHorizontal: H_PADDING,
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
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 14, color: c.INK,
      paddingVertical: 0,
    },
    searchClear: {
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
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

    /* List Footer */
    listFooter: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    footerGlyph: {
      color: c.GOLD_DEEP,
      fontSize: 10,
    },
    footerText: {
      fontFamily: 'Helvetica', fontWeight: '300',
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: c.MUTED,
    },
    filterPanelLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 9, letterSpacing: 1.5,
      textTransform: 'uppercase', color: c.MUTED,
    },
    weightInputField: {
      flex: 1,
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 14, color: c.INK,
      padding: 0,
    },
    weightInputUnit: {
      fontFamily: 'Helvetica', fontWeight: '300',
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', color: c.MUTED,
    },
    filterPanelApplyText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', color: c.BURGUNDY,
    },

    /* Count (matches CatalogsScreen) */
    countRow: {
      flexDirection: 'row',      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: H_PADDING,
    },
    countLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 11, letterSpacing: 2,
      color: c.MUTED,
    },
    countNum: {
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10, letterSpacing: 0.5, color: c.BURGUNDY,
    },
    activeFilterChipClear: {
      fontSize: 10, color: c.BURGUNDY,
    },

    /* Skeleton */
    skeletonGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: H_PADDING,
    },

    /* List */
    columnWrapper: { justifyContent: 'space-between' },
    listContent: { paddingBottom: 60 },
    listContentGrow: { flexGrow: 1 },

    /* Empty / Error (matches CatalogsScreen) */
    centerBox: {
      flex: 1, alignItems: 'center',
      justifyContent: 'center', paddingBottom: 80,
      paddingHorizontal: H_PADDING,
    },
    emptyGlyph: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 30, color: c.BURGUNDY,
      marginBottom: 16,
    },
    emptyTitle: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 24, color: c.INK,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: 'Helvetica', fontWeight: '300',
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
      alignSelf: 'center',
    },
    retryLabel: {
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '600',
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
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 14, color: c.INK,
    },
    sortOptionCheck: {
      fontFamily: 'Helvetica', fontWeight: '700',
      fontSize: 14, color: c.INK,
    },

    /* Decorative Bottom Strip */
    fakeTabBar: {
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 2,
      borderTopColor: '#0A0A0B',
    },
    /* Modal */
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: SCREEN_W * 0.9,
      height: SCREEN_H * 0.7,
      backgroundColor: c.PAPER,
      borderRadius: 16,
      overflow: 'hidden',
      padding: 12,
    },
    modalImage: {
      flex: 1,
      width: '100%',
      backgroundColor: c.TINT,
      borderRadius: 8,
    },
    modalInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 16,
      paddingBottom: 4,
      gap: 12,
    },
    modalSku: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 18,
      letterSpacing: 2,
      color: c.NAVY_DEEP,
    },
    modalDivider: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.GOLD_DEEP,
    },
    modalWeight: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 16,
      letterSpacing: 1,
      color: c.MUTED,
    },
  });
}