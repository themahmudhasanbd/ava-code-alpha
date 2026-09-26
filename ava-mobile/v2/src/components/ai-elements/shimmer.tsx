import React, { useEffect, useRef } from "react";
import { Animated, type StyleProp, StyleSheet, Text, type TextStyle } from "react-native";
import { COLORS } from "@/theme/colors";

export function Shimmer({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.shimmerText, style, { opacity }]}>
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  shimmerText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    fontStyle: "italic",
  },
});
