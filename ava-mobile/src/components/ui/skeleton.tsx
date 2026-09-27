import * as React from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { COLORS } from "@/theme/colors";

export interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  glass?: boolean;
}

/**
 * Base animated skeleton bar with smooth pulsing opacity and subtle glass styling.
 */
export function Skeleton({ style, glass = false }: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        glass && styles.glassSkeleton,
        { opacity },
        style,
      ]}
    />
  );
}

/**
 * Glassmorphic capsule skeleton (pill-shaped) for loading tags, metrics, and pill buttons.
 */
export function SkeletonCapsule({
  width = 80,
  height = 28,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Skeleton
      glass
      style={[
        styles.capsuleSkeleton,
        {
          width: width as any,
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    />
  );
}

/**
 * Multi-line skeleton text placeholder.
 */
export function SkeletonText({
  lines = 2,
  lineHeight = 12,
  gap = 6,
  style,
}: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          style={{
            height: lineHeight,
            borderRadius: lineHeight / 2,
            width: `${85 - (i % 3) * 15}%`,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Complete card skeleton with frosted container and nested item lines.
 */
export function SkeletonCard({
  height,
  style,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.cardSkeleton, height ? { height } : undefined, style]}>
      <View style={styles.cardHeader}>
        <Skeleton style={{ width: 32, height: 32, borderRadius: 16 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton style={{ width: "45%", height: 14, borderRadius: 7 }} />
          <Skeleton style={{ width: "25%", height: 10, borderRadius: 5 }} />
        </View>
        <SkeletonCapsule width={60} height={22} />
      </View>
      <View style={{ gap: 8, marginTop: 4 }}>
        <Skeleton style={{ width: "100%", height: 38, borderRadius: 10 }} />
        <Skeleton style={{ width: "70%", height: 12, borderRadius: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.muted,
    borderRadius: 8,
  },
  glassSkeleton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  capsuleSkeleton: {
    borderRadius: 9999,
  },
  cardSkeleton: {
    backgroundColor: COLORS.glassBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
