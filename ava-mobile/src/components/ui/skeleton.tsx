import * as React from "react";
import {
  Animated,
  Platform,
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
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
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

/**
 * Sleek skeleton placeholder for the session screen while loading chat history.
 */
export function ChatSessionSkeleton() {
  return (
    <View style={styles.chatSkeletonWrap}>
      {/* User message skeleton */}
      <View style={styles.userMsgSkeleton}>
        <View style={styles.userSkeletonHeader}>
          <Skeleton style={{ width: 38, height: 11, borderRadius: 5 }} />
          <Skeleton style={{ width: 22, height: 22, borderRadius: 11 }} />
        </View>
        <Skeleton style={{ width: 220, height: 38, borderRadius: 14 }} />
      </View>

      {/* Assistant message skeleton */}
      <View style={styles.assistantMsgSkeleton}>
        <View style={styles.assistantSkeletonHeader}>
          <Skeleton style={{ width: 34, height: 34, borderRadius: 17 }} />
          <View style={{ gap: 6, flex: 1 }}>
            <Skeleton style={{ width: "35%", height: 13, borderRadius: 6 }} />
            <Skeleton style={{ width: "22%", height: 10, borderRadius: 5 }} />
          </View>
        </View>

        {/* Workflow trace step skeleton box */}
        <View style={styles.workflowStepSkeleton}>
          <Skeleton style={{ width: 18, height: 18, borderRadius: 6 }} />
          <Skeleton style={{ width: "60%", height: 12, borderRadius: 6 }} />
        </View>

        {/* Text lines */}
        <View style={{ gap: 8, marginTop: 4 }}>
          <Skeleton style={{ width: "95%", height: 13, borderRadius: 6 }} />
          <Skeleton style={{ width: "85%", height: 13, borderRadius: 6 }} />
          <Skeleton style={{ width: "60%", height: 13, borderRadius: 6 }} />
        </View>
      </View>

      {/* Second User turn skeleton */}
      <View style={styles.userMsgSkeleton}>
        <View style={styles.userSkeletonHeader}>
          <Skeleton style={{ width: 38, height: 11, borderRadius: 5 }} />
          <Skeleton style={{ width: 22, height: 22, borderRadius: 11 }} />
        </View>
        <Skeleton style={{ width: 170, height: 32, borderRadius: 14 }} />
      </View>

      {/* Second Assistant turn skeleton */}
      <View style={styles.assistantMsgSkeleton}>
        <View style={styles.assistantSkeletonHeader}>
          <Skeleton style={{ width: 34, height: 34, borderRadius: 17 }} />
          <View style={{ gap: 6, flex: 1 }}>
            <Skeleton style={{ width: "30%", height: 13, borderRadius: 6 }} />
            <Skeleton style={{ width: "18%", height: 10, borderRadius: 5 }} />
          </View>
        </View>
        <View style={{ gap: 8, marginTop: 4 }}>
          <Skeleton style={{ width: "90%", height: 13, borderRadius: 6 }} />
          <Skeleton style={{ width: "75%", height: 13, borderRadius: 6 }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for session lists in drawer and workspace views.
 */
export function DrawerSessionsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <View style={styles.drawerSessionsSkeleton}>
      {Array.from({ length: count }).map((_, groupIdx) => (
        <View key={groupIdx} style={styles.drawerGroupSkeleton}>
          {/* Group Header */}
          <View style={styles.drawerGroupHeaderSkeleton}>
            <Skeleton style={{ width: 14, height: 14, borderRadius: 4 }} />
            <Skeleton style={{ width: 15, height: 15, borderRadius: 4 }} />
            <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
              <Skeleton style={{ width: `${55 + groupIdx * 15}%`, height: 12, borderRadius: 6 }} />
              <Skeleton style={{ width: `${35 + groupIdx * 10}%`, height: 8, borderRadius: 4 }} />
            </View>
            <Skeleton style={{ width: 18, height: 14, borderRadius: 6 }} />
          </View>

          {/* Child Session Rows */}
          <View style={styles.drawerChildListSkeleton}>
            <View style={styles.drawerSessionRowSkeleton}>
              <Skeleton style={{ width: 5, height: 5, borderRadius: 2.5 }} />
              <Skeleton style={{ width: "75%", height: 11, borderRadius: 5 }} />
            </View>
            <View style={styles.drawerSessionRowSkeleton}>
              <Skeleton style={{ width: 5, height: 5, borderRadius: 2.5 }} />
              <Skeleton style={{ width: "55%", height: 11, borderRadius: 5 }} />
            </View>
          </View>
        </View>
      ))}
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
  chatSkeletonWrap: {
    paddingVertical: 12,
    gap: 18,
  },
  userMsgSkeleton: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    gap: 6,
    width: "100%",
  },
  userSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  assistantMsgSkeleton: {
    width: "100%",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  assistantSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  workflowStepSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  drawerSessionsSkeleton: {
    gap: 8,
    paddingVertical: 4,
  },
  drawerGroupSkeleton: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  drawerGroupHeaderSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerChildListSkeleton: {
    marginLeft: 14,
    borderLeftWidth: 1.5,
    borderLeftColor: "rgba(66, 64, 225, 0.2)",
    paddingLeft: 8,
    gap: 6,
    paddingVertical: 2,
  },
  drawerSessionRowSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
});
