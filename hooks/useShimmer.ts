import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useShimmer(duration = 1600) {
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
