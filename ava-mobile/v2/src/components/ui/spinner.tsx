import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { Loader2 } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export function Spinner({
  size = 16,
  color = COLORS.primary,
  style,
}: {
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[{ transform: [{ rotate }] }, style]}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}
