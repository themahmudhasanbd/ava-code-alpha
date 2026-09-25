import * as React from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";
import { COLORS } from "@/theme/colors";

export function Skeleton({
  style,
}: {
  style?: ViewStyle | ViewStyle[];
}) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { opacity }, style]} />;
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.muted,
    borderRadius: 8,
  },
});
