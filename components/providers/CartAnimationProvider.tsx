import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../../colors';

export interface FlyPayload {
  imageUri: string | null;
  sourceRef: React.RefObject<View>;
}

export interface CartAnimCtx {
  triggerFlyToCart: (payload: FlyPayload) => void;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}

export const CartAnimationContext = createContext<CartAnimCtx | null>(null);

export function useCartAnimation() {
  const ctx = useContext(CartAnimationContext);
  if (!ctx) throw new Error('useCartAnimation must be inside CartAnimationProvider');
  return ctx;
}

interface FlyingThumb {
  id: number;
  imageUri: string | null;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
}

let _flyId = 0;

function CartAnimationOverlayConnected({
  triggerRef,
  cartIconRef,
  cartScaleAnim,
  badgeScaleAnim,
}: {
  triggerRef: React.MutableRefObject<(p: FlyPayload) => void>;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}) {
  const C = useColors();
  const overlayS = createOverlayStyles(C);
  const [thumbs, setThumbs] = useState<FlyingThumb[]>([]);
  const addThumb = useCallback((t: FlyingThumb) => setThumbs((p) => [...p, t]), []);
  const removeThumb = useCallback((id: number) => setThumbs((p) => p.filter((t) => t.id !== id)), []);

  useEffect(() => {
    triggerRef.current = ({ imageUri, sourceRef }: FlyPayload) => {
      if (!cartIconRef.current || !sourceRef?.current) return;
      sourceRef.current.measureInWindow((sx, sy, sw, sh) => {
        cartIconRef.current!.measureInWindow((cx, cy, cw, ch) => {
          const startX = sx + sw / 2 - 24;
          const startY = sy + sh * 0.3;
          const endX = cx + cw / 2 - 24;
          const endY = cy + ch / 2 - 24;
          const progress = new Animated.Value(0);
          const opacity = new Animated.Value(1);
          const scale = new Animated.Value(1);
          const rotate = new Animated.Value(0);
          const id = ++_flyId;
          addThumb({ id, imageUri, startX, startY, endX, endY, progress, opacity, scale, rotate });
          Animated.parallel([
            Animated.timing(progress, {
              toValue: 1,
              duration: 620,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.7,
              duration: 620,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.9, duration: 380, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
            ]),
            Animated.timing(rotate, { toValue: 1, duration: 620, useNativeDriver: true }),
          ]).start(() => {
            removeThumb(id);
            Animated.sequence([
              Animated.timing(cartScaleAnim, { toValue: 1.12, duration: 120, useNativeDriver: true }),
              Animated.spring(cartScaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
            ]).start();
            badgeScaleAnim.setValue(0.5);
            Animated.spring(badgeScaleAnim, {
              toValue: 1,
              friction: 3.5,
              tension: 200,
              useNativeDriver: true,
            }).start();
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
          inputRange: [0, 0.3, 0.6, 1],
          outputRange: [0, dy * 0.3 - arcH, dy * 0.6 - arcH * 0.5, dy],
        });
        const rotateInterp = thumb.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '4deg'],
        });
        return (
          <Animated.View
            key={thumb.id}
            pointerEvents="none"
            style={[
              overlayS.thumb,
              {
                position: 'absolute',
                left: thumb.startX,
                top: thumb.startY,
                opacity: thumb.opacity,
                transform: [{ translateX }, { translateY }, { scale: thumb.scale }, { rotate: rotateInterp }],
              },
            ]}
          >
            {thumb.imageUri ? (
              <Image
                source={thumb.imageUri}
                style={overlayS.thumbImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={overlayS.thumbPlaceholder}>
                <Text style={overlayS.thumbGlyph}>◆</Text>
              </View>
            )}
            <Animated.View style={[overlayS.glow, { opacity: thumb.opacity }]} />
          </Animated.View>
        );
      })}
    </>
  );
}

export function CartAnimationProvider({
  children,
  cartIconRef,
  cartScaleAnim,
  badgeScaleAnim,
}: {
  children: React.ReactNode;
  cartIconRef: React.RefObject<View>;
  cartScaleAnim: Animated.Value;
  badgeScaleAnim: Animated.Value;
}) {
  const triggerRef = useRef<(p: FlyPayload) => void>(() => {});
  const ctx: CartAnimCtx = useMemo(
    () => ({
      triggerFlyToCart: (p) => triggerRef.current(p),
      cartIconRef,
      cartScaleAnim,
      badgeScaleAnim,
    }),
    [cartIconRef, cartScaleAnim, badgeScaleAnim]
  );

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

function createOverlayStyles(c: any) {
  return StyleSheet.create({
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: c.PAPER,
      overflow: 'hidden',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 8,
      zIndex: 9999,
    },
    thumbImage: { width: '100%', height: '100%' },
    thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.TINT },
    thumbGlyph: { fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 16, color: c.GOLD_DEEP },
    glow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 10,
      backgroundColor: 'transparent',
      shadowColor: c.NAVY_DEEP,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
    },
  });
}
