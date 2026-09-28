import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
  Platform,
} from "react-native";
import { Activity, Zap } from "lucide-react-native";
import { COLORS } from "@/theme/colors";
import { font, mono } from "@/theme/fonts";

interface Props {
  label?: string;
  subLabel?: string;
  variant?: "block" | "inline" | "badge";
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

export function RuntimeDottedIndicator({
  label = "Agent runtime active",
  subLabel,
  variant = "block",
  size = "md",
  style,
}: Props) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const pulseBorder = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Wave animation for the 3 dots
    const createDotAnim = (val: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.delay(Math.max(0, 700 - delay)),
        ])
      );
    };

    const anim1 = createDotAnim(dot1, 0);
    const anim2 = createDotAnim(dot2, 180);
    const anim3 = createDotAnim(dot3, 360);

    // Glowing border pulse
    const borderAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseBorder, {
          toValue: 0.9,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseBorder, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();
    borderAnim.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      borderAnim.stop();
    };
  }, [dot1, dot2, dot3, pulseBorder]);

  const dotInterpolate = (val: Animated.Value) => {
    const translateY = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -3.5],
    });
    const opacity = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 1],
    });
    const scale = val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1.25],
    });
    return { transform: [{ translateY }, { scale }], opacity };
  };

  if (variant === "inline") {
    return (
      <View style={[styles.inlineContainer, style]}>
        <Animated.View style={[styles.miniDot, dotInterpolate(dot1)]} />
        <Animated.View style={[styles.miniDot, dotInterpolate(dot2)]} />
        <Animated.View style={[styles.miniDot, dotInterpolate(dot3)]} />
      </View>
    );
  }

  if (variant === "badge") {
    return (
      <View style={[styles.badgeContainer, style]}>
        <View style={styles.badgeDots}>
          <Animated.View style={[styles.miniDot, dotInterpolate(dot1)]} />
          <Animated.View style={[styles.miniDot, dotInterpolate(dot2)]} />
          <Animated.View style={[styles.miniDot, dotInterpolate(dot3)]} />
        </View>
        <Text style={[styles.badgeText, mono("bold")]}>{label}</Text>
      </View>
    );
  }

  // Block variant: stylish dotted/dashed border container
  return (
    <Animated.View
      style={[
        styles.blockContainer,
        size === "sm" && styles.blockContainerSm,
        {
          borderColor: pulseBorder.interpolate({
            inputRange: [0.35, 0.9],
            outputRange: ["rgba(66, 64, 225, 0.35)", "rgba(66, 64, 225, 0.85)"],
          }),
        },
        style,
      ]}
    >
      <View style={styles.blockHeader}>
        <View style={styles.tagWrap}>
          <View style={styles.iconCircle}>
            <Zap size={11} color={COLORS.primary} />
          </View>
          <Text style={[styles.blockLabel, mono("bold")]}>{label}</Text>
        </View>

        {/* Animated 3-dot wave */}
        <View style={styles.dotsWaveRow}>
          <Animated.View style={[styles.waveDot, dotInterpolate(dot1)]} />
          <Animated.View style={[styles.waveDot, dotInterpolate(dot2)]} />
          <Animated.View style={[styles.waveDot, dotInterpolate(dot3)]} />
        </View>
      </View>

      {subLabel ? (
        <Text style={[styles.blockSubLabel, font("regular")]} numberOfLines={2}>
          {subLabel}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
    height: 16,
  },
  miniDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: COLORS.primary,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(66, 64, 225, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(66, 64, 225, 0.25)",
  },
  badgeDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  blockContainer: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    backgroundColor: "rgba(66, 64, 225, 0.04)",
    gap: 5,
    marginVertical: 4,
  },
  blockContainerSm: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(66, 64, 225, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  blockLabel: {
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dotsWaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 4,
  },
  waveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  blockSubLabel: {
    fontSize: 11.5,
    color: COLORS.foreground,
    paddingLeft: 24,
    opacity: 0.9,
  },
});
