import { ReactNode, useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../hooks/useTheme';

/**
 * Fades and slides its content up when the screen opens, each section a beat after the last
 * (`index` sets the order). With Reduce Motion on, content simply appears. Never blocks input.
 */
export function Reveal({ index = 0, children }: { index?: number; children: ReactNode }) {
  const { motion } = useTheme();
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.enter,
      delay: Math.min(index, 6) * motion.stagger,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, index, motion.enter, motion.stagger]);

  return (
    <Animated.View
      style={{
        // Fill the parent's width even inside a centered column (empty states), or wide text can't wrap.
        alignSelf: 'stretch',
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
