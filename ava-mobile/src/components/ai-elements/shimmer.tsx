import React, { useEffect, useRef } from "react";
import { Animated, type StyleProp, StyleSheet, Text, type TextStyle,
  Platform,
} from "react-native";
import { type ColorTokens } from "@/theme/colors";
import { useStyles } from "@/theme/theme-context";

export function Shimmer({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const styles = useStyles(createStyles);
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: Platform.OS !== "web",
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

function createStyles(c: ColorTokens) {
  return StyleSheet.create({
    shimmerText: {
      fontSize: 13,
      color: c.mutedForeground,
      fontStyle: "italic",
    },
  });
}
