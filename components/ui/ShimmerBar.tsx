import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useShimmer } from '../../hooks/useShimmer';

export function ShimmerBar() {
  const shimmer = useShimmer(2400);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 300] });
  return (
    <Animated.View style={[shimmerStyles.bar, { transform: [{ translateX }] }]} />
  );
}

const shimmerStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
});
