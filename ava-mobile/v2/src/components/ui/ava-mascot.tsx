import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { COLORS } from "@/theme/colors";

export type AvaMascotState = "idle" | "thinking" | "working" | "complete" | "error";

export function AvaMascot({
  state = "idle",
  size = "md",
}: {
  state?: AvaMascotState;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? 64 : size === "md" ? 44 : size === "sm" ? 32 : 24;
  const scale = useRef(new Animated.Value(1)).current;
  const eyeBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing animation
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 3500,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 3500,
          useNativeDriver: true,
        }),
      ])
    );
    breath.start();

    // Blink animation
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(eyeBlink, {
          toValue: 0.1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(eyeBlink, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5000);

    return () => {
      breath.stop();
      clearInterval(blinkInterval);
    };
  }, [scale, eyeBlink]);

  const blobBg =
    state === "error"
      ? COLORS.destructive
      : state === "thinking"
      ? COLORS.primary
      : COLORS.mascot;

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: dim,
          height: dim,
          borderRadius: dim * 0.46,
          backgroundColor: blobBg,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.face}>
        <Animated.View
          style={[
            styles.eye,
            {
              width: dim * 0.08,
              height: dim * 0.22,
              transform: [{ scaleY: eyeBlink }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.eye,
            {
              width: dim * 0.08,
              height: dim * 0.22,
              transform: [{ scaleY: eyeBlink }],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blob: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mascot,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  face: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  eye: {
    backgroundColor: COLORS.mascotForeground,
    borderRadius: 999,
  },
});
