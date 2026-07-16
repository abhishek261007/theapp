import { useCallback, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, Colors } from '../../colors';
import useWishlistStore, { WishlistItem } from '../../store/wishlistStore';
import { buildImageUrl } from '../../utils/imageUrl';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING  = 24;
const COLUMN_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - COLUMN_GAP) / 2;


function WishlistCard({
  item,
  index,
  onPress,
  onRemove,
}: {
  item: WishlistItem;
  index: number;
  onPress: (item: WishlistItem) => void;
  onRemove: (id: string) => void;
}) {
  const C = useColors();
  const s = useMemo(() => createCardStyles(C), [C]);
  const imageUri = buildImageUrl(item.thumbnailUrl || item.imageUrl);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(item)}>
      <View style={s.card}>
        {imageUri ? (
          <Image
            source={imageUri}
            style={s.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={s.imagePlaceholder}>
            <Text style={s.placeholderGlyph}>◆</Text>
          </View>
        )}

        <View style={s.body}>
          <Text style={s.name} numberOfLines={1}>{item.catalogName}</Text>
          <Text style={s.sku}>SKU: {item.sku}</Text>
          <Text style={s.weight}>{item.weight}g</Text>
        </View>

        <TouchableOpacity
          onPress={() => onRemove(item._id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.removeBtn}
        >
          <Text style={s.removeGlyph}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function createCardStyles(c: Colors) {
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 30, color: c.GOLD_DEEP, opacity: 0.5,
    },
    body: {
      padding: 10,
      gap: 2,
    },
    name: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 12, color: c.INK,
    },
    sku: {
      fontFamily: 'Helvetica', fontWeight: '400',
      fontSize: 10, color: c.MUTED,
    },
    weight: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 11, color: c.NAVY,
    },
    removeBtn: {
      position: 'absolute', top: 8, right: 8,
      width: 24, height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.85)',
      alignItems: 'center', justifyContent: 'center',
    },
    removeGlyph: {
      fontSize: 10, color: c.MUTED, lineHeight: 12,
    },
  });
}

export default function WishlistScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const { items, remove, clear } = useWishlistStore();

  const openDesign = useCallback((item: WishlistItem) => {
    router.push({
      pathname: '/design/[id]',
      params: {
        id:        item._id,
        catalogId: '',
        catalogName: item.catalogName,
        sku:       item.sku,
        weight:    String(item.weight),
        status:    'available',
        imageUrl:  item.imageUrl ?? '',
      },
    });
  }, []);

  const handleClear = useCallback(() => {
    Alert.alert('Clear Wishlist', 'Remove all favorites?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  }, [clear]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<WishlistItem>) => (
      <WishlistCard item={item} index={index} onPress={openDesign} onRemove={remove} />
    ),
    [openDesign, remove]
  );

  const keyExtractor = useCallback((item: WishlistItem) => item._id, []);

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.NAVY_DEEP} />

      <LinearGradient
        colors={[C.GRADIENT_A, C.GRADIENT_B, C.GRADIENT_C]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.headerBlock, { marginTop: insets.top + 12 }]}
      >
        <View style={s.headerInner}>
          <View style={s.headerTitleWrap}>
            <Text style={s.eyebrowText}>Saved</Text>
            <Text style={s.mainTitle}>Favorites</Text>
          </View>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClear} activeOpacity={0.8} style={s.clearBtn}>
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={s.body}>
        {items.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyGlyph}>♡</Text>
            <Text style={s.emptyTitle}>No favorites yet</Text>
            <Text style={s.emptySubtitle}>
              Tap the heart on any design to save it here
            </Text>
            <TouchableOpacity
              style={s.browseBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={s.browseBtnText}>Browse Catalogs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList<WishlistItem>
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={s.columnWrapper}
            contentContainerStyle={s.listContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={6}
            windowSize={7}
            ListHeaderComponent={
              <Text style={s.countText}>{items.length} saved</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

function createStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.NAVY_DEEP },

    /* Header */
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
    headerTitleWrap: { flex: 1 },
    eyebrowText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 10, letterSpacing: 3,
      color: 'rgba(255,255,255,0.85)', marginBottom: 2,
    },
    mainTitle: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 32, lineHeight: 34,
      letterSpacing: -0.5, color: '#FFFFFF',
    },
    clearBtn: {
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    clearBtnText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 12, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },

    /* Body */
    body: {
      flex: 1,
      backgroundColor: c.CREAM,
      borderTopWidth: 4,
      borderTopColor: '#0A0A0B',
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    countText: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 11, letterSpacing: 2,
      color: c.MUTED,
      marginBottom: 14,
    },

    /* Grid */
    columnWrapper: { justifyContent: 'space-between' },
    listContent: { paddingBottom: 40 },

    /* Empty */
    emptyBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 80,
      gap: 12,
    },
    emptyGlyph: {
      fontSize: 48, color: c.BORDER_SOFT,
      marginBottom: 8,
    },
    emptyTitle: {
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 28, color: c.INK,
      letterSpacing: -0.3,
    },
    emptySubtitle: {
      fontFamily: 'Helvetica', fontWeight: '300',
      fontSize: 12, letterSpacing: 1,
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
      fontFamily: 'Helvetica', fontWeight: '600',
      fontSize: 12, letterSpacing: 1.5,
      textTransform: 'uppercase', color: '#FFFFFF',
    },
  });
}
