import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../../colors';
import { Design } from '../catalog/DesignCard';

export interface ImageGalleryProps {
  finalImageUrl: string | null;
  imageWrapperRef: React.RefObject<View>;
  onOpenModal: (url: string | null) => void;
  item: Design;
  isWishlisted: boolean;
  onToggleWishlist: (item: Design) => void;
}

export function ImageGallery({
  finalImageUrl,
  imageWrapperRef,
  onOpenModal,
  item,
  isWishlisted,
  onToggleWishlist,
}: ImageGalleryProps) {
  const C = useColors();
  const pageS = createImageStyles(C);

  if (!finalImageUrl) {
    return (
      <View ref={imageWrapperRef} collapsable={false} style={pageS.noImageBox}>
        <Text style={pageS.noImageGlyph}>◆</Text>
        <Text style={pageS.noImageLabel}>No image</Text>
      </View>
    );
  }

  return (
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
  );
}

function createImageStyles(c: any) {
  return StyleSheet.create({
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
  });
}
