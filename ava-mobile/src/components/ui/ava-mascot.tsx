import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { COLORS } from "@/theme/colors";

export type AvaMascotState = "idle" | "thinking" | "working" | "complete" | "error";
export type AvaMascotGaze = "center" | "up" | "down" | "left" | "right";

export function AvaMascot({
  state = "idle",
  size = "md",
  gaze = "center",
  style,
}: {
  state?: AvaMascotState;
  size?: "xs" | "sm" | "md" | "lg";
  gaze?: AvaMascotGaze;
  style?: ViewStyle;
}) {
  const dim =
    size === "lg" ? 60 : size === "md" ? 40 : size === "sm" ? 32 : 28;

  const breathScale = useRef(new Animated.Value(1)).current;
  const breathRotate = useRef(new Animated.Value(0)).current;
  const eyeScaleY = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(0.92)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const isWorking = state === "working";
  const isThinking = state === "thinking";

  useEffect(() => {
    // Breathing & subtle wobble
    const cycleDuration = isWorking ? 1400 : 3500;
    const breathAnim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breathScale, {
            toValue: 1.05,
            duration: cycleDuration,
            useNativeDriver: true,
          }),
          Animated.timing(breathRotate, {
            toValue: 1,
            duration: cycleDuration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breathScale, {
            toValue: 1.0,
            duration: cycleDuration,
            useNativeDriver: true,
          }),
          Animated.timing(breathRotate, {
            toValue: -1,
            duration: cycleDuration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    breathAnim.start();

    // Eye blinking (5.8s natural period)
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(eyeScaleY, {
          toValue: 0.12,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(eyeScaleY, {
          toValue: 1,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start();
    }, 5800);

    // Ring pulse for thinking or working
    let ringAnim: Animated.CompositeAnimation | null = null;
    if (isThinking || isWorking) {
      ringAnim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringOpacity, {
              toValue: 0.7,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 1450,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ringScale, {
            toValue: 1.35,
            duration: 1650,
            useNativeDriver: true,
          }),
        ])
      );
      ringAnim.start();
    } else {
      ringOpacity.setValue(0);
      ringScale.setValue(0.92);
    }

    return () => {
      breathAnim.stop();
      clearInterval(blinkInterval);
      ringAnim?.stop();
    };
  }, [breathScale, breathRotate, eyeScaleY, ringScale, ringOpacity, isWorking, isThinking]);

  const rotate = breathRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-2deg", "0deg", "2deg"],
  });

  const blobBg =
    state === "error"
      ? COLORS.destructive
      : state === "thinking"
      ? COLORS.primary
      : COLORS.mascot;

  // Gaze offset
  const gazeX = gaze === "left" ? -dim * 0.08 : gaze === "right" ? dim * 0.08 : 0;
  const gazeY = gaze === "up" ? -dim * 0.08 : gaze === "down" ? dim * 0.08 : 0;

  return (
    <View style={[{ width: dim, height: dim, alignItems: "center", justifyContent: "center" }, style]}>
      {/* Outer Pulse Ring */}
      {(isThinking || isWorking) && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: dim + 10,
              height: dim + 10,
              borderRadius: (dim + 10) * 0.46,
              borderColor: COLORS.mascotRing,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      )}

      {/* Main Mascot Blob */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: dim,
            height: dim,
            borderRadius: dim * 0.46,
            backgroundColor: blobBg,
            transform: [{ scale: breathScale }, { rotate }],
          },
        ]}
      >
        {/* Face */}
        <View
          style={[
            styles.face,
            {
              gap: dim * 0.14,
              transform: [{ translateX: gazeX }, { translateY: gazeY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.eye,
              {
                width: Math.max(3, dim * 0.08),
                height: Math.max(7, dim * 0.22),
                transform: [{ scaleY: eyeScaleY }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.eye,
              {
                width: Math.max(3, dim * 0.08),
                height: Math.max(7, dim * 0.22),
                transform: [{ scaleY: eyeScaleY }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 1.5,
  },
  blob: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.mascot,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  face: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  eye: {
    backgroundColor: COLORS.mascotForeground,
    borderRadius: 999,
  },
});
